import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const { email, password, userAgent } = await request.json();
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const auth = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: person } = await admin.from("persons").select("id,name,is_active,auth_user_id,failed_login_attempts,locked_at").ilike("email", normalizedEmail).maybeSingle();
  if (!person || person.is_active === false) return json({ error: "E-mail ou senha inválidos." });
  if (person.locked_at || person.failed_login_attempts >= 3) return json({ error: "Conta bloqueada após três tentativas. Solicite o desbloqueio ao administrador." });

  const { data, error } = await auth.auth.signInWithPassword({ email: normalizedEmail, password });
  if (error) {
    const attempts = Number(person.failed_login_attempts || 0) + 1;
    const locked = attempts >= 3;
    await admin.from("persons").update({ failed_login_attempts: attempts, locked_at: locked ? new Date().toISOString() : null }).eq("id", person.id);
    await admin.from("user_access_logs").insert({ person_id: person.id, email: normalizedEmail, event_type: locked ? "account_locked" : "login_failure", user_agent: userAgent || null });
    if (locked) {
      if (person.auth_user_id) await admin.auth.admin.updateUserById(person.auth_user_id, { ban_duration: "876000h" });
      const { data: administrator } = await admin.from("persons").select("id").eq("access_role", "admin").limit(1).single();
      if (administrator) await admin.from("security_notifications").insert({ recipient_id: administrator.id, person_id: person.id, type: "account_locked", title: "Usuário bloqueado", content: `${person.name} foi bloqueado após três tentativas incorretas de acesso.` });
    }
    return json({ error: locked ? "Conta bloqueada após três tentativas. O administrador foi notificado." : `E-mail ou senha inválidos. Restam ${3 - attempts} tentativa(s).` });
  }
  if (!data.user || !person.auth_user_id || data.user.id !== person.auth_user_id) {
    if (data.session) await auth.auth.signOut();
    return json({ error: "Perfil de acesso ativo não encontrado." }, 403);
  }
  await admin.from("persons").update({ failed_login_attempts: 0, locked_at: null, last_login_at: new Date().toISOString() }).eq("id", person.id);
  const { data: accessLog } = await admin.from("user_access_logs").insert({ person_id: person.id, email: normalizedEmail, event_type: "login_success", user_agent: userAgent || null, ip_address: forwardedFor, session_id: crypto.randomUUID(), last_seen_at: new Date().toISOString() }).select("id").single();
  return json({ session: data.session, accessLogId: accessLog?.id || null });
});

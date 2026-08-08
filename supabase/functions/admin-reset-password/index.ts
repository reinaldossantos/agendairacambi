import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const { data: requester } = await admin.auth.getUser(token);
  const { data: profile } = await admin.from("persons").select("access_role").eq("auth_user_id", requester.user?.id).eq("access_role", "admin").maybeSingle();
  if (!profile) return new Response(JSON.stringify({ error: "Acesso restrito ao administrador." }), { status: 403, headers: cors });
  const { personId } = await request.json();
  const { data: person } = await admin.from("persons").select("id,email,auth_user_id").eq("id", personId).single();
  if (!person?.auth_user_id) return new Response(JSON.stringify({ error: "Usuário sem conta de acesso." }), { status: 400, headers: cors });
  const temporaryPassword = `Ira!${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}Aa1`;
  const { error } = await admin.auth.admin.updateUserById(person.auth_user_id, { password: temporaryPassword, ban_duration: "none" });
  if (!error) {
    await admin.from("persons").update({ must_change_password: true, failed_login_attempts: 0, locked_at: null }).eq("id", person.id);
    await admin.from("user_access_logs").insert({ person_id: person.id, email: person.email, event_type: "password_reset" });
  }
  return new Response(JSON.stringify(error ? { error: error.message } : { success: true, temporaryPassword }), { status: error ? 400 : 200, headers: { ...cors, "Content-Type": "application/json" } });
});

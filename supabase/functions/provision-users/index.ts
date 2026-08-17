import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-setup-secret, x-iracambi-user-id, x-iracambi-user-name" };
serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (request.headers.get("x-setup-secret") !== Deno.env.get("AUTH_SETUP_SECRET")) return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: persons, error } = await admin.from("persons").select("id,name,email").not("email", "is", null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: cors });
  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const results = [];
  for (const person of persons || []) {
    const existing = existingUsers?.users?.find((user) => user.email?.toLowerCase() === person.email.toLowerCase());
    const temporaryPassword = `Ira!${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}Aa1`;
    const result = existing
      ? await admin.auth.admin.updateUserById(existing.id, { password: temporaryPassword, email_confirm: true, user_metadata: { name: person.name }, ban_duration: "none" })
      : await admin.auth.admin.createUser({ email: person.email, password: temporaryPassword, email_confirm: true, user_metadata: { name: person.name } });
    if (result.data.user) await admin.from("persons").update({ auth_user_id: result.data.user.id, must_change_password: true, failed_login_attempts: 0, locked_at: null }).eq("id", person.id);
    results.push({ name: person.name, email: person.email, temporaryPassword, created: Boolean(result.data.user), action: existing ? "updated" : "created", error: result.error?.message });
  }
  return new Response(JSON.stringify({ results }), { headers: { ...cors, "Content-Type": "application/json" } });
});

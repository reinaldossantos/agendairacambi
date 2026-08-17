import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-iracambi-user-id, x-iracambi-user-name" };

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  if (!token) return new Response(JSON.stringify({ error: "Sessão de acesso não informada." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const { data: requester, error: authenticationError } = await admin.auth.getUser(token);
  if (authenticationError || !requester.user) return new Response(JSON.stringify({ error: "Sessão inválida ou expirada. Entre novamente no sistema." }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });
  const { data: profile } = await admin.from("persons").select("id,access_role,is_active,locked_at").eq("auth_user_id", requester.user?.id).maybeSingle();
  if (!profile?.is_active || profile.locked_at) return new Response(JSON.stringify({ error: "Usuário não autorizado." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

  const { reportId } = await request.json();
  const { data: report, error: reportError } = await admin.from("expense_reports").select("id,status,expense_items").eq("id", reportId).maybeSingle();
  if (reportError || !report) return new Response(JSON.stringify({ error: "Relatório não encontrado." }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
  if (report.status !== "draft" && profile.access_role !== "admin") return new Response(JSON.stringify({ error: "Este relatório já foi finalizado. Entre em contato com o administrador do sistema para solicitar a exclusão." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

  const paths = (report.expense_items || []).flatMap((item: { attachments?: Array<{ path?: string }> }) => item.attachments || []).map((file: { path?: string }) => file.path).filter(Boolean) as string[];
  const { error: deleteError } = await admin.from("expense_reports").delete().eq("id", report.id);
  if (deleteError) return new Response(JSON.stringify({ error: deleteError.message }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  if (paths.length) await admin.storage.from("activity-files").remove(paths);
  return new Response(JSON.stringify({ success: true }), { headers: { ...cors, "Content-Type": "application/json" } });
});

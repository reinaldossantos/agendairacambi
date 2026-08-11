import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const scopes: Record<string, Array<{ table: string; dateColumn: string }>> = {
  activities: [{ table: "activities", dateColumn: "created_at" }],
  expense_reports: [{ table: "expense_reports", dateColumn: "created_at" }],
  purchase_requests: [{ table: "purchase_requests", dateColumn: "created_at" }],
  monthly_reports: [{ table: "monthly_activity_reports", dateColumn: "created_at" }],
  vehicle_bookings: [{ table: "vehicle_bookings", dateColumn: "created_at" }],
  announcements: [{ table: "announcements", dateColumn: "created_at" }],
  program_files: [{ table: "program_files", dateColumn: "created_at" }],
  projects: [{ table: "management_projects", dateColumn: "created_at" }],
  notifications: [
    { table: "activity_logs", dateColumn: "created_at" },
    { table: "expense_report_notifications", dateColumn: "created_at" },
    { table: "security_notifications", dateColumn: "created_at" },
    { table: "management_project_notifications", dateColumn: "created_at" },
  ],
  audit_logs: [
    { table: "user_access_logs", dateColumn: "occurred_at" },
    { table: "system_audit_logs", dateColumn: "occurred_at" },
  ],
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const token = request.headers.get("authorization")?.replace("Bearer ", "");
  const { data: requester } = await admin.auth.getUser(token);
  const { data: profile } = await admin.from("persons").select("id,name,access_role,is_active,locked_at").eq("auth_user_id", requester.user?.id).maybeSingle();
  if (profile?.access_role !== "admin" || !profile.is_active || profile.locked_at) return new Response(JSON.stringify({ error: "Acesso restrito ao administrador." }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });

  const body = await request.json();
  const selectedScopes = [...new Set((body.scopes || []).filter((scope: string) => scopes[scope]))] as string[];
  const direction = body.direction === "on_or_before" ? "on_or_before" : "on_or_after";
  const cutoff = new Date(body.cutoff);
  const execute = body.mode === "execute";
  if (!selectedScopes.length || Number.isNaN(cutoff.getTime())) return new Response(JSON.stringify({ error: "Informe a data e pelo menos uma categoria." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
  if (execute && body.confirmation !== "EXCLUIR") return new Response(JSON.stringify({ error: "Confirmação inválida." }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

  const comparison = direction === "on_or_before" ? "lte" : "gte";
  const results: Record<string, { count: number; tables: Record<string, number> }> = {};
  for (const scope of selectedScopes) {
    results[scope] = { count: 0, tables: {} };
    for (const target of scopes[scope]) {
      const query = admin.from(target.table).select("id", { count: "exact", head: true });
      const { count, error } = comparison === "lte"
        ? await query.lte(target.dateColumn, cutoff.toISOString())
        : await query.gte(target.dateColumn, cutoff.toISOString());
      if (error) return new Response(JSON.stringify({ error: `${target.table}: ${error.message}` }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
      results[scope].tables[target.table] = count || 0;
      results[scope].count += count || 0;
    }
  }

  if (!execute) return new Response(JSON.stringify({ preview: true, results, total: Object.values(results).reduce((sum, item) => sum + item.count, 0) }), { headers: { ...cors, "Content-Type": "application/json" } });

  // Exclui dependências e históricos antes dos registros principais quando não há cascata.
  const orderedScopes = ["notifications", "audit_logs", "expense_reports", "purchase_requests", "monthly_reports", "vehicle_bookings", "announcements", "program_files", "activities", "projects"];
  for (const scope of orderedScopes.filter((item) => selectedScopes.includes(item))) {
    for (const target of scopes[scope]) {
      const query = admin.from(target.table).delete();
      const { error } = comparison === "lte"
        ? await query.lte(target.dateColumn, cutoff.toISOString())
        : await query.gte(target.dateColumn, cutoff.toISOString());
      if (error) return new Response(JSON.stringify({ error: `${target.table}: ${error.message}`, partial: true, results }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
  }

  await admin.from("system_audit_logs").insert({
    table_name: "system_maintenance", action: "DELETE", actor_id: profile.id, actor_name: profile.name,
    changed_fields: selectedScopes, old_data: { cutoff: cutoff.toISOString(), direction, results }, request_path: "/admin/maintenance",
  });
  return new Response(JSON.stringify({ success: true, results, total: Object.values(results).reduce((sum, item) => sum + item.count, 0) }), { headers: { ...cors, "Content-Type": "application/json" } });
});

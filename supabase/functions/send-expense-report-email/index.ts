import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const safe = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;").replaceAll("'", "&#039;");

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authorization = request.headers.get("Authorization");
    if (!authorization) throw new Error("Autenticação necessária");
    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: authData } = await admin.auth.getUser(authorization.replace("Bearer ", ""));
    if (!authData.user) throw new Error("Sessão inválida");
    const { data: profile } = await admin.from("persons").select("id,is_active,locked_at").eq("auth_user_id", authData.user.id).maybeSingle();
    if (!profile?.is_active || profile.locked_at) throw new Error("Perfil ativo não encontrado");
    const { reportId } = await request.json();
    const { data: report } = await admin.from("expense_reports")
      .select("report_number,user_name,project_name,period_start,period_end,purpose,person_id")
      .eq("id", reportId).maybeSingle();
    if (!report || report.person_id !== profile.id) throw new Error("Relatório inválido ou não autorizado");

    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    const recipients = (Deno.env.get("EXPENSE_APPROVER_EMAILS") || "reinaldo@iracambi.com,thais@iracambi.com,binka@iracambi.com")
      .split(",").map((email) => email.trim()).filter(Boolean);
    const appUrl = Deno.env.get("APP_URL") || "";
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: Deno.env.get("EXPENSE_EMAIL_FROM") || "Agenda Iracambi <onboarding@resend.dev>",
        to: recipients,
        subject: `Relatório de despesas nº ${String(report.report_number).padStart(5, "0")} aguardando aprovação`,
        html: `<h2>Novo relatório de despesas para aprovação</h2>
          <p><strong>Solicitante:</strong> ${safe(report.user_name)}</p>
          <p><strong>Projeto:</strong> ${safe(report.project_name)}</p>
          <p><strong>Período:</strong> ${safe(report.period_start)} a ${safe(report.period_end)}</p>
          <p><strong>Finalidade:</strong> ${safe(report.purpose)}</p>
          ${appUrl ? `<p><a href="${safe(appUrl)}/expense-reports">Abrir relatório no sistema</a></p>` : ""}`,
      }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(body);
    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro inesperado" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

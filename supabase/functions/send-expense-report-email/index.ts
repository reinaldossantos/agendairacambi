import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const apiKey = Deno.env.get("RESEND_API_KEY");
    if (!apiKey) throw new Error("RESEND_API_KEY não configurada");
    const { report } = await request.json();
    if (!report?.report_number) throw new Error("Relatório inválido");

    const recipients = (Deno.env.get("EXPENSE_APPROVER_EMAILS") ||
      "reinado@iracambi.com,thais@iracambi.com,binka@iracambi.com")
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
          <p><strong>Solicitante:</strong> ${report.user_name}</p>
          <p><strong>Projeto:</strong> ${report.project_name}</p>
          <p><strong>Período:</strong> ${report.period_start} a ${report.period_end}</p>
          <p><strong>Finalidade:</strong> ${report.purpose}</p>
          ${appUrl ? `<p><a href="${appUrl}/expense-reports">Abrir relatório no sistema</a></p>` : ""}`,
      }),
    });
    const body = await response.text();
    if (!response.ok) throw new Error(body);
    return new Response(body, { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

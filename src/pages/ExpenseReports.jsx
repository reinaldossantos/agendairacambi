import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { generateExpenseReportPDF } from "../lib/expenseReportPdf";
import { useLocation } from "react-router-dom";
import { escapeHtml } from "../lib/security";
import { signFiles, signedUrl } from "../lib/privateStorage";

const categories = [
  "Passagens rodoviárias", "Transporte urbano", "Táxi", "Despesas com veículos",
  "KM rodados", "Hospedagem", "Alimentação", "Diárias", "Outros",
];
const blankItem = (suggestedDescription = "") => ({
  description: suggestedDescription,
  suggested_description: suggestedDescription,
  official_description: Boolean(suggestedDescription),
  expense_type: suggestedDescription === "KM rodados" ? "mileage" : "standard",
  date: "",
  document_number: "",
  amount: "",
});
const initialItems = () => categories.map(blankItem);
const emptyForm = {
  source_company: "IRACAMBI", company_code: "001", cost_center: "", program_id: "",
  project_name: "", project_code: "", person_id: "", user_name: "", user_cpf: "",
  user_phone: "", user_role: "", registration_number: "", period_start: "",
  period_end: "", travel_route: "", purpose: "", advance_amount: "",
  payment_method: "", bank_name: "", bank_branch: "", bank_branch_digit: "",
  bank_account: "", bank_account_digit: "", expense_items: initialItems(),
};
const inputClass = "w-full min-w-0 rounded-xl border border-surface-variant bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels = {
  draft: "Rascunho", pending_approval: "Aguardando aprovação", changes_requested: "Ajustes solicitados",
  rejected: "Reprovado", approved: "Aprovado",
  provisioned: "Encaminhado para provisionamento", payment_scheduled: "Pagamento agendado", paid: "Pago",
};
const isMileageItem = (item) =>
  item.expense_type === "mileage"
  || String(item.suggested_description || "").toLowerCase() === "km rodados"
  || String(item.description || "").toLowerCase().includes("km rodados");
const receiptCategories = new Set([
  "passagens rodoviarias", "transporte urbano", "taxi", "despesas com veiculos", "alimentacao", "hospedagem",
]);
const normalizeText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const supportsReceipt = (item) => receiptCategories.has(normalizeText(item.suggested_description || item.description));
const formatRateDate = (value) => value ? value.split("-").reverse().join("/") : "";

export default function ExpenseReports() {
  const location = useLocation();
  const { currentUser, persons } = useCurrentUser();
  const [reports, setReports] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [mileageRates, setMileageRates] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("list");
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdfId, setGeneratingPdfId] = useState(null);
  const [decisionComments, setDecisionComments] = useState({});
  const [configuredApproverIds, setConfiguredApproverIds] = useState([]);

  useEffect(() => {
    if (location.state?.quickAction === "expense") {
      const timer = window.setTimeout(() => setMode("form"), 0);
      window.history.replaceState({}, document.title);
      return () => window.clearTimeout(timer);
    }
  }, [location.state]);
  const [paymentDates, setPaymentDates] = useState({});
  const [message, setMessage] = useState({ type: "", text: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportResult, programResult, ratesResult, approvalResult, approverResult] = await Promise.all([
      supabase.from("expense_reports").select("*, person:person_id(is_active)").order("created_at", { ascending: false }),
      supabase.from("programs").select("id,name").order("name"),
      supabase.from("mileage_rates").select("*").order("effective_date", { ascending: false }),
      supabase.from("expense_report_approvals").select("*, approver:approver_id(id,name,avatar_url)").order("created_at"),
      supabase.from("expense_approval_config").select("person_id").eq("is_active", true),
    ]);
    if (reportResult.error) setMessage({ type: "error", text: reportResult.error.message });
    const approvalsByReport = (approvalResult.data || []).reduce((grouped, approval) => {
      grouped[approval.report_id] = [...(grouped[approval.report_id] || []), approval];
      return grouped;
    }, {});
    const signedReports = await Promise.all((reportResult.data || []).map(async (report) => ({
      ...report,
      expense_items: await Promise.all((report.expense_items || []).map(async (item) => ({ ...item, attachments: await signFiles(item.attachments || []) }))),
      approvals: approvalsByReport[report.id] || [],
    })));
    setReports(signedReports);
    setPrograms(programResult.data || []);
    setMileageRates(ratesResult.data || []);
    setConfiguredApproverIds((approverResult.data || []).map((item) => item.person_id));
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);

  const total = useMemo(() => form.expense_items.reduce((sum, item) => sum + Number(item.amount || 0), 0), [form.expense_items]);
  const balance = Number(form.advance_amount || 0) - total;
  const visibleReports = useMemo(() => reports.filter((report) => {
    const term = filter.trim().toLowerCase();
    const matchesText = !term || [report.report_number, report.user_name, report.project_name, report.purpose].some((value) => String(value || "").toLowerCase().includes(term));
    return matchesText && (!statusFilter || report.status === statusFilter);
  }), [reports, filter, statusFilter]);

  function newReport() {
    const today = format(new Date(), "yyyy-MM-dd");
    setEditingId(null);
    setForm({ ...emptyForm, expense_items: initialItems(), person_id: currentUser?.id || "", user_name: currentUser?.name || "", period_start: today, period_end: today });
    setMessage({ type: "", text: "" });
    setMode("form");
  }

  function editReport(report) {
    setEditingId(report.id);
    setForm({
      ...emptyForm, ...report,
      program_id: report.program_id || "", person_id: report.person_id || "",
      advance_amount: report.advance_amount ?? "",
      payment_method: report.payment_method || "",
      expense_items: report.expense_items?.length
        ? report.expense_items.map((item, index) => ({
          ...item,
          suggested_description: item.suggested_description || categories[index] || "",
          official_description: item.official_description ?? Boolean(item.suggested_description || categories[index]),
          description: item.description || item.suggested_description || categories[index] || "",
          expense_type: item.expense_type || (index === 4 || String(item.description || "").toLowerCase().includes("km rodados") ? "mileage" : "standard"),
        }))
        : initialItems(),
    });
    setMessage({ type: "", text: "" });
    setMode("form");
  }

  function choosePerson(id) {
    const person = persons.find((item) => item.id === id);
    setForm((current) => ({ ...current, person_id: id, user_name: person?.name || "" }));
  }

  function chooseProgram(id) {
    const program = programs.find((item) => item.id === id);
    setForm((current) => ({ ...current, program_id: id, project_name: program?.name || current.project_name }));
  }

  function updateItem(index, field, value) {
    setForm((current) => ({
      ...current,
      expense_items: current.expense_items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const updated = { ...item, [field]: value };
        if (isMileageItem(updated)) {
          const referenceDate = updated.date || current.period_end || format(new Date(), "yyyy-MM-dd");
          const vehicleRates = mileageRates
            .filter((entry) => entry.vehicle_type === updated.vehicle_type)
            .sort((a, b) => b.effective_date.localeCompare(a.effective_date));
          const rate = vehicleRates.find((entry) => entry.effective_date <= referenceDate)
            || vehicleRates[0];
          updated.mileage_rate = Number(rate?.amount_per_km || 0);
          updated.mileage_rate_effective_date = rate?.effective_date || null;
          updated.amount = Number(updated.mileage_quantity || 0) * updated.mileage_rate;
        }
        return updated;
      }),
    }));
  }

  function addItem() {
    setForm((current) => ({ ...current, expense_items: [...current.expense_items, blankItem()] }));
  }

  function addMileageItem(afterIndex) {
    setForm((current) => {
      const expenseItems = [...current.expense_items];
      expenseItems.splice(afterIndex + 1, 0, blankItem("KM rodados"));
      return { ...current, expense_items: expenseItems };
    });
  }

  function removeItem(index) {
    setForm((current) => ({ ...current, expense_items: current.expense_items.filter((_, itemIndex) => itemIndex !== index) }));
  }

  async function saveReport(status) {
    setMessage({ type: "", text: "" });
    if (!form.user_name.trim() || !form.project_name.trim() || !form.period_start || !form.period_end || !form.purpose.trim()) {
      setMessage({ type: "error", text: "Preencha usuário, projeto, período e justificativa." });
      return;
    }
    if (form.period_end < form.period_start) {
      setMessage({ type: "error", text: "A data final não pode ser anterior à data inicial." });
      return;
    }
    if (balance < 0 && (!form.bank_name.trim() || !form.payment_method)) {
      setMessage({ type: "error", text: "Informe o banco e a forma de crédito para o saldo a resgatar." });
      return;
    }
    const invalidMileage = form.expense_items.some((item) =>
      isMileageItem(item)
      && Number(item.mileage_quantity || 0) > 0
      && Number(item.mileage_rate || 0) <= 0);
    if (invalidMileage) {
      setMessage({ type: "error", text: "Não existe valor de KM vigente para o veículo e a data informados." });
      return;
    }
    setSaving(true);
    const workflowStatus = status === "submitted" ? "pending_approval" : status;
    const payload = {
      ...form, status: workflowStatus,
      program_id: form.program_id || null, person_id: form.person_id || null,
      advance_amount: Number(form.advance_amount || 0),
      payment_method: form.payment_method || null,
      expense_items: form.expense_items
        .filter((item) => item.description.trim() || item.date || item.document_number.trim() || item.amount !== "")
        .map((item) => ({
          ...item,
          description: item.description.trim() || item.suggested_description || "Despesa",
          amount: Number(item.amount || 0),
        })),
      submitted_at: workflowStatus === "pending_approval" ? new Date().toISOString() : null,
    };
    delete payload.id;
    delete payload.report_number;
    delete payload.created_at;
    delete payload.updated_at;
    delete payload.approvals;
    delete payload.person;
    const result = editingId
      ? await supabase.from("expense_reports").update(payload).eq("id", editingId).select().single()
      : await supabase.from("expense_reports").insert(payload).select().single();
    setSaving(false);
    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
      return;
    }
    if (workflowStatus === "pending_approval") {
      const { error: approvalError } = await supabase.rpc("initialize_expense_report_approval", { target_report_id: result.data.id });
      if (approvalError) {
        await supabase.from("expense_reports").update({ status: "draft", submitted_at: null }).eq("id", result.data.id);
        setMessage({ type: "error", text: `Relatório salvo, mas o fluxo de aprovação não foi iniciado: ${approvalError.message}` });
        await loadData();
        return;
      }
      const { data: emailSetting } = await supabase.from("app_settings").select("value").eq("key", "expense_report_settings").maybeSingle();
      if (emailSetting?.value?.send_email === true) {
        const { error: emailError } = await supabase.functions.invoke("send-expense-report-email", { body: { reportId: result.data.id } });
        if (emailError) console.error("Relatório salvo, mas o e-mail não foi enviado:", emailError);
      }
    }
    setMessage({ type: "success", text: status === "submitted" ? "Relatório finalizado com sucesso." : "Rascunho salvo." });
    await loadData();
    setMode("list");
  }

  const isApprover = configuredApproverIds.includes(currentUser?.id);

  async function decideReport(report, decision) {
    const approval = report.approvals?.find((item) => item.approver_id === currentUser?.id && item.decision === "pending");
    if (!approval) {
      setMessage({ type: "error", text: "Você não possui uma análise pendente para este relatório." });
      return;
    }
    const comment = (decisionComments[report.id] || "").trim();
    if (decision !== "approved" && !comment) {
      setMessage({ type: "error", text: "Informe uma justificativa antes de solicitar ajustes ou reprovar." });
      return;
    }
    setSaving(true);
    const { data: nextStatus, error } = await supabase.rpc("decide_expense_report", {
      target_report_id: report.id,
      requested_decision: decision,
      decision_comment: comment || null,
    });
    setSaving(false);
    if (error) {
      setMessage({ type: "error", text: error.message });
      return;
    }
    setDecisionComments((current) => ({ ...current, [report.id]: "" }));
    setMessage({
      type: "success",
      text: nextStatus === "approved" ? "Relatório aprovado por todos os responsáveis." : "Sua decisão foi registrada no histórico.",
    });
    await loadData();
  }

  async function transitionReport(report, nextStatus) {
    if (!currentUser?.id || !isApprover) {
      setMessage({ type: "error", text: "Somente Reinaldo ou Thaís podem executar esta etapa." });
      return;
    }
    const now = new Date().toISOString();
    const update = { status: nextStatus };
    if (nextStatus === "approved") Object.assign(update, { approved_by: currentUser.id, approved_at: now });
    if (nextStatus === "provisioned") Object.assign(update, { provisioned_by: currentUser.id, provisioned_at: now });
    if (nextStatus === "payment_scheduled") {
      const dueDate = paymentDates[report.id];
      if (!dueDate) return setMessage({ type: "error", text: "Informe a data prevista para pagamento." });
      update.payment_due_date = dueDate;
    }
    setSaving(true);
    const { error: updateError } = await supabase.from("expense_reports").update(update).eq("id", report.id);
    setSaving(false);
    if (updateError) return setMessage({ type: "error", text: updateError.message });
    if (report.person_id) {
      const messages = {
        approved: ["Relatório aprovado", `Seu relatório nº ${String(report.report_number).padStart(5, "0")} foi aprovado por ${currentUser.name}.`],
        provisioned: ["Relatório provisionado", `Seu relatório nº ${String(report.report_number).padStart(5, "0")} foi encaminhado para provisionamento de pagamento.`],
        payment_scheduled: ["Pagamento previsto", `O pagamento do relatório nº ${String(report.report_number).padStart(5, "0")} está previsto para ${paymentDates[report.id]}.`],
      };
      await supabase.from("expense_report_notifications").upsert({
        report_id: report.id, recipient_id: report.person_id, actor_id: currentUser.id,
        type: nextStatus, title: messages[nextStatus][0], content: messages[nextStatus][1],
      }, { onConflict: "report_id,recipient_id,type" });
    }
    setMessage({ type: "success", text: `Status atualizado para: ${statusLabels[nextStatus]}.` });
    await loadData();
  }

  function printReport(report) {
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return setMessage({ type: "error", text: "Permita pop-ups para imprimir o relatório." });
    report = structuredClone(report);
    for (const key of Object.keys(report)) if (typeof report[key] === "string") report[key] = escapeHtml(report[key]);
    report.expense_items = (report.expense_items || []).map((item) => Object.fromEntries(
      Object.entries(item).map(([key, value]) => [key, typeof value === "string" ? escapeHtml(value) : value]),
    ));
    const items = (report.expense_items || []).filter((item) => item.description || Number(item.amount));
    const spent = items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    const reportBalance = Number(report.advance_amount || 0) - spent;
    printWindow.document.write(`<!doctype html><html><head><title>Relatório ${report.report_number}</title><style>body{font:12px Arial;color:#222;margin:24px}h1{font-size:18px;color:#1a3b2e}table{width:100%;border-collapse:collapse;margin:12px 0}th,td{border:1px solid #777;padding:6px;text-align:left}th{background:#1a3b2e;color:white}.right{text-align:right}.sign{display:flex;gap:60px;margin-top:60px}.sign div{flex:1;border-top:1px solid;text-align:center;padding-top:6px}@media print{button{display:none}}</style></head><body><h1>IRACAMBI — RELATÓRIO DE DESPESAS / ADIANTAMENTO Nº ${report.report_number}</h1><table><tr><td><b>Fonte pagadora:</b> ${report.source_company}</td><td><b>Centro de custos:</b> ${report.cost_center || "—"}</td></tr><tr><td><b>Projeto:</b> ${report.project_name}</td><td><b>Código:</b> ${report.project_code || "—"}</td></tr><tr><td><b>Usuário:</b> ${report.user_name}</td><td><b>CPF:</b> ${report.user_cpf || "—"}</td></tr><tr><td><b>Período:</b> ${report.period_start} a ${report.period_end}</td><td><b>Roteiro:</b> ${report.travel_route || "—"}</td></tr><tr><td colspan="2"><b>Justificativa:</b> ${report.purpose}</td></tr></table><table><thead><tr><th>Item</th><th>Descrição</th><th>Data</th><th>Documento</th><th>Valor</th></tr></thead><tbody>${items.map((item, index) => `<tr><td>${index + 1}</td><td>${item.description}</td><td>${item.date || "—"}</td><td>${item.document_number || "—"}</td><td class="right">${money(item.amount)}</td></tr>`).join("")}</tbody></table><table><tr><td>Adiantamento</td><td class="right">${money(report.advance_amount)}</td></tr><tr><td>Despesa realizada</td><td class="right">${money(spent)}</td></tr><tr><td>${reportBalance >= 0 ? "Saldo a devolver" : "Saldo a resgatar"}</td><td class="right">${money(Math.abs(reportBalance))}</td></tr></table><div class="sign"><div>Data e assinatura do usuário</div><div>Conferência / Gestor administrativo</div></div><script>window.onload=()=>window.print()</script></body></html>`);
    printWindow.document.close();
  }

  async function downloadPdf(report) {
    if (generatingPdfId) return;
    setGeneratingPdfId(report.id);
    setMessage({ type: "", text: "" });
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      await generateExpenseReportPDF(report);
      setMessage({ type: "success", text: `PDF do relatório nº ${String(report.report_number).padStart(5, "0")} gerado com sucesso.` });
    } catch (pdfError) {
      setMessage({ type: "error", text: `Não foi possível gerar o PDF: ${pdfError?.message || "erro inesperado"}.` });
    } finally {
      setGeneratingPdfId(null);
    }
  }

  if (mode === "form") return (
    <ExpenseForm
      form={form} setForm={setForm} programs={programs} persons={persons}
      choosePerson={choosePerson} chooseProgram={chooseProgram} updateItem={updateItem}
      addItem={addItem} addMileageItem={addMileageItem} removeItem={removeItem} total={total} balance={balance}
      saving={saving} message={message} onCancel={() => setMode("list")}
      onSave={() => saveReport("draft")} onSubmit={() => saveReport("submitted")}
    />
  );

  return (
    <div className="mx-auto max-w-6xl px-2 sm:px-4">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><p className="text-sm font-medium text-primary-light dark:text-green-300">Financeiro Iracambi</p><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Relatórios de despesas</h2><p className="text-sm text-outline">Crie, consulte, imprima e exporte prestações de contas.</p></div>
        <button onClick={newReport} className="flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-3 font-bold text-primary hover:bg-yellow-400"><span className="material-symbols-outlined">add</span>Novo relatório</button>
      </div>
      {message.text && <Alert message={message} />}
      {generatingPdfId && <div role="status" aria-live="polite" className="fixed bottom-20 right-4 z-[1000] flex items-center gap-3 rounded-xl border border-blue-200 bg-white/95 px-4 py-3 text-sm font-medium text-primary shadow-xl backdrop-blur dark:border-blue-900 dark:bg-dark-surface/95 dark:text-white md:bottom-5"><span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span><span>Gerando PDF… Aguarde um instante.</span></div>}
      <div className="mb-5 grid gap-3 rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface sm:grid-cols-[1fr_200px]">
        <input value={filter} onChange={(event) => setFilter(event.target.value)} className={inputClass} placeholder="Buscar por número, usuário, projeto ou finalidade" />
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="">Todos os status</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </div>
      {loading ? <div className="py-14 text-center text-outline">Carregando relatórios...</div> : visibleReports.length === 0 ? <div className="rounded-xl border border-dashed border-surface-variant bg-white py-14 text-center text-outline dark:bg-dark-surface">Nenhum relatório encontrado.</div> :
        <div className="space-y-3">{visibleReports.map((report) => {
          const spent = (report.expense_items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
          const receipts = (report.expense_items || []).flatMap((item) => item.attachments || []);
          const approvalCount = report.approvals?.filter((item) => item.decision === "approved").length || 0;
          const displayStatus = report.status === "pending_approval" && approvalCount > 0
            ? `Aprovação parcial · ${approvalCount} de ${report.approvals.length}`
            : statusLabels[report.status] || report.status;
          const statusClass = report.status === "draft" ? "bg-amber-100 text-amber-700"
            : report.status === "pending_approval" ? "bg-blue-100 text-blue-700"
              : report.status === "changes_requested" ? "bg-violet-100 text-violet-700"
                : report.status === "rejected" ? "bg-red-100 text-red-700"
                  : "bg-green-100 text-green-700";
          return <article key={report.id} className="rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface">
            <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-green-100 text-primary dark:bg-green-900/40 dark:text-green-300"><span className="material-symbols-outlined">receipt_long</span></div>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-primary dark:text-white">Relatório nº {String(report.report_number).padStart(5, "0")}</h3><span className={`rounded-full px-2 py-1 text-xs font-bold ${statusClass}`}>{displayStatus}</span></div><p className="truncate text-sm">{report.user_name}{report.person?.is_active === false && <span className="ml-2 rounded-full bg-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">Usuário desativado</span>} · {report.project_name}</p><p className="text-xs text-outline">{report.period_start} a {report.period_end} · Despesas: {money(spent)}{report.payment_due_date ? ` · Pagamento previsto: ${report.payment_due_date}` : ""}</p>{receipts.length > 0 && <div className="mt-2 flex flex-wrap gap-2">{receipts.map((file, fileIndex) => <a key={`${file.path || file.url}-${fileIndex}`} href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 hover:underline dark:bg-blue-900/30 dark:text-blue-300"><span className="material-symbols-outlined text-[15px]">attachment</span>{file.name}</a>)}</div>}</div>
            <div className="flex flex-wrap gap-2">
              {(report.status === "draft" || (report.status === "changes_requested" && report.person_id === currentUser?.id)) && <button onClick={() => editReport(report)} className="rounded-full border border-primary px-3 py-2 text-sm font-medium text-primary dark:text-white">{report.status === "changes_requested" ? "Corrigir e reenviar" : "Continuar"}</button>}
              {isApprover && report.status === "approved" && <button disabled={saving} onClick={() => transitionReport(report, "provisioned")} className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white">Encaminhar para provisionamento</button>}
              {isApprover && report.status === "provisioned" && <div className="flex flex-wrap gap-2"><input type="date" aria-label="Data prevista para pagamento" value={paymentDates[report.id] || ""} onChange={(event) => setPaymentDates({ ...paymentDates, [report.id]: event.target.value })} className="rounded-xl border border-surface-variant px-3 py-2 text-sm dark:bg-gray-800" /><button disabled={saving} onClick={() => transitionReport(report, "payment_scheduled")} className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-primary">Informar pagamento</button></div>}
              <button onClick={() => printReport(report)} className="rounded-full bg-surface px-3 py-2 text-sm font-medium dark:bg-gray-700"><span className="material-symbols-outlined align-middle text-[18px]">print</span> Imprimir</button><button disabled={!!generatingPdfId} onClick={() => downloadPdf(report)} className="rounded-full bg-red-100 px-3 py-2 text-sm font-medium text-red-700 disabled:cursor-wait disabled:opacity-60"><span className={`material-symbols-outlined align-middle text-[18px] ${generatingPdfId === report.id ? "animate-spin" : ""}`}>{generatingPdfId === report.id ? "progress_activity" : "picture_as_pdf"}</span> {generatingPdfId === report.id ? "Gerando…" : "PDF"}</button>
            </div>
            </div>
            {report.approvals?.length > 0 && <ApprovalPanel
              report={report}
              currentUser={currentUser}
              saving={saving}
              comment={decisionComments[report.id] || ""}
              onComment={(value) => setDecisionComments((current) => ({ ...current, [report.id]: value }))}
              onDecision={(decision) => decideReport(report, decision)}
            />}
          </article>;
        })}</div>}
    </div>
  );
}

const approvalLabels = {
  pending: { label: "Aguardando análise", icon: "schedule", color: "text-amber-700 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-300" },
  approved: { label: "Aprovado", icon: "check_circle", color: "text-green-700 bg-green-100 dark:bg-green-900/30 dark:text-green-300" },
  changes_requested: { label: "Ajustes solicitados", icon: "edit_note", color: "text-blue-700 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300" },
  rejected: { label: "Reprovado", icon: "cancel", color: "text-red-700 bg-red-100 dark:bg-red-900/30 dark:text-red-300" },
};

function ApprovalPanel({ report, currentUser, saving, comment, onComment, onDecision }) {
  const approvals = report.approvals || [];
  const approvedCount = approvals.filter((item) => item.decision === "approved").length;
  const currentApproval = approvals.find((item) => item.approver_id === currentUser?.id && item.decision === "pending");
  const progress = approvals.length ? Math.round((approvedCount / approvals.length) * 100) : 0;

  return <section className="mt-4 overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/60 dark:border-white/10 dark:from-emerald-950/20 dark:via-gray-900 dark:to-amber-950/10">
    <div className="flex flex-col gap-3 border-b border-emerald-100/80 p-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2"><span className="material-symbols-outlined text-primary dark:text-green-300">approval</span><h4 className="font-bold text-primary dark:text-white">Fluxo de aprovação</h4></div>
        <p className="mt-1 text-xs text-outline">Cada decisão fica registrada com responsável, data e justificativa.</p>
      </div>
      <div className="min-w-44">
        <div className="mb-1 flex justify-between text-xs font-bold text-primary dark:text-gray-200"><span>{approvedCount} de {approvals.length} aprovações</span><span>{progress}%</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-white shadow-inner dark:bg-gray-700"><div className="h-full rounded-full bg-gradient-to-r from-primary-light to-green-500 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
      </div>
    </div>
    <div className="grid gap-3 p-4 md:grid-cols-2">
      {approvals.map((approval) => {
        const visual = approvalLabels[approval.decision] || approvalLabels.pending;
        const initials = String(approval.approver?.name || "?").split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
        return <div key={approval.id} className="rounded-xl border border-white bg-white/80 p-3 shadow-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex items-start gap-3">
            {approval.approver?.avatar_url ? <img src={approval.approver.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-xs font-black text-white">{initials}</span>}
            <div className="min-w-0 flex-1"><p className="font-bold text-primary dark:text-white">{approval.approver?.name || "Aprovador"}</p><span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold ${visual.color}`}><span className="material-symbols-outlined text-[15px]">{visual.icon}</span>{visual.label}</span></div>
          </div>
          {approval.decided_at && <p className="mt-2 text-xs text-outline">Registrado em {new Date(approval.decided_at).toLocaleString("pt-BR")}</p>}
          {approval.comment && <blockquote className="mt-2 rounded-lg border-l-4 border-primary-light bg-surface px-3 py-2 text-sm text-on-surface dark:bg-gray-800 dark:text-gray-200">{approval.comment}</blockquote>}
        </div>;
      })}
    </div>
    {currentApproval && report.status === "pending_approval" && <div className="border-t border-emerald-100 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
      <label className="block"><span className="mb-1.5 block text-sm font-bold text-primary dark:text-white">Observação da análise <span className="font-normal text-outline">(obrigatória para ajustes ou reprovação)</span></span><textarea rows="2" value={comment} onChange={(event) => onComment(event.target.value)} className={inputClass} placeholder="Registre aqui uma orientação, ressalva ou justificativa..." /></label>
      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <button disabled={saving} onClick={() => onDecision("changes_requested")} className="rounded-full border border-blue-600 px-4 py-2 text-sm font-bold text-blue-700 disabled:opacity-50 dark:text-blue-300">Solicitar ajustes</button>
        <button disabled={saving} onClick={() => onDecision("rejected")} className="rounded-full border border-red-600 px-4 py-2 text-sm font-bold text-red-700 disabled:opacity-50 dark:text-red-300">Reprovar</button>
        <button disabled={saving} onClick={() => onDecision("approved")} className="inline-flex items-center gap-1 rounded-full bg-green-600 px-5 py-2 text-sm font-bold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"><span className="material-symbols-outlined text-[18px]">verified</span>Aprovar</button>
      </div>
    </div>}
  </section>;
}

function ExpenseForm({ form, setForm, programs, persons, choosePerson, chooseProgram, updateItem, addItem, addMileageItem, removeItem, total, balance, saving, message, onCancel, onSave, onSubmit }) {
  const field = (name) => ({ value: form[name], onChange: (event) => setForm({ ...form, [name]: event.target.value }) });
  return <div className="mx-auto max-w-6xl px-2 sm:px-4">
    <div className="mb-6 flex items-center justify-between gap-4"><div><button onClick={onCancel} className="mb-2 text-sm text-primary dark:text-green-300">← Voltar aos relatórios</button><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Relatório de despesas / adiantamento</h2></div></div>
    {message.text && <Alert message={message} />}
    <div className="space-y-6">
      <Section title="Identificação"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Fonte pagadora"><input required className={inputClass} {...field("source_company")} placeholder="Ex.: IRACAMBI" /></Field>
        <Field label="Código da empresa"><input className={inputClass} {...field("company_code")} placeholder="Ex.: 001" /></Field>
        <Field label="Centro de custos"><input className={inputClass} {...field("cost_center")} placeholder="Ex.: Projetos Ambientais" /></Field>
        <Field label="Programa"><select className={inputClass} value={form.program_id} onChange={(event) => chooseProgram(event.target.value)}><option value="">Selecione</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field>
        <Field label="Nome do projeto"><input required className={inputClass} {...field("project_name")} placeholder="Ex.: Restauração da Mata Atlântica" /></Field>
        <Field label="Código do projeto"><input className={inputClass} {...field("project_code")} placeholder="Ex.: PRJ-2026-01" /></Field>
        <Field label="Usuário"><select className={inputClass} value={form.person_id} onChange={(event) => choosePerson(event.target.value)}><option value="">Selecione ou digite abaixo</option>{persons.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></Field>
        <Field label="Nome completo"><input required className={inputClass} {...field("user_name")} placeholder="Ex.: Maria da Silva" /></Field>
        <Field label="CPF"><input className={inputClass} {...field("user_cpf")} placeholder="Ex.: 000.000.000-00" /></Field>
        <Field label="Telefone"><input className={inputClass} {...field("user_phone")} placeholder="Ex.: (32) 99999-0000" /></Field>
        <Field label="Cargo"><input className={inputClass} {...field("user_role")} placeholder="Ex.: Coordenador de projetos" /></Field>
        <Field label="Número do registro"><input className={inputClass} {...field("registration_number")} placeholder="Ex.: 12345" /></Field>
      </div></Section>
      <Section title="Utilização e finalidade"><div className="grid gap-4 sm:grid-cols-2">
        <Field label="Data inicial"><input required type="date" className={inputClass} {...field("period_start")} /></Field>
        <Field label="Data final"><input required type="date" className={inputClass} {...field("period_end")} /></Field>
        <Field label="Roteiro da viagem"><input className={inputClass} {...field("travel_route")} placeholder="Ex.: Rosário da Limeira X Muriaé X Rosário da Limeira" /></Field>
        <Field label="Valor do adiantamento"><input min="0" step="0.01" type="number" className={inputClass} {...field("advance_amount")} placeholder="Ex.: 500,00" /></Field>
        <div className="sm:col-span-2"><Field label="Justificativa da despesa / objetivo da viagem"><textarea required rows="3" className={inputClass} {...field("purpose")} placeholder="Ex.: Visita técnica às propriedades participantes do projeto para acompanhamento das áreas restauradas." /></Field></div>
      </div></Section>
      <Section title="Despesas"><ExpenseItemsTable items={form.expense_items} updateItem={updateItem} removeItem={removeItem} addItem={addItem} addMileageItem={addMileageItem} /></Section>
      <Section title="Prestação de contas"><div className="grid gap-4 sm:grid-cols-3"><Summary label="Adiantamento" value={money(form.advance_amount)} /><Summary label="Despesa realizada" value={money(total)} /><Summary label={balance >= 0 ? "Saldo a devolver" : "Saldo a resgatar"} value={money(Math.abs(balance))} highlight /></div></Section>
      {balance < 0 && <Section title="Dados bancários para saldo a resgatar"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Field label="Banco"><input required className={inputClass} {...field("bank_name")} placeholder="Ex.: Banco do Brasil" /></Field><Field label="Forma de crédito"><select required className={inputClass} {...field("payment_method")}><option value="">Selecione</option><option value="checking">Conta corrente</option><option value="savings">Conta poupança</option><option value="check">Cheque</option></select></Field><Field label="Agência"><input className={inputClass} {...field("bank_branch")} placeholder="Ex.: 1234" /></Field><Field label="Dígito da agência"><input className={inputClass} {...field("bank_branch_digit")} placeholder="Ex.: 5" /></Field><Field label="Conta"><input className={inputClass} {...field("bank_account")} placeholder="Ex.: 12345" /></Field><Field label="Dígito da conta"><input className={inputClass} {...field("bank_account_digit")} placeholder="Ex.: 6" /></Field></div></Section>}
      <div className="sticky bottom-16 z-20 grid grid-cols-2 gap-2 rounded-xl border border-surface-variant bg-white/95 p-3 shadow-xl backdrop-blur dark:border-gray-700 dark:bg-dark-surface/95 sm:flex sm:flex-wrap sm:justify-end sm:gap-3 sm:p-4 md:bottom-4"><button type="button" onClick={onCancel} className="min-h-11 rounded-full border border-outline px-4 py-2.5">Cancelar</button><button disabled={saving} type="button" onClick={onSave} className="min-h-11 rounded-full border border-primary px-4 py-2.5 font-bold text-primary dark:text-white">Salvar rascunho</button><button disabled={saving} type="button" onClick={onSubmit} className="col-span-2 min-h-11 rounded-full bg-accent px-5 py-2.5 font-bold text-primary sm:col-auto">{saving ? "Salvando..." : "Finalizar relatório"}</button></div>
    </div>
  </div>;
}

function ExpenseItemsTable({ items, updateItem, removeItem, addItem, addMileageItem }) {
  return (
    <>
      <div className="w-full overflow-hidden">
        <table className="w-full table-fixed">
          <colgroup>
            <col className="w-[5%]" />
            <col className="w-[20%]" />
            <col className="w-[27%]" />
            <col className="w-[18%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs uppercase text-outline">
              <th className="p-2">Item</th>
              <th className="p-2">Descrição</th>
              <th className="p-2">Veículo, distância ou comprovante</th>
              <th className="p-2">Data</th>
              <th className="p-2">Documento</th>
              <th className="p-2">Valor</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              const mileage = isMileageItem(item);
              return (
                <tr key={index} className="border-t border-surface-variant align-top dark:border-gray-700">
                  <td className="p-2 pt-5 text-sm">{String(index + 1).padStart(2, "0")}</td>
                  <td className="p-2">
                    <input
                      className={`${inputClass} ${item.official_description ? "cursor-default bg-gray-100 font-medium dark:bg-gray-700" : ""}`}
                      value={item.description}
                      onChange={(event) => updateItem(index, "description", event.target.value)}
                      readOnly={item.official_description}
                      placeholder="Ex.: descreva a despesa"
                      title={item.official_description ? "Nomenclatura oficial da despesa" : ""}
                    />
                    {mileage && (
                      <button type="button" onClick={() => addMileageItem(index)} className="mt-2 flex w-full items-center justify-center gap-1 rounded-lg bg-green-100 px-2 py-1.5 text-xs font-bold text-primary hover:bg-green-200 dark:bg-green-900/30 dark:text-green-200">
                        <span className="material-symbols-outlined text-[17px]">add_road</span>Adicionar outro KM
                      </button>
                    )}
                  </td>
                  <td className="p-2">
                    {mileage ? (
                      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,0.75fr)] gap-2">
                        <select
                          aria-label="Tipo de veículo"
                          className={inputClass}
                          value={item.vehicle_type || ""}
                          onChange={(event) => updateItem(index, "vehicle_type", event.target.value)}
                        >
                          <option value="">Selecione</option>
                          <option value="car">Automóvel</option>
                          <option value="motorcycle">Moto</option>
                        </select>
                        <input
                          aria-label="Quantidade de quilômetros"
                          className={inputClass}
                          min="0"
                          step="0.01"
                          type="number"
                          value={item.mileage_quantity || ""}
                          onChange={(event) => updateItem(index, "mileage_quantity", event.target.value)}
                          placeholder="Ex.: 120"
                        />
                        <p className="col-span-2 px-1 text-xs text-outline">
                          {item.vehicle_type
                            ? `${money(item.mileage_rate || 0)}/km × ${item.mileage_quantity || 0} km${item.mileage_rate_effective_date ? ` · Vigência ${formatRateDate(item.mileage_rate_effective_date)}` : " · Tarifa não encontrada"}`
                            : "Selecione Automóvel ou Moto"}
                        </p>
                      </div>
                    ) : supportsReceipt(item) ? (
                      <ExpenseReceiptUpload
                        files={item.attachments || []}
                        onChange={(files) => updateItem(index, "attachments", files)}
                      />
                    ) : (
                      <span className="block py-3 text-center text-sm text-outline">—</span>
                    )}
                  </td>
                  <td className="p-2"><input type="date" className={`${inputClass} px-2`} value={item.date} onChange={(event) => updateItem(index, "date", event.target.value)} /></td>
                  <td className="p-2"><input className={inputClass} value={item.document_number} onChange={(event) => updateItem(index, "document_number", event.target.value)} placeholder="Ex.: NF 1234" /></td>
                  <td className="p-2">
                    {mileage ? (
                      <div className="rounded-xl border border-green-200 bg-green-50 px-3 py-2.5 text-right dark:border-green-800 dark:bg-green-900/20">
                        <p className="text-xs text-green-700 dark:text-green-300">Calculado automaticamente</p>
                        <p className="font-bold text-primary dark:text-white">{money(item.amount || 0)}</p>
                      </div>
                    ) : (
                      <input min="0" step="0.01" type="number" className={inputClass} value={item.amount} onChange={(event) => updateItem(index, "amount", event.target.value)} placeholder="Ex.: 75,50" />
                    )}
                  </td>
                  <td className="p-2"><button type="button" onClick={() => removeItem(index)} className="p-2 text-red-500" aria-label="Remover"><span className="material-symbols-outlined">delete</span></button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={addItem} className="flex items-center gap-2 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary dark:text-white"><span className="material-symbols-outlined">add</span>Adicionar outra despesa</button>
      </div>
    </>
  );
}

function ExpenseReceiptUpload({ files, onChange }) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  async function uploadReceipts(event) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    setUploading(true);
    setUploadError("");
    const uploaded = [];
    for (const file of selectedFiles) {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`${file.name}: limite máximo de 5 MB.`);
        continue;
      }
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `expense-receipts/${Date.now()}-${Math.random().toString(36).slice(2)}-${safeName}`;
      const { error } = await supabase.storage.from("activity-files").upload(path, file, { upsert: false });
      if (error) {
        setUploadError(`Erro ao enviar ${file.name}: ${error.message}`);
        continue;
      }
      const url = await signedUrl("activity-files", path);
      uploaded.push({ name: file.name, url, path, size: file.size, type: file.type });
    }
    if (uploaded.length) onChange([...files, ...uploaded]);
    setUploading(false);
  }

  async function removeReceipt(fileIndex) {
    const file = files[fileIndex];
    if (file?.path) await supabase.storage.from("activity-files").remove([file.path]);
    onChange(files.filter((_, index) => index !== fileIndex));
  }

  return (
    <div className="space-y-2">
      <label className="flex cursor-pointer items-center justify-center gap-1 rounded-xl border border-dashed border-primary/40 bg-blue-50 px-2 py-2.5 text-xs font-bold text-primary hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-200">
        <span className="material-symbols-outlined text-[18px]">upload_file</span>
        {uploading ? "Enviando..." : "Anexar comprovante"}
        <input type="file" multiple accept="image/*,.pdf" onChange={uploadReceipts} disabled={uploading} className="hidden" />
      </label>
      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
      {files.map((file, index) => (
        <div key={`${file.path || file.url}-${index}`} className="flex min-w-0 items-center gap-1 rounded-lg bg-surface px-2 py-1.5 dark:bg-gray-700">
          <a href={file.url} target="_blank" rel="noreferrer" title={`Visualizar ${file.name}`} className="flex min-w-0 flex-1 items-center gap-1 text-xs font-medium text-primary hover:underline dark:text-blue-200">
            <span className="material-symbols-outlined text-[16px]">{file.type === "application/pdf" ? "picture_as_pdf" : "image"}</span>
            <span className="truncate">{file.name}</span>
          </a>
          <button type="button" onClick={() => removeReceipt(index)} className="shrink-0 text-red-500" aria-label={`Remover ${file.name}`}><span className="material-symbols-outlined text-[17px]">close</span></button>
        </div>
      ))}
      <p className="text-[10px] text-outline">PDF ou imagem · até 5 MB</p>
    </div>
  );
}

function Section({ title, children }) { const [expanded, setExpanded] = useState(true); return <details open={expanded} onToggle={(event) => setExpanded(event.currentTarget.open)} className="group rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface sm:p-6"><summary className="flex min-h-11 cursor-pointer list-none items-center gap-2"><h3 className="flex-1 text-base font-bold text-primary dark:text-white sm:text-lg">{title}</h3><span className="material-symbols-outlined text-outline transition group-open:rotate-180">expand_more</span></summary><div className="mt-4 border-t border-surface-variant pt-4 dark:border-white/10">{children}</div></details>; }
function Field({ label, children }) { return <label className="block"><span className="mb-1.5 block text-sm font-medium text-primary dark:text-gray-200">{label}</span>{children}</label>; }
function Summary({ label, value, highlight }) { return <div className={`rounded-xl p-4 ${highlight ? "bg-accent/30" : "bg-surface dark:bg-gray-800"}`}><p className="text-xs uppercase text-outline">{label}</p><p className="mt-1 text-xl font-bold text-primary dark:text-white">{value}</p></div>; }
function Alert({ message }) { return <div className={`mb-4 rounded-xl p-3 ${message.type === "error" ? "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300" : "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300"}`}>{message.text}</div>; }

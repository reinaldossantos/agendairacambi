import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { lineTotal, months, programUsage } from "../lib/budget";
import ConfirmDialog from "../components/ui/ConfirmDialog";

const inputClass = "w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const blankLine = () => ({ line_type: "expense", group_name: "", category_name: "", monthly_amounts: Array(12).fill(""), note: "" });
const blankForm = () => ({ program_id: "", fiscal_year: new Date().getFullYear(), name: "Orçamento anual", description: "", notes: "", lines: [blankLine()] });
const statusLabels = { draft: "Rascunho", pending_approval: "Aguardando aprovação", changes_requested: "Ajustes solicitados", rejected: "Rejeitado", approved: "Aprovado" };
const statusTones = { draft: "bg-gray-100 text-gray-700", pending_approval: "bg-blue-100 text-blue-800", changes_requested: "bg-amber-100 text-amber-800", rejected: "bg-red-100 text-red-800", approved: "bg-emerald-100 text-emerald-800" };

export default function ProgramBudgets() {
  const { currentUser } = useCurrentUser();
  const [programs, setPrograms] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [reports, setReports] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [financialManagers, setFinancialManagers] = useState([]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [form, setForm] = useState(blankForm());
  const [editingId, setEditingId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [decisionComments, setDecisionComments] = useState({});

  const loadData = useCallback(async () => {
    const [programResult, budgetResult, reportResult, purchaseResult, managerResult] = await Promise.all([
      supabase.from("programs").select("id,name,leader_id").order("name"),
      supabase.from("program_budgets").select("*, coordinator:coordinator_signed_by(id,name), lines:program_budget_lines(*), approvals:program_budget_approvals(*, approver:approver_id(id,name))").order("fiscal_year", { ascending: false }),
      supabase.from("expense_reports").select("program_id,status,period_end,expense_items"),
      supabase.from("purchase_requests").select("program_ids,status,estimated_total,needed_by,created_at"),
      supabase.from("expense_approval_config").select("person_id").eq("is_active", true),
    ]);
    const error = programResult.error || budgetResult.error || reportResult.error || purchaseResult.error || managerResult.error;
    if (error) setMessage({ type: "error", text: `Não foi possível carregar os orçamentos: ${error.message}` });
    setPrograms(programResult.data || []);
    setBudgets((budgetResult.data || []).map((budget) => ({ ...budget, lines: (budget.lines || []).sort((a, b) => a.sort_order - b.sort_order) })));
    setReports((reportResult.data || []).map((report) => ({ ...report, expense_items: (report.expense_items || []).map((item) => ({ ...item, report_period_end: report.period_end })) })));
    setPurchases(purchaseResult.data || []);
    setFinancialManagers((managerResult.data || []).map((entry) => entry.person_id));
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const yearBudgets = useMemo(() => budgets.filter((budget) => Number(budget.fiscal_year) === Number(year)), [budgets, year]);
  const totals = useMemo(() => yearBudgets.filter((budget) => budget.status === "approved").reduce((result, budget) => {
    const expenseBudget = budget.lines.filter((line) => line.line_type === "expense").reduce((sum, line) => sum + lineTotal(line), 0);
    const revenueBudget = budget.lines.filter((line) => line.line_type === "revenue").reduce((sum, line) => sum + lineTotal(line), 0);
    const usage = programUsage(budget.program_id, Number(year), reports, purchases);
    return { expenseBudget: result.expenseBudget + expenseBudget, revenueBudget: result.revenueBudget + revenueBudget, realized: result.realized + usage.realized, committed: result.committed + usage.committed };
  }, { expenseBudget: 0, revenueBudget: 0, realized: 0, committed: 0 }), [yearBudgets, year, reports, purchases]);

  const canManage = (programId) => currentUser?.access_role === "admin" || financialManagers.includes(currentUser?.id) || programs.some((program) => program.id === programId && program.leader_id === currentUser?.id);
  const isCoordinator = (programId) => programs.some((program) => program.id === programId && program.leader_id === currentUser?.id);

  function beginNew() {
    const ownProgram = programs.find((program) => program.leader_id === currentUser?.id);
    setForm({ ...blankForm(), program_id: ownProgram?.id || "", fiscal_year: year });
    setEditingId(null); setEditing(true); setMessage({ type: "", text: "" });
  }

  function beginEdit(budget) {
    setForm({ ...budget, lines: budget.lines.length ? budget.lines.map((line) => ({ ...line, monthly_amounts: line.monthly_amounts.map((value) => value || "") })) : [blankLine()] });
    setEditingId(budget.id); setEditing(true); setMessage({ type: "", text: "" });
  }

  function updateLine(index, field, value) {
    setForm((current) => ({ ...current, lines: current.lines.map((line, position) => position === index ? { ...line, [field]: value } : line) }));
  }

  function updateMonth(index, month, value) {
    setForm((current) => ({ ...current, lines: current.lines.map((line, position) => {
      if (position !== index) return line;
      const monthly = [...line.monthly_amounts]; monthly[month] = value;
      return { ...line, monthly_amounts: monthly };
    }) }));
  }

  async function saveBudget(event) {
    event.preventDefault(); setMessage({ type: "", text: "" });
    if (!canManage(form.program_id)) return setMessage({ type: "error", text: "Você não possui permissão para manter o orçamento deste programa." });
    if (!form.lines.length || form.lines.some((line) => !line.group_name.trim() || !line.category_name.trim())) return setMessage({ type: "error", text: "Informe grupo e categoria em todas as rubricas." });
    setSaving(true);
    const header = { program_id: form.program_id, fiscal_year: Number(form.fiscal_year), name: form.name.trim(), description: form.description.trim() || null, notes: form.notes.trim() || null };
    const headerResult = editingId
      ? await supabase.from("program_budgets").update(header).eq("id", editingId).select().single()
      : await supabase.from("program_budgets").insert({ ...header, created_by: currentUser.id }).select().single();
    if (headerResult.error) { setSaving(false); return setMessage({ type: "error", text: headerResult.error.code === "23505" ? "Já existe um orçamento para este programa e ano." : headerResult.error.message }); }
    const budgetId = headerResult.data.id;
    if (editingId) {
      const deletion = await supabase.from("program_budget_lines").delete().eq("budget_id", budgetId);
      if (deletion.error) { setSaving(false); return setMessage({ type: "error", text: deletion.error.message }); }
    }
    const linesResult = await supabase.from("program_budget_lines").insert(form.lines.map((line, index) => ({
      budget_id: budgetId, line_type: line.line_type, group_name: line.group_name.trim(), category_name: line.category_name.trim(),
      monthly_amounts: line.monthly_amounts.map((value) => Number(value || 0)), note: line.note?.trim() || null, sort_order: index,
    })));
    setSaving(false);
    if (linesResult.error) return setMessage({ type: "error", text: linesResult.error.message });
    setEditing(false); setMessage({ type: "success", text: editingId ? "Orçamento atualizado." : "Orçamento cadastrado." }); await loadData();
  }

  async function removeBudget() {
    const result = await supabase.from("program_budgets").delete().eq("id", deleteTarget.id);
    setDeleteTarget(null);
    if (result.error) setMessage({ type: "error", text: result.error.message });
    else { setMessage({ type: "success", text: "Orçamento excluído." }); await loadData(); }
  }

  async function submitBudget(budget) {
    setMessage({ type: "", text: "" });
    const { error } = await supabase.rpc("submit_program_budget", { target_budget_id: budget.id });
    if (error) setMessage({ type: "error", text: error.message });
    else { setMessage({ type: "success", text: "Orçamento finalizado, assinado digitalmente e enviado para Reinaldo e Thaís." }); await loadData(); }
  }

  async function decideBudget(budget, decision) {
    const comment = decisionComments[budget.id]?.trim() || null;
    if (decision !== "approved" && !comment) return setMessage({ type: "error", text: "Informe a justificativa para solicitar ajustes ou rejeitar." });
    const { error } = await supabase.rpc("decide_program_budget", { target_budget_id: budget.id, requested_decision: decision, decision_comment: comment });
    if (error) setMessage({ type: "error", text: error.message });
    else { setDecisionComments((current) => ({ ...current, [budget.id]: "" })); setMessage({ type: "success", text: decision === "approved" ? "Aprovação assinada digitalmente." : "Decisão registrada com assinatura digital." }); await loadData(); }
  }

  if (editing) return <BudgetEditor form={form} setForm={setForm} programs={programs.filter((program) => canManage(program.id))} editingId={editingId} saving={saving} message={message} updateLine={updateLine} updateMonth={updateMonth} onSave={saveBudget} onCancel={() => setEditing(false)} />;

  const available = totals.expenseBudget - totals.realized - totals.committed;
  return <main className="mx-auto max-w-screen-2xl space-y-6 p-4 md:p-8">
    <header className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold uppercase tracking-widest text-secondary">Planejamento financeiro</p><h1 className="flex items-center gap-3 text-3xl font-black text-primary dark:text-white"><span className="material-symbols-outlined rounded-2xl bg-emerald-100 p-2 text-emerald-700">account_balance_wallet</span>Orçamentos dos programas</h1><p className="text-on-surface-variant">Acompanhe o que foi orçado, comprometido, realizado e o saldo disponível.</p></div><div className="flex gap-2"><select className={`${inputClass} w-32`} value={year} onChange={(event) => setYear(Number(event.target.value))}>{Array.from({ length: 7 }, (_, index) => new Date().getFullYear() - 3 + index).map((value) => <option key={value}>{value}</option>)}</select><button onClick={beginNew} className="rounded-full bg-[#ffd12f] px-6 py-3 font-black text-primary shadow">+ Novo orçamento</button></div></header>
    {message.text && <div className={`rounded-xl p-3 font-bold ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{message.text}</div>}
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><Metric label="Receita prevista" value={money(totals.revenueBudget)} tone="text-blue-700" /><Metric label="Despesa orçada" value={money(totals.expenseBudget)} tone="text-primary" /><Metric label="Comprometido em compras" value={money(totals.committed)} tone="text-amber-700" /><Metric label="Despesas realizadas" value={money(totals.realized)} tone="text-violet-700" /><Metric label="Saldo disponível" value={money(available)} tone={available < 0 ? "text-red-700" : "text-emerald-700"} /></section>
    <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-800">Os indicadores consolidados consideram somente orçamentos aprovados por Reinaldo e Thaís.</p>
    <section className="grid gap-5 xl:grid-cols-2">{yearBudgets.map((budget) => <BudgetCard key={budget.id} budget={budget} program={programs.find((program) => program.id === budget.program_id)} usage={programUsage(budget.program_id, Number(year), reports, purchases)} manageable={canManage(budget.program_id)} coordinator={isCoordinator(budget.program_id)} currentUser={currentUser} comment={decisionComments[budget.id] || ""} setComment={(value) => setDecisionComments((current) => ({ ...current, [budget.id]: value }))} onEdit={() => beginEdit(budget)} onDelete={() => setDeleteTarget(budget)} onSubmit={() => submitBudget(budget)} onDecide={(decision) => decideBudget(budget, decision)} />)}</section>
    {!yearBudgets.length && <div className="rounded-3xl border border-dashed p-14 text-center text-outline">Nenhum orçamento cadastrado para {year}.</div>}
    <ConfirmDialog isOpen={!!deleteTarget} title="Excluir orçamento" message={deleteTarget ? `Excluir o orçamento ${deleteTarget.name} e todas as suas rubricas?` : ""} confirmText="Sim, excluir" onCancel={() => setDeleteTarget(null)} onConfirm={removeBudget} />
  </main>;
}

function Metric({ label, value, tone }) { return <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"><span className="text-sm text-outline">{label}</span><strong className={`mt-2 block text-xl ${tone}`}>{value}</strong></div>; }

function BudgetCard({ budget, program, usage, manageable, coordinator, currentUser, comment, setComment, onEdit, onDelete, onSubmit, onDecide }) {
  const expense = budget.lines.filter((line) => line.line_type === "expense").reduce((sum, line) => sum + lineTotal(line), 0);
  const revenue = budget.lines.filter((line) => line.line_type === "revenue").reduce((sum, line) => sum + lineTotal(line), 0);
  const balance = expense - usage.used;
  const ownApproval = (budget.approvals || []).find((approval) => approval.approver_id === currentUser?.id && approval.decision === "pending");
  const editable = manageable && ["draft", "changes_requested"].includes(budget.status);
  return <article className="rounded-3xl border border-surface-variant bg-white p-5 shadow-sm dark:bg-gray-900"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-secondary">{program?.name}</p><h2 className="text-xl font-black text-primary dark:text-white">{budget.name}</h2><div className="mt-2 flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTones[budget.status]}`}>{statusLabels[budget.status]}</span><span className="text-sm text-outline">{budget.lines.length} rubrica(s) · Receita prevista {money(revenue)}</span></div></div>{editable && <div className="flex"><button onClick={onEdit} className="p-2" title="Editar"><span className="material-symbols-outlined">edit</span></button><button onClick={onDelete} className="p-2 text-red-600" title="Excluir"><span className="material-symbols-outlined">delete</span></button></div>}</div><div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-surface p-4 dark:bg-gray-800"><Summary label="Orçado" value={money(expense)} /><Summary label="Comprometido" value={money(usage.committed)} /><Summary label="Realizado" value={money(usage.realized)} /><Summary label="Saldo" value={money(balance)} alert={balance < 0} /></div>{usage.sharedPurchases > 0 && <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs text-amber-800">{usage.sharedPurchases} compra(s) compartilhada(s) foram rateadas igualmente entre os programas.</p>}{budget.coordinator_signed_at && <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"><strong>{budget.coordinator?.name || "Coordenador"}</strong><span className="block">Assinado digitalmente em {new Date(budget.coordinator_signed_at).toLocaleString("pt-BR")}</span></div>}<div className="mt-3 grid gap-2 sm:grid-cols-2">{(budget.approvals || []).map((approval) => <div key={approval.id} className="rounded-xl border border-surface-variant p-3 text-sm"><strong>{approval.approver?.name || approval.approver_key}</strong><span className="block text-outline">{approval.decision === "pending" ? "Aguardando aceite" : approval.decision === "approved" ? "Assinado digitalmente" : statusLabels[approval.decision]}</span>{approval.decided_at && <small>{new Date(approval.decided_at).toLocaleString("pt-BR")}</small>}{approval.comment && <p className="mt-1 text-xs">{approval.comment}</p>}</div>)}</div>{coordinator && ["draft", "changes_requested"].includes(budget.status) && <button onClick={onSubmit} className="mt-4 w-full rounded-full bg-primary px-5 py-3 font-black text-white">Finalizar, assinar e enviar para aprovação</button>}{ownApproval && <div className="mt-4 space-y-2 rounded-2xl border border-blue-200 p-4"><label className="text-sm font-bold">Justificativa para ajustes ou rejeição</label><textarea className={inputClass} rows="2" value={comment} onChange={(event) => setComment(event.target.value)} /><div className="flex flex-wrap gap-2"><button onClick={() => onDecide("approved")} className="rounded-full bg-emerald-600 px-4 py-2 font-bold text-white">Aprovar e assinar</button><button onClick={() => onDecide("changes_requested")} className="rounded-full bg-amber-500 px-4 py-2 font-bold text-white">Solicitar ajustes</button><button onClick={() => onDecide("rejected")} className="rounded-full bg-red-600 px-4 py-2 font-bold text-white">Rejeitar</button></div></div>}<details className="mt-4"><summary className="cursor-pointer font-bold text-primary dark:text-white">Ver rubricas mensais</summary><div className="mt-3 overflow-x-auto"><table className="min-w-[760px] w-full text-xs"><thead><tr><th className="p-2 text-left">Rubrica</th>{months.map((month) => <th key={month} className="p-2 text-right">{month}</th>)}<th className="p-2 text-right">Total</th></tr></thead><tbody>{budget.lines.map((line) => <tr key={line.id} className="border-t"><td className="p-2"><span className="block font-bold">{line.category_name}</span><span className="text-outline">{line.group_name} · {line.line_type === "revenue" ? "Receita" : "Despesa"}</span></td>{line.monthly_amounts.map((value, index) => <td key={index} className="p-2 text-right">{money(value)}</td>)}<td className="p-2 text-right font-bold">{money(lineTotal(line))}</td></tr>)}</tbody></table></div></details></article>;
}

function Summary({ label, value, alert }) { return <div><span className="block text-xs text-outline">{label}</span><strong className={alert ? "text-red-700" : "text-primary dark:text-white"}>{value}</strong></div>; }

function BudgetEditor({ form, setForm, programs, editingId, saving, message, updateLine, updateMonth, onSave, onCancel }) {
  return <main className="mx-auto max-w-screen-2xl space-y-5 p-4 md:p-8"><header><button onClick={onCancel} className="font-bold text-primary">← Voltar</button><h1 className="mt-2 text-3xl font-black text-primary dark:text-white">{editingId ? "Editar orçamento" : "Novo orçamento"}</h1><p className="text-outline">Cadastre as rubricas e distribua os valores pelos doze meses.</p></header>{message.text && <div className="rounded-xl bg-red-100 p-3 font-bold text-red-800">{message.text}</div>}<form onSubmit={onSave} className="space-y-5"><section className="grid gap-4 rounded-3xl bg-white p-5 shadow-sm dark:bg-gray-900 md:grid-cols-2"><Field label="Programa *"><select required className={inputClass} value={form.program_id} onChange={(event) => setForm({ ...form, program_id: event.target.value })}><option value="">Selecione</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field><Field label="Ano *"><input required min="2000" max="2100" type="number" className={inputClass} value={form.fiscal_year} onChange={(event) => setForm({ ...form, fiscal_year: event.target.value })} /></Field><Field label="Nome *"><input required className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></Field><Field label="Descrição"><input className={inputClass} value={form.description || ""} onChange={(event) => setForm({ ...form, description: event.target.value })} /></Field></section><section className="space-y-4">{form.lines.map((line, index) => <div key={index} className="rounded-3xl border border-surface-variant bg-white p-5 dark:bg-gray-900"><div className="grid gap-3 md:grid-cols-4"><Field label="Tipo"><select className={inputClass} value={line.line_type} onChange={(event) => updateLine(index, "line_type", event.target.value)}><option value="expense">Despesa</option><option value="revenue">Receita</option></select></Field><Field label="Grupo *"><input required className={inputClass} value={line.group_name} onChange={(event) => updateLine(index, "group_name", event.target.value)} placeholder="Ex.: Despesas administrativas" /></Field><Field label="Categoria/rubrica *"><input required className={inputClass} value={line.category_name} onChange={(event) => updateLine(index, "category_name", event.target.value)} placeholder="Ex.: Combustíveis" /></Field><div className="flex items-end justify-between"><strong className="pb-3">Total: {money(lineTotal(line))}</strong>{form.lines.length > 1 && <button type="button" onClick={() => setForm({ ...form, lines: form.lines.filter((_, position) => position !== index) })} className="mb-2 p-2 text-red-600"><span className="material-symbols-outlined">delete</span></button>}</div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-12">{months.map((month, monthIndex) => <Field key={month} label={month}><input min="0" step="0.01" type="number" className={inputClass} value={line.monthly_amounts[monthIndex]} onChange={(event) => updateMonth(index, monthIndex, event.target.value)} /></Field>)}</div></div>)}<button type="button" onClick={() => setForm({ ...form, lines: [...form.lines, blankLine()] })} className="rounded-full border border-primary px-5 py-2.5 font-bold text-primary">+ Adicionar rubrica</button></section><div className="sticky bottom-0 flex justify-end gap-3 border-t bg-background/95 py-4 backdrop-blur"><button type="button" onClick={onCancel} className="rounded-full px-5 py-3 font-bold">Cancelar</button><button disabled={saving} className="rounded-full bg-primary px-7 py-3 font-black text-white disabled:opacity-50">{saving ? "Salvando…" : "Salvar orçamento"}</button></div></form></main>;
}

function Field({ label, children }) { return <label><span className="mb-1 block text-sm font-bold">{label}</span>{children}</label>; }

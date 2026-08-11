import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { signFiles } from "../lib/privateStorage";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { sentenceCase } from "../lib/textFormatting";

const inputClass = "w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const emptyItem = () => ({ description: "", specification: "", quantity: 1, unit: "un", estimated_unit_price: "" });
const emptyForm = () => ({ title: "", request_type: "goods", urgency: "normal", needed_by: "", justification: "", management_project_id: "", edital_name: "", edital_number: "", edital_deadline: "", funding_source: "", program_ids: [], beneficiary_person_ids: [], beneficiary_description: "", supplier_suggestion: "", delivery_location: "Iracambi", items: [emptyItem()] });
const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const labels = { draft: "Rascunho", pending_approval: "Aguardando aprovação", changes_requested: "Ajustes solicitados", rejected: "Reprovada", approved: "Aprovada", quotation: "Em cotação", ordered: "Pedido realizado", partially_received: "Recebimento parcial", received: "Recebida", cancelled: "Cancelada" };
const statusTone = { draft: "bg-amber-100 text-amber-800", pending_approval: "bg-blue-100 text-blue-800", changes_requested: "bg-orange-100 text-orange-800", rejected: "bg-red-100 text-red-800", approved: "bg-emerald-100 text-emerald-800", quotation: "bg-violet-100 text-violet-800", ordered: "bg-cyan-100 text-cyan-800", partially_received: "bg-indigo-100 text-indigo-800", received: "bg-green-100 text-green-800", cancelled: "bg-gray-200 text-gray-700" };

export default function PurchaseRequests() {
  const { currentUser, persons } = useCurrentUser();
  const [requests, setRequests] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [projects, setProjects] = useState([]);
  const [approverIds, setApproverIds] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [mode, setMode] = useState("list");
  const [preview, setPreview] = useState(false);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [decisionComment, setDecisionComment] = useState("");
  const [message, setMessage] = useState({ type: "", text: "" });
  const [busy, setBusy] = useState(false);

  const loadData = useCallback(async () => {
    const [requestResult, programResult, projectResult, approvalResult, configResult, stepResult] = await Promise.all([
      supabase.from("purchase_requests").select("*, requester:requester_id(id,name), project:management_project_id(id,title,project_number)").order("created_at", { ascending: false }),
      supabase.from("programs").select("id,name").order("name"),
      supabase.from("management_projects").select("id,title,project_number,status").neq("status", "cancelled").order("title"),
      supabase.from("purchase_request_approvals").select("*, approver:approver_id(id,name)").order("created_at"),
      supabase.from("expense_approval_config").select("person_id").eq("is_active", true),
      supabase.from("purchase_request_steps").select("*, actor:actor_id(id,name)").order("created_at", { ascending: false }),
    ]);
    if (requestResult.error) setMessage({ type: "error", text: requestResult.error.message });
    const grouped = (approvalResult.data || []).reduce((map, approval) => ({ ...map, [approval.request_id]: [...(map[approval.request_id] || []), approval] }), {});
    const steps = await Promise.all((stepResult.data || []).map(async (step) => ({ ...step, attachments: await signFiles(step.attachments || []) })));
    const stepsByRequest = steps.reduce((map, step) => ({ ...map, [step.request_id]: [...(map[step.request_id] || []), step] }), {});
    setRequests((requestResult.data || []).map((request) => ({ ...request, approvals: grouped[request.id] || [], steps: stepsByRequest[request.id] || [] })));
    setPrograms(programResult.data || []);
    setProjects(projectResult.data || []);
    setApproverIds((configResult.data || []).map((entry) => entry.person_id));
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadData, 0);
    return () => window.clearTimeout(timer);
  }, [loadData]);
  const total = useMemo(() => form.items.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.estimated_unit_price || 0), 0), [form.items]);
  const stats = useMemo(() => ({ pending: requests.filter((item) => item.status === "pending_approval").length, approved: requests.filter((item) => ["approved", "quotation", "ordered", "partially_received"].includes(item.status)).length, received: requests.filter((item) => item.status === "received").length, total: requests.reduce((sum, item) => sum + Number(item.estimated_total || 0), 0) }), [requests]);
  const visible = useMemo(() => requests.filter((request) => {
    const term = filter.trim().toLowerCase();
    return (!statusFilter || request.status === statusFilter) && (!term || [request.request_number, request.title, request.requester?.name, request.project?.title, request.edital_name].some((value) => String(value || "").toLowerCase().includes(term)));
  }), [requests, filter, statusFilter]);

  function update(field, value) { setForm((current) => ({ ...current, [field]: value })); }
  function toggleArray(field, id) { setForm((current) => ({ ...current, [field]: current[field].includes(id) ? current[field].filter((value) => value !== id) : [...current[field], id] })); }
  function updateItem(index, field, value) { setForm((current) => ({ ...current, items: current.items.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) })); }
  function beginNew() { setEditingId(null); setForm(emptyForm()); setMessage({ type: "", text: "" }); setMode("form"); }
  function beginEdit(request) { setEditingId(request.id); setForm({ ...emptyForm(), ...request, management_project_id: request.management_project_id || "", needed_by: request.needed_by || "", edital_deadline: request.edital_deadline || "", items: request.items?.length ? request.items : [emptyItem()] }); setMode("form"); setSelected(null); }
  function validate() {
    if (!form.title.trim() || !form.justification.trim()) return "Informe o objeto da compra e a justificativa.";
    if (!form.items.length || form.items.some((item) => !item.description.trim() || Number(item.quantity) <= 0)) return "Informe a descrição e a quantidade de todos os itens.";
    if (!form.program_ids.length && !form.beneficiary_person_ids.length && !form.beneficiary_description.trim()) return "Informe ao menos um programa, pessoa ou público beneficiado.";
    return "";
  }
  async function saveDraft() {
    const errorText = validate(); if (errorText) return setMessage({ type: "error", text: errorText });
    setBusy(true);
    const payload = {
      requester_id: editingId ? form.requester_id : currentUser.id, title: sentenceCase(form.title), request_type: form.request_type,
      urgency: form.urgency, needed_by: form.needed_by || null, justification: sentenceCase(form.justification),
      management_project_id: form.management_project_id || null, edital_name: form.edital_name.trim() ? sentenceCase(form.edital_name) : null,
      edital_number: form.edital_number.trim() || null, edital_deadline: form.edital_deadline || null,
      funding_source: form.funding_source.trim() ? sentenceCase(form.funding_source) : null, program_ids: form.program_ids,
      beneficiary_person_ids: form.beneficiary_person_ids, beneficiary_description: form.beneficiary_description.trim() ? sentenceCase(form.beneficiary_description) : null,
      supplier_suggestion: form.supplier_suggestion.trim() ? sentenceCase(form.supplier_suggestion) : null, delivery_location: form.delivery_location.trim() ? sentenceCase(form.delivery_location) : null,
      items: form.items.map((item) => ({ ...item, description: sentenceCase(item.description), specification: item.specification?.trim() ? sentenceCase(item.specification) : "" })), estimated_total: total,
    };
    const result = editingId ? await supabase.from("purchase_requests").update(payload).eq("id", editingId).select().single() : await supabase.from("purchase_requests").insert(payload).select().single();
    setBusy(false);
    if (result.error) return setMessage({ type: "error", text: result.error.message });
    setEditingId(result.data.id); setMessage({ type: "success", text: "Rascunho salvo com segurança." }); await loadData();
    return result.data.id;
  }
  async function openPreview() { const id = await saveDraft(); if (id) setPreview(true); }
  async function submitRequest() {
    setBusy(true); const { error } = await supabase.rpc("initialize_purchase_request_approval", { target_request_id: editingId }); setBusy(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setPreview(false); setMode("list"); setMessage({ type: "success", text: "Solicitação enviada para aprovação." }); await loadData();
  }
  async function decide(request, decision) {
    setBusy(true); const { error } = await supabase.rpc("decide_purchase_request", { target_request_id: request.id, requested_decision: decision, decision_comment: decisionComment || null }); setBusy(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setDecisionComment(""); setSelected(null); setMessage({ type: "success", text: "Decisão registrada na trilha de auditoria." }); await loadData();
  }
  async function advance(request, status) {
    setBusy(true); const { error } = await supabase.rpc("advance_purchase_request", { target_request_id: request.id, next_status: status, transition_comment: null }); setBusy(false);
    if (error) return setMessage({ type: "error", text: error.message });
    setSelected(null); await loadData();
  }
  async function recordStep(request, step, files) {
    setBusy(true); const uploadedPaths = []; const attachments = [];
    try {
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name}: o limite é 10 MB.`);
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `purchase-requests/${request.id}/${crypto.randomUUID()}-${safeName}`;
        const { error: uploadError } = await supabase.storage.from("activity-files").upload(path, file, { upsert: false });
        if (uploadError) throw uploadError;
        uploadedPaths.push(path); attachments.push({ name: file.name, path, size: file.size, type: file.type });
      }
      const { error } = await supabase.rpc("record_purchase_request_step", {
        target_request_id: request.id, requested_step_type: step.step_type, step_title: sentenceCase(step.title),
        step_description: step.description?.trim() ? sentenceCase(step.description) : null, step_supplier_name: step.supplier_name?.trim() ? sentenceCase(step.supplier_name) : null,
        step_document_number: step.document_number || null, step_amount: step.amount === "" ? null : Number(step.amount),
        step_event_date: step.event_date, step_attachments: attachments,
      });
      if (error) throw error;
      setSelected(null); setMessage({ type: "success", text: "Etapa registrada com autoria, data e documentos." }); await loadData();
      return true;
    } catch (error) {
      if (uploadedPaths.length) await supabase.storage.from("activity-files").remove(uploadedPaths);
      setMessage({ type: "error", text: error.message }); return false;
    } finally { setBusy(false); }
  }
  async function removeDraft(request) {
    if (currentUser?.access_role !== "admin") return setMessage({ type: "error", text: "Somente o administrador pode excluir solicitações de compras." });
    if (!window.confirm(`Excluir definitivamente a solicitação nº ${String(request.request_number).padStart(5, "0")}?`)) return;
    const { error } = await supabase.from("purchase_requests").delete().eq("id", request.id);
    if (error) setMessage({ type: "error", text: error.message }); else { setSelected(null); await loadData(); }
  }

  if (mode === "form") return <main className="mx-auto max-w-6xl space-y-5 p-4 md:p-8">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><button onClick={() => setMode("list")} className="text-sm font-bold text-primary">← Voltar</button><h1 className="mt-2 text-3xl font-black text-primary dark:text-white">{editingId ? "Editar solicitação" : "Nova solicitação de compra"}</h1><p className="text-on-surface-variant">Planeje a necessidade, os beneficiários e o investimento estimado.</p></div><div className="rounded-2xl bg-primary px-5 py-3 text-white"><span className="block text-xs uppercase opacity-75">Total estimado</span><strong className="text-xl">{money(total)}</strong></div></div>
    {message.text && <Alert message={message} />}
    <Section title="1. Necessidade" icon="shopping_cart" tone="bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
      <Field label="Objeto da compra *" wide><input className={inputClass} value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Ex.: notebooks para equipe de campo" /></Field>
      <Field label="Tipo"><select className={inputClass} value={form.request_type} onChange={(e) => update("request_type", e.target.value)}><option value="goods">Materiais ou bens</option><option value="services">Serviços</option><option value="works">Obras ou instalações</option></select></Field>
      <Field label="Urgência"><select className={inputClass} value={form.urgency} onChange={(e) => update("urgency", e.target.value)}><option value="low">Baixa</option><option value="normal">Normal</option><option value="high">Alta</option><option value="critical">Crítica</option></select></Field>
      <Field label="Necessário até"><input type="date" className={inputClass} value={form.needed_by} onChange={(e) => update("needed_by", e.target.value)} /></Field>
      <Field label="Local de entrega"><input className={inputClass} value={form.delivery_location} onChange={(e) => update("delivery_location", e.target.value)} /></Field>
      <Field label="Justificativa e resultado esperado *" wide><textarea rows="4" className={inputClass} value={form.justification} onChange={(e) => update("justification", e.target.value)} placeholder="Explique por que a compra é necessária e qual impacto produzirá." /></Field>
    </Section>
    <Section title="2. Projeto, edital e fonte do recurso" icon="account_tree" tone="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
      <Field label="Projeto específico" wide><select className={inputClass} value={form.management_project_id} onChange={(e) => update("management_project_id", e.target.value)}><option value="">Sem vínculo com projeto</option>{projects.map((project) => <option key={project.id} value={project.id}>#{String(project.project_number).padStart(4, "0")} · {project.title}</option>)}</select></Field>
      <Field label="Edital"><input className={inputClass} value={form.edital_name} onChange={(e) => update("edital_name", e.target.value)} placeholder="Nome do edital" /></Field>
      <Field label="Número do edital"><input className={inputClass} value={form.edital_number} onChange={(e) => update("edital_number", e.target.value)} /></Field>
      <Field label="Prazo do edital"><input type="date" className={inputClass} value={form.edital_deadline} onChange={(e) => update("edital_deadline", e.target.value)} /></Field>
      <Field label="Fonte do recurso"><input className={inputClass} value={form.funding_source} onChange={(e) => update("funding_source", e.target.value)} placeholder="Projeto, financiador ou centro de custo" /></Field>
    </Section>
    <Section title="3. Quem será beneficiado" icon="groups" tone="bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">
      <ChoiceGroup title="Programas" options={programs} values={form.program_ids} onToggle={(id) => toggleArray("program_ids", id)} />
      <ChoiceGroup title="Pessoas" options={(persons || []).filter((person) => person.is_active !== false)} values={form.beneficiary_person_ids} onToggle={(id) => toggleArray("beneficiary_person_ids", id)} />
      <Field label="Outro público beneficiado" wide><textarea className={inputClass} value={form.beneficiary_description} onChange={(e) => update("beneficiary_description", e.target.value)} placeholder="Comunidades, parceiros, turmas ou público externo" /></Field>
    </Section>
    <Section title="4. Itens solicitados" icon="inventory_2" tone="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <div className="col-span-full space-y-3">{form.items.map((item, index) => <div key={index} className="grid gap-3 rounded-2xl border border-surface-variant p-4 md:grid-cols-12">
        <div className="md:col-span-4"><label className="text-xs font-bold">Descrição *</label><input className={inputClass} value={item.description} onChange={(e) => updateItem(index, "description", e.target.value)} /></div>
        <div className="md:col-span-3"><label className="text-xs font-bold">Especificação</label><input className={inputClass} value={item.specification} onChange={(e) => updateItem(index, "specification", e.target.value)} /></div>
        <div className="md:col-span-1"><label className="text-xs font-bold">Qtd.</label><input type="number" min="0.01" step="0.01" className={inputClass} value={item.quantity} onChange={(e) => updateItem(index, "quantity", e.target.value)} /></div>
        <div className="md:col-span-1"><label className="text-xs font-bold">Un.</label><input className={inputClass} value={item.unit} onChange={(e) => updateItem(index, "unit", e.target.value)} /></div>
        <div className="md:col-span-2"><label className="text-xs font-bold">Valor unitário</label><input type="number" min="0" step="0.01" className={inputClass} value={item.estimated_unit_price} onChange={(e) => updateItem(index, "estimated_unit_price", e.target.value)} /></div>
        <button type="button" aria-label="Remover item" disabled={form.items.length === 1} onClick={() => update("items", form.items.filter((_, i) => i !== index))} className="self-end rounded-xl p-2 text-red-600 disabled:opacity-30"><span className="material-symbols-outlined">delete</span></button>
      </div>)}<button type="button" onClick={() => update("items", [...form.items, emptyItem()])} className="rounded-full border border-primary px-4 py-2 font-bold text-primary">+ Adicionar item</button></div>
      <Field label="Fornecedor sugerido" wide><input className={inputClass} value={form.supplier_suggestion} onChange={(e) => update("supplier_suggestion", e.target.value)} placeholder="Opcional; não representa contratação" /></Field>
    </Section>
    <div className="sticky bottom-3 flex flex-wrap justify-end gap-3 rounded-2xl border bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-gray-900/95"><button onClick={() => setMode("list")} className="rounded-full px-5 py-2.5 font-bold">Cancelar</button><button disabled={busy} onClick={saveDraft} className="rounded-full border border-primary px-5 py-2.5 font-bold text-primary">Salvar rascunho</button><button disabled={busy} onClick={openPreview} className="rounded-full bg-[#ffd12f] px-6 py-2.5 font-black text-primary shadow">Revisar e enviar</button></div>
    {preview && <Preview form={form} total={total} programs={programs} persons={persons} projects={projects} busy={busy} onClose={() => setPreview(false)} onConfirm={submitRequest} />}
  </main>;

  return <main className="mx-auto max-w-screen-2xl space-y-6 p-4 md:p-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="font-bold uppercase tracking-widest text-secondary">Aquisições</p><h1 className="flex items-center gap-3 text-3xl font-black text-primary dark:text-white"><span className="material-symbols-outlined rounded-2xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">shopping_cart</span>Solicitações de compras</h1><p className="text-on-surface-variant">Da necessidade à entrega, com aprovação e rastreabilidade.</p></div><button onClick={beginNew} className="rounded-full bg-[#ffd12f] px-6 py-3 font-black text-primary shadow-md">+ Nova solicitação</button></div>
    {message.text && <Alert message={message} />}
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric icon="pending_actions" tone="bg-amber-100 text-amber-700" label="Aguardando aprovação" value={stats.pending} /><Metric icon="verified" tone="bg-blue-100 text-blue-700" label="Aprovadas/em andamento" value={stats.approved} /><Metric icon="inventory" tone="bg-emerald-100 text-emerald-700" label="Recebidas" value={stats.received} /><Metric icon="payments" tone="bg-violet-100 text-violet-700" label="Volume estimado" value={money(stats.total)} /></div>
    <div className="flex flex-wrap gap-3 rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"><input className={`${inputClass} flex-1`} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Pesquisar número, objeto, solicitante, projeto ou edital" /><select className={`${inputClass} sm:w-64`} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Todas as situações</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
    <div className="grid gap-4 lg:grid-cols-2">{visible.map((request) => <article key={request.id} className="rounded-3xl border border-surface-variant bg-white p-5 shadow-sm transition hover:shadow-md dark:bg-gray-900">
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className="material-symbols-outlined h-fit rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">shopping_bag</span><div><p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">Solicitação nº {String(request.request_number).padStart(5, "0")}</p><h2 className="mt-1 text-xl font-black text-primary dark:text-white">{request.title}</h2><p className="text-sm">{request.requester?.name}{request.project ? ` · ${request.project.title}` : ""}</p></div></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${statusTone[request.status]}`}>{labels[request.status]}</span></div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4"><div><strong>{money(request.estimated_total)}</strong><span className="ml-2 text-sm text-on-surface-variant">· {request.items?.length || 0} item(ns)</span></div><button onClick={() => setSelected(request)} className="rounded-full bg-primary px-5 py-2 font-bold text-white">Ver detalhes</button></div>
    </article>)}</div>
    {!visible.length && <div className="rounded-3xl border border-dashed p-12 text-center text-on-surface-variant">Nenhuma solicitação encontrada.</div>}
    {selected && <Details request={selected} currentUser={currentUser} approverIds={approverIds} programs={programs} persons={persons} projects={projects} comment={decisionComment} setComment={setDecisionComment} busy={busy} onClose={() => setSelected(null)} onEdit={beginEdit} onDelete={removeDraft} onDecide={decide} onAdvance={advance} onRecordStep={recordStep} />}
  </main>;
}

function Section({ title, icon, tone, children }) { return <section className="rounded-3xl border border-surface-variant bg-white p-5 shadow-sm dark:bg-gray-900"><h2 className="mb-5 flex items-center gap-3 text-xl font-black text-primary dark:text-white"><span className={`material-symbols-outlined rounded-xl p-2 ${tone}`}>{icon}</span>{title}</h2><div className="grid gap-4 md:grid-cols-2">{children}</div></section>; }
function Field({ label, wide, children }) { return <label className={wide ? "md:col-span-2" : ""}><span className="mb-1 block text-sm font-bold">{label}</span>{children}</label>; }
function ChoiceGroup({ title, options, values, onToggle }) { return <div><p className="mb-2 text-sm font-bold">{title}</p><div className="max-h-44 space-y-1 overflow-auto rounded-xl border p-2">{options.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-2 rounded-lg p-2 hover:bg-primary/5"><input type="checkbox" checked={values.includes(option.id)} onChange={() => onToggle(option.id)} className="rounded text-primary" /><span>{option.name}</span></label>)}</div></div>; }
function Metric({ icon, tone, label, value }) { return <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-gray-900"><span className={`material-symbols-outlined rounded-xl p-2 ${tone}`}>{icon}</span><strong className="mt-2 block text-2xl text-primary dark:text-white">{value}</strong><span className="text-sm text-on-surface-variant">{label}</span></div>; }
function Alert({ message }) { return <div className={`rounded-xl p-3 font-bold ${message.type === "error" ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800"}`}>{message.text}</div>; }
function Names({ ids, options }) { const names = (ids || []).map((id) => options?.find((item) => item.id === id)?.name).filter(Boolean); return names.length ? names.join(", ") : "Não informado"; }

function Preview({ form, total, programs, persons, projects, busy, onClose, onConfirm }) {
  const project = projects.find((item) => item.id === form.management_project_id);
  return <Modal title="Revisão antes do envio" onClose={onClose}><p className="mb-5 text-sm text-on-surface-variant">Confira os dados. Depois do envio, a solicitação ficará bloqueada até a decisão de Reinaldo e Thaís.</p><div className="space-y-4"><Summary label="Objeto" value={form.title} /><Summary label="Justificativa" value={form.justification} /><Summary label="Projeto" value={project?.title || "Sem vínculo"} /><Summary label="Programas beneficiados" value={<Names ids={form.program_ids} options={programs} />} /><Summary label="Pessoas beneficiadas" value={<Names ids={form.beneficiary_person_ids} options={persons} />} /><Items items={form.items} /><div className="text-right text-xl font-black">Total estimado: {money(total)}</div></div><div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="rounded-full px-5 py-2 font-bold">Voltar e corrigir</button><button disabled={busy} onClick={onConfirm} className="rounded-full bg-primary px-6 py-2 font-bold text-white">Confirmar e enviar</button></div></Modal>;
}

function Details({ request, currentUser, approverIds, programs, persons, projects, comment, setComment, busy, onClose, onEdit, onDelete, onDecide, onAdvance, onRecordStep }) {
  const own = request.requester_id === currentUser?.id; const admin = currentUser?.access_role === "admin"; const pendingApproval = request.approvals?.find((item) => item.approver_id === currentUser?.id && item.decision === "pending"); const buyer = admin || approverIds.includes(currentUser?.id);
  const next = { approved: [["quotation", "Iniciar cotação"], ["ordered", "Registrar pedido"]], quotation: [["ordered", "Registrar pedido"]], ordered: [["partially_received", "Recebimento parcial"], ["received", "Confirmar recebimento"]], partially_received: [["received", "Confirmar recebimento"]] }[request.status] || [];
  const [stepForm, setStepForm] = useState({ step_type: "comment", title: "", description: "", supplier_name: "", document_number: "", amount: "", event_date: new Date().toISOString().slice(0, 10) });
  const [stepFiles, setStepFiles] = useState([]);
  const [confirmingCancellation, setConfirmingCancellation] = useState(false);
  const operationalTypes = [
    ["quotation_requested", "Cotação solicitada"], ["quotation_received", "Cotação recebida"], ["supplier_selected", "Fornecedor escolhido"],
    ["order_issued", "Pedido emitido"], ["invoice_received", "Nota fiscal recebida"], ["payment_scheduled", "Pagamento programado"],
    ["payment_completed", "Pagamento realizado"], ["partial_receipt", "Recebimento parcial"], ["receipt_completed", "Recebimento concluído"],
  ];
  async function submitStep() {
    const saved = await onRecordStep(request, stepForm, stepFiles);
    if (saved) { setStepForm({ step_type: "comment", title: "", description: "", supplier_name: "", document_number: "", amount: "", event_date: new Date().toISOString().slice(0, 10) }); setStepFiles([]); }
  }
  return <Modal title={`Solicitação nº ${String(request.request_number).padStart(5, "0")}`} onClose={onClose}><div className="space-y-4"><div className="flex flex-wrap justify-between gap-2"><div><h3 className="text-2xl font-black text-primary dark:text-white">{request.title}</h3><p>{request.requester?.name}</p></div><span className={`h-fit rounded-full px-3 py-1 text-sm font-bold ${statusTone[request.status]}`}>{labels[request.status]}</span></div><Summary label="Justificativa" value={request.justification} /><Summary label="Projeto" value={projects.find((item) => item.id === request.management_project_id)?.title || "Sem vínculo"} />{request.edital_name && <Summary label="Edital" value={`${request.edital_name}${request.edital_number ? ` · ${request.edital_number}` : ""}`} />}<Summary label="Programas beneficiados" value={<Names ids={request.program_ids} options={programs} />} /><Summary label="Pessoas beneficiadas" value={<Names ids={request.beneficiary_person_ids} options={persons} />} />{request.beneficiary_description && <Summary label="Outro público" value={request.beneficiary_description} />}<Items items={request.items} /><div className="text-right text-xl font-black">Total estimado: {money(request.estimated_total)}</div>
    {!!request.approvals?.length && <div className="rounded-2xl bg-primary/5 p-4"><p className="mb-2 font-black">Fluxo de aprovação</p>{request.approvals.map((approval) => <div key={approval.id} className="flex justify-between border-b py-2 last:border-0"><span>{approval.approver?.name}</span><strong>{approval.decision === "pending" ? "Pendente" : labels[approval.decision] || approval.decision}</strong></div>)}</div>}
    {pendingApproval && <div className="rounded-2xl border-2 border-secondary p-4"><label className="mb-2 block font-bold">Parecer (obrigatório para ajustes ou reprovação)</label><textarea rows="3" className={inputClass} value={comment} onChange={(e) => setComment(e.target.value)} /><div className="mt-3 flex flex-wrap justify-end gap-2"><button disabled={busy} onClick={() => onDecide(request, "changes_requested")} className="rounded-full bg-orange-100 px-4 py-2 font-bold text-orange-800">Solicitar ajustes</button><button disabled={busy} onClick={() => onDecide(request, "rejected")} className="rounded-full bg-red-100 px-4 py-2 font-bold text-red-800">Reprovar</button><button disabled={busy} onClick={() => onDecide(request, "approved")} className="rounded-full bg-emerald-600 px-5 py-2 font-bold text-white">Aprovar</button></div></div>}
    {buyer && next.length > 0 && <div className="flex flex-wrap justify-end gap-2">{next.map(([status, label]) => <button key={status} disabled={busy} onClick={() => onAdvance(request, status)} className="rounded-full bg-primary px-5 py-2 font-bold text-white">{label}</button>)}</div>}
    <section className="rounded-2xl border border-surface-variant p-4"><h4 className="flex items-center gap-3 font-black text-primary dark:text-white"><span className="material-symbols-outlined rounded-xl bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">history</span>Linha do tempo completa</h4><p className="mt-1 text-xs text-on-surface-variant">Registros permanentes com autoria, data, valores, documentos e anexos.</p>
      <div className="mt-4 space-y-3">{(request.steps || []).length ? request.steps.map((step) => <div key={step.id} className="relative border-l-2 border-primary/25 pl-4"><span className="absolute -left-1.5 top-1 h-2.5 w-2.5 rounded-full bg-primary" /><div className="flex flex-wrap justify-between gap-2"><strong>{step.title}</strong><time className="text-xs text-on-surface-variant">{new Date(step.created_at).toLocaleString("pt-BR")}</time></div><p className="text-xs font-bold text-secondary">{step.actor?.name} · {step.event_date?.split("-").reverse().join("/")}</p>{step.description && <p className="mt-1 whitespace-pre-wrap text-sm">{step.description}</p>}<div className="mt-1 flex flex-wrap gap-3 text-xs">{step.supplier_name && <span>Fornecedor: <b>{step.supplier_name}</b></span>}{step.document_number && <span>Documento: <b>{step.document_number}</b></span>}{step.amount != null && <span>Valor: <b>{money(step.amount)}</b></span>}</div>{!!step.attachments?.length && <div className="mt-2 flex flex-wrap gap-2">{step.attachments.map((file, index) => <a key={`${file.path}-${index}`} href={file.url} target="_blank" rel="noreferrer" className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">📎 {file.name}</a>)}</div>}</div>) : <p className="rounded-xl bg-surface p-3 text-center text-sm text-on-surface-variant">Nenhuma movimentação operacional registrada.</p>}</div>
      <div className="mt-5 grid gap-3 rounded-2xl bg-surface p-4 dark:bg-gray-800 md:grid-cols-2"><label><span className="text-xs font-bold">Tipo de registro</span><select className={inputClass} value={stepForm.step_type} onChange={(e) => setStepForm((value) => ({ ...value, step_type: e.target.value }))}><option value="comment">Comentário da equipe</option><option value="document_added">Documento complementar</option>{buyer && operationalTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="text-xs font-bold">Data do evento</span><input type="date" className={inputClass} value={stepForm.event_date} onChange={(e) => setStepForm((value) => ({ ...value, event_date: e.target.value }))} /></label><label className="md:col-span-2"><span className="text-xs font-bold">Título *</span><input className={inputClass} value={stepForm.title} onChange={(e) => setStepForm((value) => ({ ...value, title: e.target.value }))} placeholder="Resumo objetivo do que aconteceu" /></label><label className="md:col-span-2"><span className="text-xs font-bold">Detalhes</span><textarea className={inputClass} rows="3" value={stepForm.description} onChange={(e) => setStepForm((value) => ({ ...value, description: e.target.value }))} /></label>{buyer && <><label><span className="text-xs font-bold">Fornecedor</span><input className={inputClass} value={stepForm.supplier_name} onChange={(e) => setStepForm((value) => ({ ...value, supplier_name: e.target.value }))} /></label><label><span className="text-xs font-bold">Nº cotação, pedido ou nota</span><input className={inputClass} value={stepForm.document_number} onChange={(e) => setStepForm((value) => ({ ...value, document_number: e.target.value }))} /></label><label><span className="text-xs font-bold">Valor</span><input type="number" min="0" step="0.01" className={inputClass} value={stepForm.amount} onChange={(e) => setStepForm((value) => ({ ...value, amount: e.target.value }))} /></label></>}<label className={buyer ? "" : "md:col-span-2"}><span className="text-xs font-bold">Documentos (até 10 MB cada)</span><input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" className={inputClass} onChange={(e) => setStepFiles(Array.from(e.target.files || []))} /></label><div className="flex justify-end md:col-span-2"><button disabled={busy || !stepForm.title.trim()} onClick={submitStep} className="rounded-full bg-secondary px-5 py-2 font-black text-primary disabled:opacity-40">Registrar na linha do tempo</button></div></div>
    </section>
    <div className="flex flex-wrap justify-between gap-3 border-t pt-4"><div>{(admin || (own && ["draft", "changes_requested"].includes(request.status))) && <button onClick={() => onEdit(request)} className="rounded-full border border-primary px-5 py-2 font-bold text-primary">Editar</button>} {admin && <button onClick={() => onDelete(request)} className="ml-2 rounded-full px-4 py-2 font-bold text-red-600">Excluir</button>}</div>{buyer && ["approved", "quotation", "ordered", "partially_received"].includes(request.status) && <button onClick={() => setConfirmingCancellation(true)} className="rounded-full border border-red-300 px-4 py-2 text-sm font-bold text-red-700">Cancelar solicitação definitivamente</button>}</div>
    <div className="sticky bottom-0 -mx-5 -mb-5 mt-5 flex justify-end border-t border-surface-variant bg-white/95 px-5 py-4 backdrop-blur dark:bg-gray-900/95 md:-mx-7 md:-mb-7 md:px-7"><button type="button" onClick={onClose} className="flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 font-bold text-white"><span className="material-symbols-outlined text-[19px]">close</span>Fechar visualização</button></div>
    <ConfirmDialog isOpen={confirmingCancellation} title="Cancelar esta solicitação definitivamente?" message={`Esta ação mudará a solicitação nº ${String(request.request_number).padStart(5, "0")} de ${request.requester?.name} para Cancelada. Para apenas sair desta tela, escolha “Voltar sem cancelar”.`} confirmText="Sim, cancelar definitivamente" cancelText="Voltar sem cancelar" onCancel={() => setConfirmingCancellation(false)} onConfirm={() => { setConfirmingCancellation(false); onAdvance(request, "cancelled"); }} />
  </div></Modal>;
}
function Modal({ title, onClose, children }) { return <div className="fixed inset-0 z-[100] grid min-h-dvh place-items-center overflow-hidden bg-black/55 p-3" role="dialog" aria-modal="true"><div className="my-auto max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-5 shadow-2xl dark:bg-gray-900 md:p-7"><div className="sticky top-0 z-10 -mx-5 -mt-5 mb-4 flex items-center justify-between border-b border-surface-variant bg-white/95 px-5 py-4 backdrop-blur dark:bg-gray-900/95 md:-mx-7 md:-mt-7 md:px-7"><h2 className="text-xl font-black text-primary dark:text-white">{title}</h2><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface hover:bg-red-50 hover:text-red-700" aria-label="Fechar visualização"><span className="material-symbols-outlined">close</span></button></div>{children}</div></div>; }
function Summary({ label, value }) { return <div><p className="text-xs font-black uppercase tracking-wider text-on-surface-variant">{label}</p><div className="whitespace-pre-wrap">{value || "Não informado"}</div></div>; }
function Items({ items }) { return <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2">Item</th><th>Qtd.</th><th>Unitário</th><th className="text-right">Subtotal</th></tr></thead><tbody>{(items || []).map((item, index) => <tr key={index} className="border-b"><td className="py-2"><strong>{item.description}</strong>{item.specification && <small className="block text-on-surface-variant">{item.specification}</small>}</td><td>{item.quantity} {item.unit}</td><td>{money(item.estimated_unit_price)}</td><td className="text-right">{money(Number(item.quantity) * Number(item.estimated_unit_price))}</td></tr>)}</tbody></table></div>; }

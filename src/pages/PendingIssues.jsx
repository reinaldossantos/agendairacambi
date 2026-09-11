import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { useState } from "react";
import { usePendingIssues } from "../context/PendingIssuesContext";
import { useCurrentUser } from "../context/CurrentUserContext";
import { supabase } from "../lib/supabaseClient";

function dateLabel(value, includeTime = false) {
  return value ? format(new Date(value), includeTime ? "dd/MM/yyyy 'as' HH:mm" : "dd/MM/yyyy", { locale: ptBR }) : "Data não informada";
}

export default function PendingIssues() {
  const { vehicleIssues, activityIssues, bonusIssues, count, loading, error, refresh } = usePendingIssues();
  const { currentUser } = useCurrentUser();
  const [resolution, setResolution] = useState(null);
  const [resolutionForm, setResolutionForm] = useState({ description: "", start_datetime: "", end_datetime: "", reason: "" });
  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const [selectedActivityIds, setSelectedActivityIds] = useState([]);
  const [batchStatus, setBatchStatus] = useState("Em andamento");

  function openResolution(activity, status) {
    const dueDate = activity.due_date || format(new Date(), "yyyy-MM-dd");
    setResolution({ activity, status });
    setResolutionForm({
      description: activity.description || "",
      start_datetime: toLocalInput(activity.start_datetime || `${dueDate}T08:00:00`),
      end_datetime: toLocalInput(activity.end_datetime || `${dueDate}T09:00:00`),
      reason: "",
    });
    setActionMessage({ type: "", text: "" });
  }

  async function resolveActivity(event) {
    event.preventDefault();
    const { activity, status } = resolution;
    if (status === "Cancelado" && resolutionForm.reason.trim().length < 3) return setActionMessage({ type: "error", text: "Informe a justificativa do cancelamento." });
    if (status === "Realizado" && !resolutionForm.description.trim()) return setActionMessage({ type: "error", text: "Informe a descrição para finalizar." });
    setSaving(true);
    const updates = status === "Cancelado" ? { status } : {
      status,
      description: resolutionForm.description.trim(),
      start_datetime: resolutionForm.start_datetime ? new Date(resolutionForm.start_datetime).toISOString() : null,
      end_datetime: resolutionForm.end_datetime ? new Date(resolutionForm.end_datetime).toISOString() : null,
    };
    const { error: updateError } = await supabase.from("activities").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", activity.id).eq("responsible_id", currentUser.id);
    if (updateError) { setSaving(false); return setActionMessage({ type: "error", text: `Não foi possível resolver a pendência: ${updateError.message}` }); }
    const reasonText = status === "Cancelado" ? ` Justificativa: ${resolutionForm.reason.trim()}` : "";
    const { error: logError } = await supabase.from("activity_logs").insert({ activity_id: activity.id, person_id: currentUser.id, type: "status_change", content: `Status alterado de "${activity.status}" para "${status}" pela Central de Pendências.${reasonText}`, metadata: { old_status: activity.status, new_status: status, reason: resolutionForm.reason.trim() || null } });
    setSaving(false);
    if (logError) setActionMessage({ type: "warning", text: `A atividade foi atualizada, mas houve falha ao registrar o histórico: ${logError.message}` });
    else setActionMessage({ type: "success", text: status === "Realizado" ? "Atividade finalizada e retirada das pendências." : "Atividade cancelada e retirada das pendências." });
    setResolution(null);
    await refresh();
  }

  async function updateBatch() {
    if (!selectedActivityIds.length) return;
    setSaving(true);
    const selected = activityIssues.filter((item) => selectedActivityIds.includes(item.id));
    const { error: updateError } = await supabase.from("activities").update({ status: batchStatus, updated_at: new Date().toISOString() }).in("id", selectedActivityIds).eq("responsible_id", currentUser.id);
    if (!updateError) await supabase.from("activity_logs").insert(selected.map((item) => ({ activity_id: item.id, person_id: currentUser.id, type: "status_change", content: `Status alterado de "${item.status}" para "${batchStatus}" em lote pela Central de Pendências.`, metadata: { old_status: item.status, new_status: batchStatus, batch: true } })));
    setSaving(false);
    if (updateError) return setActionMessage({ type: "error", text: `Não foi possível atualizar o lote: ${updateError.message}` });
    setSelectedActivityIds([]);
    setActionMessage({ type: "success", text: `${selected.length} atividade(s) atualizada(s) em lote.` });
    await refresh();
  }

  return <section className="mx-auto max-w-5xl space-y-5 px-2 sm:px-4">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary-light dark:text-green-300">Acompanhamento pessoal</p><h1 className="text-3xl font-black text-primary dark:text-white">Central de pendências</h1><p className="text-sm text-outline">Avisos do seu usuário que desaparecem automaticamente depois da regularização.</p></div><button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 font-bold text-primary dark:text-white"><span className="material-symbols-outlined">refresh</span>Atualizar</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    {actionMessage.text && <p role="status" className={`rounded-xl p-3 font-bold ${actionMessage.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>{actionMessage.text}</p>}
    {loading ? <p className="py-16 text-center text-outline">Verificando pendências...</p> : count === 0 ? <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center dark:border-emerald-800 dark:bg-emerald-950/20"><span className="material-symbols-outlined text-5xl text-emerald-600">task_alt</span><h2 className="mt-2 text-xl font-bold text-primary dark:text-white">Tudo em dia</h2><p className="text-outline">Não há pendências para o seu usuário.</p></div> : <>
      {vehicleIssues.length > 0 && <IssueSection title="Quilometragem de veículos" icon="directions_car" count={vehicleIssues.length}>
        {vehicleIssues.map((item) => <IssueCard key={item.id} tone="red" title={`${item.vehicle?.name || "Veículo"} · ${item.purpose}`} detail={`Retorno previsto em ${dateLabel(item.end_at, true)}${item.destination ? ` · ${item.destination}` : ""}`} reason="Informe o KM inicial e final para concluir este agendamento." link={`/vehicles?month=${format(new Date(item.start_at), "yyyy-MM")}&complete=${item.id}`} action="Informar quilometragem" />)}
      </IssueSection>}
      {activityIssues.length > 0 && <IssueSection title="Atividades" icon="assignment_late" count={activityIssues.length}>
        <div className="flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 sm:flex-row sm:items-end"><label className="flex-1 text-sm font-bold">Status para as selecionadas<select value={batchStatus} onChange={(event) => setBatchStatus(event.target.value)} className="mt-1 w-full rounded-xl border bg-white p-2.5"><option>Planejado</option><option>Em andamento</option><option>Pendente</option><option>Realizado</option></select></label><button type="button" disabled={!selectedActivityIds.length || saving} onClick={updateBatch} className="min-h-11 rounded-full bg-primary px-5 font-bold text-white disabled:opacity-40">Atualizar {selectedActivityIds.length || ""} em lote</button></div>
        {activityIssues.map((item) => <div key={item.id} className="relative"><label className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-lg bg-white/90 px-2 py-1 text-xs font-bold"><input type="checkbox" checked={selectedActivityIds.includes(item.id)} onChange={() => setSelectedActivityIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} className="h-5 w-5" />Selecionar</label><div className="pt-9"><ActivityIssueCard item={item} onResolve={openResolution} /></div></div>)}
      </IssueSection>}
      {bonusIssues.length > 0 && <IssueSection title="Bonificações para autorizar" icon="redeem" count={bonusIssues.length}>
        {bonusIssues.map((item) => <IssueCard key={item.id} tone="amber" title={`${item.product?.name || "Souvenir"} · ${item.quantity} unidade(s)`} detail={`Solicitado por ${item.requester?.name || "Usuário"} para ${item.recipient_name}`} reason="A bonificação aguarda autorização superior e ainda não alterou o estoque." link="/souvenirs" action="Analisar bonificação" />)}
      </IssueSection>}
    </>}
    {resolution && <ResolutionModal resolution={resolution} form={resolutionForm} setForm={setResolutionForm} message={actionMessage} saving={saving} onSubmit={resolveActivity} onClose={() => setResolution(null)} />}
  </section>;
}

function IssueSection({ title, icon, count, children }) {
  return <section className="rounded-2xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface sm:p-5"><div className="mb-4 flex items-center gap-3"><span className="material-symbols-outlined rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{icon}</span><h2 className="flex-1 text-xl font-bold text-primary dark:text-white">{title}</h2><span className="rounded-full bg-surface px-3 py-1 text-sm font-black dark:bg-gray-700">{count}</span></div><div className="space-y-3">{children}</div></section>;
}

function IssueCard({ tone, title, detail, reason, link, action }) {
  const colors = tone === "red" ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20";
  return <article className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${colors}`}><div className="flex-1"><h3 className="font-bold text-primary dark:text-white">{title}</h3><p className="mt-1 text-sm text-outline">{detail}</p><p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{reason}</p></div><Link to={link} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-white">{action}</Link></article>;
}

function ActivityIssueCard({ item, onResolve }) {
  const colors = item.overdue ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20";
  return <article className={`rounded-xl border p-4 ${colors}`}><div className="flex flex-col gap-3 sm:flex-row sm:items-center"><div className="flex-1"><h3 className="font-bold text-primary dark:text-white">{item.title}</h3><p className="mt-1 text-sm text-outline">{item.program?.name || "Programa não informado"} · prazo {dateLabel(`${item.due_date}T12:00:00`)}</p><p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{[item.overdue && "Atividade atrasada", item.stale && "Sem mudança de status há mais de 7 dias"].filter(Boolean).join(" · ")}</p></div><Link to={`/activity/${item.id}`} className="rounded-full border border-primary px-4 py-2.5 text-center text-sm font-bold text-primary dark:text-white">Abrir atividade</Link></div><div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-red-200 pt-3 dark:border-red-900"><button type="button" onClick={() => onResolve(item, "Cancelado")} className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700 hover:bg-red-200">Cancelar atividade</button><button type="button" onClick={() => onResolve(item, "Realizado")} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Finalizar atividade</button></div></article>;
}

function ResolutionModal({ resolution, form, setForm, message, saving, onSubmit, onClose }) {
  const finishing = resolution.status === "Realizado";
  return <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-labelledby="resolution-title" className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-dark-surface"><div className="mb-5 flex justify-between gap-3"><div><h2 id="resolution-title" className="text-2xl font-black text-primary dark:text-white">{finishing ? "Finalizar atividade" : "Cancelar atividade"}</h2><p className="mt-1 text-sm text-outline">{resolution.activity.title}</p></div><button type="button" onClick={onClose} aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div>{message.text && message.type !== "success" && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{message.text}</p>}<form onSubmit={onSubmit} className="space-y-4">{finishing ? <><label><span className="mb-1 block text-sm font-bold">Descrição/resultado *</span><textarea required rows="4" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="w-full rounded-xl border border-surface-variant bg-surface p-3 dark:bg-gray-800" /></label><div className="grid gap-3 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-bold">Início *</span><input required type="datetime-local" value={form.start_datetime} onChange={(event) => setForm({ ...form, start_datetime: event.target.value })} className="w-full rounded-xl border border-surface-variant bg-surface p-3 dark:bg-gray-800" /></label><label><span className="mb-1 block text-sm font-bold">Finalização *</span><input required type="datetime-local" value={form.end_datetime} onChange={(event) => setForm({ ...form, end_datetime: event.target.value })} className="w-full rounded-xl border border-surface-variant bg-surface p-3 dark:bg-gray-800" /></label></div></> : <label><span className="mb-1 block text-sm font-bold">Justificativa do cancelamento *</span><textarea required minLength="3" rows="4" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="w-full rounded-xl border border-surface-variant bg-surface p-3 dark:bg-gray-800" placeholder="Explique por que esta atividade está sendo cancelada." /></label>}<div className="flex justify-end gap-2 border-t pt-4"><button type="button" onClick={onClose} className="rounded-full px-5 py-2.5 font-bold">Voltar</button><button disabled={saving} className={`rounded-full px-6 py-2.5 font-black text-white disabled:opacity-50 ${finishing ? "bg-emerald-600" : "bg-red-600"}`}>{saving ? "Salvando..." : finishing ? "Confirmar finalização" : "Confirmar cancelamento"}</button></div></form></div></div>;
}

function toLocalInput(value) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

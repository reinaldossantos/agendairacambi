import { useCallback, useEffect, useState } from "react";
import { endOfMonth, format, parseISO, startOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { generateMonthlyReportPDF } from "../lib/monthlyReportPdf";
import { signFiles, signedUrl, storagePath } from "../lib/privateStorage";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PrivateStorageImage from "../components/ui/PrivateStorageImage";

const inputClass = "w-full rounded-xl border border-surface-variant bg-surface px-3 py-2.5 text-on-surface focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white";
const blankIndicator = () => ({ name: "", value: "", unit: "", comparison: "", note: "" });
const statusLabel = { draft: "Rascunho", submitted: "Finalizado", approved: "Aprovado" };
const monthLabel = (value) => value ? format(parseISO(value), "MMMM 'de' yyyy", { locale: ptBR }) : "—";
const dateLabel = (value) => value ? format(parseISO(value), "dd/MM/yyyy") : "—";
const activityHours = (start, end) => {
  if (!start || !end) return 0;
  const milliseconds = new Date(end).getTime() - new Date(start).getTime();
  return milliseconds > 0 ? milliseconds / 3600000 : 0;
};
const hoursLabel = (hours) => `${Number(hours || 0).toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })} h`;
const stableImage = (image) => storagePath(image, "activity-attachments") || (typeof image === "string" ? image : image?.url || "");
const stableFile = (file) => {
  const path = storagePath(file, "activity-files");
  const externalUrl = !path ? (typeof file === "string" ? file : file?.url || "") : "";
  return { ...(typeof file === "object" ? file : {}), name: file?.name || path.split("/").pop(), path, url: externalUrl };
};
const persistableActivity = (activity) => ({
  ...activity,
  images: (activity.images || []).map(stableImage).filter(Boolean),
  selected_images: (activity.selected_images || activity.images || []).map(stableImage).filter(Boolean),
  files: (activity.files || []).map(stableFile),
});
async function viewableActivity(activity) {
  const persisted = persistableActivity(activity);
  const imagePaths = [...new Set([...(persisted.images || []), ...(persisted.selected_images || [])])];
  const signedEntries = await Promise.all(imagePaths.map(async (path) => [path, await signedUrl("activity-attachments", path)]));
  const signed = new Map(signedEntries);
  return {
    ...persisted,
    images: persisted.images.map((path) => signed.get(path) || path),
    selected_images: persisted.selected_images.map((path) => signed.get(path) || path),
    files: await signFiles(persisted.files || []),
  };
}

export default function MonthlyActivityReports() {
  const { currentUser, persons } = useCurrentUser();
  const [reports, setReports] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [mode, setMode] = useState("list");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [generation, setGeneration] = useState({ report_type: "individual", reference_month: format(subMonths(new Date(), 1), "yyyy-MM"), program_id: "", person_id: currentUser?.id || "" });
  const [form, setForm] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [regenerateTarget, setRegenerateTarget] = useState(null);
  const [replaceTarget, setReplaceTarget] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [reportResult, programResult] = await Promise.all([
      supabase.from("monthly_activity_reports").select("*").order("reference_month", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("programs").select("id,name,leader_id").order("name"),
    ]);
    if (reportResult.error) setMessage({ type: "error", text: reportResult.error.message });
    setReports(reportResult.data || []);
    setPrograms(programResult.data || []);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadData, 0); return () => window.clearTimeout(timer); }, [loadData]);

  const selectedProgram = programs.find((item) => item.id === generation.program_id);
  const selectedPerson = persons.find((item) => item.id === generation.person_id);

  async function generateDraft(skipExistingCheck = false) {
    if (!selectedProgram || !selectedPerson) {
      setMessage({ type: "error", text: "Selecione o programa e o responsável pelo relatório." });
      return;
    }
    setSaving(true);
    const reference = `${generation.reference_month}-01`;
    if (!skipExistingCheck) {
      const { data: existingReport, error: existingError } = await supabase.from("monthly_activity_reports")
        .select("id,report_type,reference_month,program_id,program_name,person_id,responsible_name,status")
        .eq("report_type", generation.report_type)
        .eq("reference_month", reference)
        .eq("program_id", generation.program_id)
        .eq("person_id", generation.person_id)
        .maybeSingle();
      if (existingError) {
        setSaving(false);
        setMessage({ type: "error", text: `Não foi possível verificar os relatórios existentes: ${existingError.message}` });
        return;
      }
      if (existingReport) {
        setSaving(false);
        setReplaceTarget(existingReport);
        return;
      }
    }
    const start = format(startOfMonth(parseISO(reference)), "yyyy-MM-dd");
    const end = format(endOfMonth(parseISO(reference)), "yyyy-MM-dd");
    let query = supabase.from("activities")
      .select("*, responsible:responsible_id(id,name), program:program_id(id,name)")
      .eq("program_id", generation.program_id).gte("due_date", start).lte("due_date", end).order("due_date");
    if (generation.report_type === "individual") {
      query = query.or(`responsible_id.eq.${generation.person_id},created_by.eq.${generation.person_id},involved_ids.cs.{${generation.person_id}}`);
    }
    const { data, error } = await query;
    setSaving(false);
    if (error) return setMessage({ type: "error", text: `Não foi possível consultar as atividades: ${error.message}` });
    const activities = await Promise.all((data || []).map((activity) => viewableActivity({
      id: activity.id, included: true, date: activity.due_date, title: activity.title,
      category: "", objective: activity.description || "", result: activity.status === "Realizado" ? "Atividade realizada" : activity.status || "",
      observation: "", status: activity.status, responsible_name: activity.responsible?.name || "",
      start_datetime: activity.start_datetime || "", end_datetime: activity.end_datetime || "",
      hours: activityHours(activity.start_datetime, activity.end_datetime),
      involved_ids: activity.involved_ids || [], images: activity.images || [], selected_images: activity.images || [], files: activity.files || [],
    })));
    const involvedIds = [...new Set(activities.flatMap((item) => item.involved_ids || []))];
    const team = persons.filter((person) => involvedIds.includes(person.id) || activities.some((item) => item.responsible_name === person.name)).map((person) => person.name);
    const responsible = selectedPerson || currentUser;
    const realized = activities.filter((item) => item.status === "Realizado").length;
    const cancelled = activities.filter((item) => item.status === "Cancelado").length;
    const totalHours = activities.reduce((sum, item) => sum + item.hours, 0);
    setForm({
      report_type: generation.report_type, reference_month: reference, program_id: selectedProgram.id, program_name: selectedProgram.name,
      person_id: responsible?.id || null, responsible_name: responsible?.name || "Coordenação do programa", team_names: team,
      status: "draft", executive_summary: "", highlights: "", challenges: "", next_month_plan: "", activity_snapshot: activities,
      indicators: [
        { name: "Atividades registradas", value: String(activities.length), unit: "atividades", comparison: "", note: "Calculado automaticamente" },
        { name: "Atividades realizadas", value: String(realized), unit: "atividades", comparison: activities.length ? `${Math.round((realized / activities.length) * 100)}% do total` : "0%", note: "Calculado automaticamente" },
        { name: "Atividades canceladas", value: String(cancelled), unit: "atividades", comparison: "", note: "Calculado automaticamente" },
        { name: "Carga horária registrada", value: totalHours.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }), unit: "horas", comparison: "", note: "Soma do início à finalização das atividades" },
        { name: "Evidências anexadas", value: String(activities.reduce((sum, item) => sum + item.images.length + item.files.length, 0)), unit: "arquivos/imagens", comparison: "", note: "Calculado automaticamente" },
      ],
    });
    setMode("form");
    setMessage({ type: activities.length ? "success" : "info", text: activities.length ? `${activities.length} atividade(s) encontrada(s). Revise o rascunho antes de finalizar.` : "Nenhuma atividade encontrada. O relatório poderá ser preenchido manualmente." });
  }

  async function replaceExistingReport() {
    if (!replaceTarget || saving) return;
    setSaving(true);
    const target = replaceTarget;
    const { data, error } = await supabase.from("monthly_activity_reports").delete().eq("id", target.id).select("id");
    if (error || !data?.length) {
      setSaving(false);
      setReplaceTarget(null);
      setMessage({ type: "error", text: error ? `Não foi possível excluir o relatório anterior: ${error.message}` : "O relatório anterior não foi excluído porque o banco não autorizou a operação." });
      return;
    }
    setReplaceTarget(null);
    setReports((current) => current.filter((report) => report.id !== target.id));
    await generateDraft(true);
  }

  async function openReport(report) {
    setSaving(true);
    const activitySnapshot = await Promise.all((report.activity_snapshot || []).map(viewableActivity));
    setForm({ ...report, activity_snapshot: activitySnapshot, indicators: report.indicators || [] });
    setSaving(false); setMode("form"); setMessage({ type: "", text: "" });
  }
  function updateActivity(index, field, value) { setForm((current) => ({ ...current, activity_snapshot: current.activity_snapshot.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) })); }
  function updateIndicator(index, field, value) { setForm((current) => ({ ...current, indicators: current.indicators.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item) })); }

  async function downloadPdf(report) {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      await new Promise((resolve) => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      await generateMonthlyReportPDF(report);
    } catch (pdfError) {
      setMessage({ type: "error", text: `Não foi possível gerar o PDF: ${pdfError?.message || "erro inesperado"}.` });
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function saveReport(finalize = false) {
    setSaving(true);
    const payload = { ...form, activity_snapshot: (form.activity_snapshot || []).map(persistableActivity), status: finalize ? "submitted" : form.status, submitted_at: finalize ? new Date().toISOString() : form.submitted_at || null };
    delete payload.id; delete payload.report_number; delete payload.created_at; delete payload.updated_at; delete payload.approved_at; delete payload.approved_by;
    const result = form.id
      ? await supabase.from("monthly_activity_reports").update(payload).eq("id", form.id).select().single()
      : await supabase.from("monthly_activity_reports").insert(payload).select().single();
    setSaving(false);
    if (result.error) return setMessage({ type: "error", text: `Não foi possível salvar: ${result.error.message}` });
    setMessage({ type: "success", text: finalize ? "Relatório finalizado e preservado no histórico." : "Rascunho salvo com sucesso." });
    if (finalize) {
      await loadData();
      setMode("list");
      return;
    }
    setForm({ ...result.data, activity_snapshot: await Promise.all((result.data.activity_snapshot || []).map(viewableActivity)) });
    loadData();
  }

  async function deleteReport() {
    if (!deleteTarget) return;
    const reportName = `${deleteTarget.program_name} — ${monthLabel(deleteTarget.reference_month)}`;
    const { data, error } = await supabase.from("monthly_activity_reports").delete().eq("id", deleteTarget.id).select("id");
    setDeleteTarget(null);
    if (error) {
      setMessage({ type: "error", text: `Não foi possível excluir “${reportName}”: ${error.message}` });
      return;
    }
    if (!data?.length) {
      setMessage({ type: "error", text: `“${reportName}” não foi excluído. O banco não autorizou a operação.` });
      return;
    }
    setMessage({ type: "success", text: `Relatório “${reportName}” excluído com sucesso.` });
    loadData();
  }

  async function regenerateReport() {
    if (!regenerateTarget || saving) return;
    setSaving(true);
    const start = format(startOfMonth(parseISO(regenerateTarget.reference_month)), "yyyy-MM-dd");
    const end = format(endOfMonth(parseISO(regenerateTarget.reference_month)), "yyyy-MM-dd");
    let query = supabase.from("activities")
      .select("*, responsible:responsible_id(id,name)")
      .eq("program_id", regenerateTarget.program_id).gte("due_date", start).lte("due_date", end).order("due_date");
    if (regenerateTarget.report_type === "individual" && regenerateTarget.person_id) {
      query = query.or(`responsible_id.eq.${regenerateTarget.person_id},created_by.eq.${regenerateTarget.person_id},involved_ids.cs.{${regenerateTarget.person_id}}`);
    }
    const activityResult = await query;
    if (activityResult.error) {
      setSaving(false);
      setRegenerateTarget(null);
      setMessage({ type: "error", text: `O rascunho não foi alterado porque não foi possível consultar a agenda: ${activityResult.error.message}` });
      return;
    }
    const activities = await Promise.all((activityResult.data || []).map((activity) => viewableActivity({
      id: activity.id, included: true, date: activity.due_date, title: activity.title, category: "",
      objective: activity.description || "", result: activity.status === "Realizado" ? "Atividade realizada" : activity.status || "",
      observation: "", status: activity.status, responsible_name: activity.responsible?.name || "",
      start_datetime: activity.start_datetime || "", end_datetime: activity.end_datetime || "",
      hours: activityHours(activity.start_datetime, activity.end_datetime),
      involved_ids: activity.involved_ids || [], images: activity.images || [], selected_images: activity.images || [], files: activity.files || [],
    })));
    const realized = activities.filter((item) => item.status === "Realizado").length;
    const cancelled = activities.filter((item) => item.status === "Cancelado").length;
    const totalHours = activities.reduce((sum, item) => sum + item.hours, 0);
    const involvedIds = [...new Set(activities.flatMap((item) => item.involved_ids || []))];
    const teamNames = persons.filter((person) => involvedIds.includes(person.id) || activities.some((item) => item.responsible_name === person.name)).map((person) => person.name);
    const indicators = [
      { name: "Atividades registradas", value: String(activities.length), unit: "atividades", comparison: "", note: "Calculado automaticamente" },
      { name: "Atividades realizadas", value: String(realized), unit: "atividades", comparison: activities.length ? `${Math.round((realized / activities.length) * 100)}% do total` : "0%", note: "Calculado automaticamente" },
      { name: "Atividades canceladas", value: String(cancelled), unit: "atividades", comparison: "", note: "Calculado automaticamente" },
      { name: "Carga horária registrada", value: totalHours.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 }), unit: "horas", comparison: "", note: "Soma do início à finalização das atividades" },
      { name: "Evidências anexadas", value: String(activities.reduce((sum, item) => sum + item.images.length + item.files.length, 0)), unit: "arquivos/imagens", comparison: "", note: "Calculado automaticamente" },
    ];
    const { data, error } = await supabase.from("monthly_activity_reports").update({
      activity_snapshot: activities.map(persistableActivity), indicators, team_names: teamNames,
      executive_summary: "", highlights: "", challenges: "", next_month_plan: "",
    }).eq("id", regenerateTarget.id).eq("status", "draft").select().single();
    setSaving(false);
    setRegenerateTarget(null);
    if (error) {
      setMessage({ type: "error", text: `Não foi possível substituir o rascunho: ${error.message}` });
      return;
    }
    setMessage({ type: "success", text: `Relatório regerado com ${activities.length} atividade(s) atualizada(s) da agenda.` });
    setForm({ ...data, activity_snapshot: await Promise.all((data.activity_snapshot || []).map(viewableActivity)) });
    setMode("form");
    loadData();
  }

  if (mode === "form" && form) return <ReportEditor form={form} setForm={setForm} updateActivity={updateActivity} updateIndicator={updateIndicator} saving={saving} generatingPdf={generatingPdf} message={message} onBack={() => { setMode("list"); loadData(); }} onSave={() => saveReport(false)} onFinalize={() => saveReport(true)} onPdf={() => downloadPdf(form)} />;

  return <div className="mx-auto max-w-6xl px-2 sm:px-4">
    <div className="mb-6"><p className="text-sm font-medium text-primary-light dark:text-green-300">Resultados e rastreabilidade</p><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Relatórios mensais de atividades</h2><p className="text-sm text-outline">Gere o relatório do mês anterior usando as atividades registradas na agenda.</p></div>
    {message.text && <Alert message={message} />}
    {generatingPdf && <PdfGenerationNotice />}
    <section className="mb-7 rounded-xl border border-surface-variant bg-white p-5 dark:border-gray-700 dark:bg-dark-surface">
      <h3 className="mb-4 font-bold text-primary dark:text-white">Gerar novo relatório</h3>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Tipo"><select className={inputClass} value={generation.report_type} onChange={(event) => setGeneration({ ...generation, report_type: event.target.value })}><option value="individual">Individual</option><option value="program">Consolidado do programa</option></select></Field>
        <Field label="Mês de referência"><MonthYearPicker value={generation.reference_month} onChange={(reference_month) => setGeneration({ ...generation, reference_month })} /></Field>
        <Field label="Programa"><select className={inputClass} value={generation.program_id} onChange={(event) => { const program = programs.find((item) => item.id === event.target.value); setGeneration({ ...generation, program_id: event.target.value, person_id: program?.leader_id || "" }); }}><option value="">Selecione</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Field>
        <Field label="Responsável"><select className={inputClass} value={generation.person_id} onChange={(event) => setGeneration({ ...generation, person_id: event.target.value })}><option value="">{generation.program_id ? "Coordenador não cadastrado — selecione" : "Selecione primeiro o programa"}</option>{persons.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select>{selectedProgram?.leader_id && selectedPerson && <span className="mt-1 block text-xs text-green-700 dark:text-green-300">Coordenador do programa selecionado automaticamente.</span>}</Field>
      </div>
      <button disabled={saving} onClick={() => generateDraft()} className="mt-4 flex items-center gap-2 rounded-full bg-[#ffd12f] px-5 py-3 font-bold text-primary transition hover:scale-[1.02] disabled:opacity-50"><span className="material-symbols-outlined">auto_awesome</span>{saving ? "Consultando atividades..." : "Gerar rascunho automático"}</button>
    </section>
    <section><h3 className="mb-3 font-bold text-primary dark:text-white">Relatórios disponíveis</h3>{loading ? <p className="py-10 text-center text-outline">Carregando...</p> : reports.length === 0 ? <p className="rounded-xl border border-dashed p-10 text-center text-outline">Nenhum relatório mensal cadastrado.</p> : <div className="grid gap-3 md:grid-cols-2">{reports.map((report) => <article key={report.id} className="rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold uppercase text-primary-light">{report.report_type === "program" ? "Consolidado" : "Individual"}</p><h4 className="font-bold text-primary dark:text-white">{report.program_name}</h4><p className="text-sm text-outline">{monthLabel(report.reference_month)} · {report.responsible_name}</p></div><span className="h-fit rounded-full bg-surface px-2 py-1 text-xs font-bold dark:bg-gray-700">{statusLabel[report.status]}</span></div><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => openReport(report)} className="rounded-full border border-primary px-3 py-2 text-sm font-bold text-primary dark:text-white">{report.status === "draft" ? "Continuar" : "Visualizar"}</button><button disabled={generatingPdf} onClick={() => downloadPdf(report)} className="rounded-full bg-red-100 px-3 py-2 text-sm font-bold text-red-700 disabled:cursor-wait disabled:opacity-60"><span className={`material-symbols-outlined align-middle text-[18px] ${generatingPdf ? "animate-spin" : ""}`}>{generatingPdf ? "progress_activity" : "picture_as_pdf"}</span> {generatingPdf ? "Gerando…" : "PDF"}</button>{report.status === "draft" && <button onClick={() => setRegenerateTarget(report)} className="rounded-full bg-blue-50 px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300" title="Substituir pelas informações atuais da agenda"><span className="material-symbols-outlined align-middle text-[18px]">sync</span> Excluir e regerar</button>}<button onClick={() => setDeleteTarget(report)} className="rounded-full bg-red-50 px-3 py-2 text-sm font-bold text-red-700 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-300" title="Excluir relatório definitivamente"><span className="material-symbols-outlined align-middle text-[18px]">delete</span> Excluir</button></div></article>)}</div>}</section>
    <ConfirmDialog isOpen={!!deleteTarget} title="Excluir relatório mensal" message={deleteTarget ? `Deseja excluir definitivamente o relatório ${statusLabel[deleteTarget.status]?.toLowerCase()} de ${deleteTarget.program_name}, referente a ${monthLabel(deleteTarget.reference_month)}? Esta ação apagará o documento do histórico e não poderá ser desfeita.` : ""} confirmText="Sim, excluir definitivamente" onConfirm={deleteReport} onCancel={() => setDeleteTarget(null)} />
    <ConfirmDialog isOpen={!!regenerateTarget} title="Excluir conteúdo e regerar" message={regenerateTarget ? `Deseja substituir o rascunho de ${regenerateTarget.program_name}, referente a ${monthLabel(regenerateTarget.reference_month)}, pelas informações atuais da agenda? Complementos manuais e indicadores personalizados deste rascunho serão apagados.` : ""} confirmText={saving ? "Regerando..." : "Sim, excluir e regerar"} onConfirm={regenerateReport} onCancel={() => setRegenerateTarget(null)} />
    <ConfirmDialog isOpen={!!replaceTarget} title="Relatório mensal já existente" message={replaceTarget ? `Já existe um relatório ${statusLabel[replaceTarget.status]?.toLowerCase()} de ${replaceTarget.program_name}, referente a ${monthLabel(replaceTarget.reference_month)}, para ${replaceTarget.responsible_name}. Deseja excluir o relatório anterior e gerar um novo para o mesmo mês? Esta ação não poderá ser desfeita.` : ""} confirmText={saving ? "Excluindo..." : "Sim, excluir e gerar novo"} onConfirm={replaceExistingReport} onCancel={() => setReplaceTarget(null)} />
  </div>;
}

function ReportEditor({ form, setForm, updateActivity, updateIndicator, saving, generatingPdf, message, onBack, onSave, onFinalize, onPdf }) {
  const editable = form.status === "draft";
  const included = form.activity_snapshot.filter((item) => item.included !== false).length;
  return <div className="mx-auto max-w-6xl px-2 sm:px-4">{generatingPdf && <PdfGenerationNotice />}<button onClick={onBack} className="mb-2 text-sm font-bold text-primary dark:text-green-300">← Voltar aos relatórios</button><div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><h2 className="text-headline-lg font-semibold text-primary dark:text-white">{form.program_name}</h2><p className="text-outline">{monthLabel(form.reference_month)} · {form.responsible_name} · {included} atividade(s) selecionada(s)</p></div><span className="h-fit rounded-full bg-surface px-3 py-2 text-sm font-bold dark:bg-gray-700">{statusLabel[form.status]}</span></div>{message.text && <Alert message={message} />}
    <div className="space-y-5"><Section title="Síntese"><div className="grid gap-4 md:grid-cols-2"><Field label="Resumo executivo"><textarea disabled={!editable} rows="5" className={inputClass} value={form.executive_summary || ""} onChange={(event) => setForm({ ...form, executive_summary: event.target.value })} placeholder="Resuma os principais resultados e entregas do mês." /></Field><Field label="Equipe envolvida"><textarea disabled={!editable} rows="5" className={inputClass} value={(form.team_names || []).join(", ")} onChange={(event) => setForm({ ...form, team_names: event.target.value.split(",").map((name) => name.trim()).filter(Boolean) })} placeholder="Nomes separados por vírgula" /></Field></div></Section>
      <Section title="Atividades importadas da agenda"><div className="space-y-3">{form.activity_snapshot.map((activity, index) => <article key={activity.id || index} className={`rounded-xl border p-4 ${activity.included !== false ? "border-green-200 bg-green-50/40 dark:border-green-900 dark:bg-green-900/10" : "border-surface-variant opacity-60 dark:border-gray-700"}`}><div className="mb-3 flex items-start gap-3"><input disabled={!editable} type="checkbox" className="mt-1 rounded text-primary" checked={activity.included !== false} onChange={(event) => updateActivity(index, "included", event.target.checked)} /><div className="flex-1"><strong className="text-primary dark:text-white">{activity.title}</strong><p className="text-xs text-outline">{activity.date} · {activity.responsible_name} · {activity.status} · {hoursLabel(activity.hours)} · {(activity.images?.length || 0) + (activity.files?.length || 0)} evidência(s)</p></div></div>{activity.included !== false && <><div className="grid gap-3 md:grid-cols-2"><Field label="Categoria/eixo"><input disabled={!editable} className={inputClass} value={activity.category || ""} onChange={(event) => updateActivity(index, "category", event.target.value)} placeholder="Ex.: Gestão, Comunicação, Educação" /></Field><Field label="Objetivo"><textarea disabled={!editable} rows="2" className={inputClass} value={activity.objective || ""} onChange={(event) => updateActivity(index, "objective", event.target.value)} /></Field><Field label="Resultado alcançado"><textarea disabled={!editable} rows="2" className={inputClass} value={activity.result || ""} onChange={(event) => updateActivity(index, "result", event.target.value)} placeholder="Descreva o resultado efetivo." /></Field><Field label="Observações"><textarea disabled={!editable} rows="2" className={inputClass} value={activity.observation || ""} onChange={(event) => updateActivity(index, "observation", event.target.value)} /></Field></div><EvidenceGallery activity={activity} editable={editable} onSelectedImagesChange={(selectedImages) => updateActivity(index, "selected_images", selectedImages)} /></>}</article>)}{!form.activity_snapshot.length && <p className="py-6 text-center text-outline">Nenhuma atividade importada.</p>}</div></Section>
      <Section title="Indicadores"><div className="space-y-3">{form.indicators.map((indicator, index) => <div key={index} className="grid gap-2 rounded-xl border border-surface-variant p-3 md:grid-cols-[1.5fr_.7fr_.8fr_1fr_1.5fr_auto] dark:border-gray-700"><input disabled={!editable} aria-label="Indicador" className={inputClass} value={indicator.name} onChange={(event) => updateIndicator(index, "name", event.target.value)} placeholder="Indicador" /><input disabled={!editable} aria-label="Resultado" className={inputClass} value={indicator.value} onChange={(event) => updateIndicator(index, "value", event.target.value)} placeholder="Resultado" /><input disabled={!editable} aria-label="Unidade" className={inputClass} value={indicator.unit} onChange={(event) => updateIndicator(index, "unit", event.target.value)} placeholder="Unidade" /><input disabled={!editable} aria-label="Comparação" className={inputClass} value={indicator.comparison} onChange={(event) => updateIndicator(index, "comparison", event.target.value)} placeholder="Meta/comparação" /><input disabled={!editable} aria-label="Observação" className={inputClass} value={indicator.note} onChange={(event) => updateIndicator(index, "note", event.target.value)} placeholder="Observação" />{editable && <button onClick={() => setForm({ ...form, indicators: form.indicators.filter((_, itemIndex) => itemIndex !== index) })} className="p-2 text-red-600" aria-label="Remover indicador"><span className="material-symbols-outlined">delete</span></button>}</div>)}</div>{editable && <button onClick={() => setForm({ ...form, indicators: [...form.indicators, blankIndicator()] })} className="mt-3 rounded-full border border-primary px-4 py-2 text-sm font-bold text-primary dark:text-white"><span className="material-symbols-outlined align-middle text-[18px]">add</span> Indicador</button>}</Section>
      <Section title="Análise e próximos passos"><div className="grid gap-4 md:grid-cols-3"><Field label="Destaques do mês"><textarea disabled={!editable} rows="5" className={inputClass} value={form.highlights || ""} onChange={(event) => setForm({ ...form, highlights: event.target.value })} /></Field><Field label="Dificuldades e pendências"><textarea disabled={!editable} rows="5" className={inputClass} value={form.challenges || ""} onChange={(event) => setForm({ ...form, challenges: event.target.value })} /></Field><Field label="Planejamento do próximo mês"><textarea disabled={!editable} rows="5" className={inputClass} value={form.next_month_plan || ""} onChange={(event) => setForm({ ...form, next_month_plan: event.target.value })} /></Field></div></Section>
    </div><div className="sticky bottom-3 mt-5 flex flex-wrap justify-end gap-2 rounded-xl border border-surface-variant bg-white/95 p-3 shadow-lg backdrop-blur dark:border-gray-700 dark:bg-dark-surface/95">{editable && <><button disabled={saving} onClick={onSave} className="rounded-full border border-primary px-5 py-2.5 font-bold text-primary dark:text-white">Salvar rascunho</button><button disabled={saving} onClick={onFinalize} className="rounded-full bg-primary px-5 py-2.5 font-bold text-white">Finalizar relatório</button></>}<button disabled={generatingPdf} onClick={onPdf} className="rounded-full bg-red-100 px-5 py-2.5 font-bold text-red-700 disabled:cursor-wait disabled:opacity-60"><span className={`material-symbols-outlined align-middle text-[18px] ${generatingPdf ? "animate-spin" : ""}`}>{generatingPdf ? "progress_activity" : "picture_as_pdf"}</span> {generatingPdf ? "Gerando…" : "PDF"}</button></div>
  </div>;
}

function Section({ title, children }) { return <section className="rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface"><h3 className="mb-4 font-bold text-primary dark:text-white">{title}</h3>{children}</section>; }
function Field({ label, children }) { return <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-outline">{label}</span>{children}</label>; }
function Alert({ message }) { return <div className={`mb-5 rounded-xl border p-4 text-sm font-medium ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700" : message.type === "success" ? "border-green-200 bg-green-50 text-green-700" : "border-blue-200 bg-blue-50 text-blue-700"}`}>{message.text}</div>; }
function PdfGenerationNotice() { return <div role="status" aria-live="polite" className="fixed bottom-20 right-4 z-[1000] flex items-center gap-3 rounded-xl border border-blue-200 bg-white/95 px-4 py-3 text-sm font-medium text-primary shadow-xl backdrop-blur dark:border-blue-900 dark:bg-dark-surface/95 dark:text-white md:bottom-5"><span className="material-symbols-outlined animate-spin text-blue-600">progress_activity</span><span>Gerando PDF… Aguarde um instante.</span></div>; }

function EvidenceGallery({ activity, editable, onSelectedImagesChange }) {
  const images = activity.images || [];
  const files = activity.files || [];
  const selectedImages = activity.selected_images || images;
  const toggleImage = (url) => onSelectedImagesChange(selectedImages.includes(url) ? selectedImages.filter((item) => item !== url) : [...selectedImages, url]);
  if (!images.length && !files.length) return null;
  return <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-3 dark:border-blue-900 dark:bg-blue-900/10"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h4 className="text-sm font-bold text-primary dark:text-white">Evidências da atividade · {dateLabel(activity.date)}</h4><p className="text-xs text-outline">{selectedImages.length} de {images.length} foto(s) selecionada(s) para o PDF · {files.length} arquivo(s)</p></div></div>{images.length > 0 && <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">{images.map((url, imageIndex) => { const selected = selectedImages.includes(url); return <div key={`${url}-${imageIndex}`} className={`relative overflow-hidden rounded-lg border-2 ${selected ? "border-primary" : "border-transparent opacity-60"}`}><PrivateStorageImage bucket="activity-attachments" source={url} alt={`Evidência ${imageIndex + 1}`} className="h-28 w-full object-cover" link />{editable && <button type="button" onClick={() => toggleImage(url)} className={`absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full shadow ${selected ? "bg-primary text-white" : "bg-white text-gray-600"}`} aria-label={selected ? "Retirar foto do PDF" : "Incluir foto no PDF"}><span className="material-symbols-outlined icon-plain text-[18px]">{selected ? "check" : "add"}</span></button>}<span className="absolute bottom-1 left-1 rounded bg-black/65 px-1.5 py-0.5 text-[10px] text-white">{selected ? "No PDF" : "Fora do PDF"}</span></div>; })}</div>}{files.length > 0 && <div className="flex flex-wrap gap-2">{files.map((file, fileIndex) => file.url ? <a key={`${file.url}-${fileIndex}`} href={file.url} target="_blank" rel="noreferrer" title="Abrir evidência anexada" className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-primary shadow-sm hover:underline dark:bg-gray-800 dark:text-green-300"><span className="material-symbols-outlined text-[17px]">description</span><span className="truncate">{file.name || file.url.split("/").pop() || `Arquivo ${fileIndex + 1}`}</span></a> : <span key={`file-${fileIndex}`} className="inline-flex max-w-full items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-outline shadow-sm dark:bg-gray-800"><span className="material-symbols-outlined text-[17px]">description</span><span className="truncate">{file.name || `Arquivo ${fileIndex + 1}`}</span></span>)}</div>}</div>;
}

const monthOptions = Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1).padStart(2, "0"), label: format(new Date(2026, index, 1), "MMMM", { locale: ptBR }) }));

function MonthYearPicker({ value, onChange }) {
  const [year, month] = value.split("-");
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 8 }, (_, index) => String(currentYear + 1 - index));
  const moveMonth = (offset) => onChange(format(new Date(Number(year), Number(month) - 1 + offset, 1), "yyyy-MM"));
  return <div className="flex items-center gap-2 rounded-xl border border-surface-variant bg-surface p-1.5 dark:border-gray-700 dark:bg-gray-800">
    <button type="button" onClick={() => moveMonth(-1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30" aria-label="Mês anterior"><span className="material-symbols-outlined icon-plain">chevron_left</span></button>
    <select aria-label="Mês" value={month} onChange={(event) => onChange(`${year}-${event.target.value}`)} className="min-w-0 flex-1 rounded-lg border-0 bg-white py-2 pl-3 pr-7 capitalize text-sm font-bold text-primary focus:ring-primary dark:bg-gray-700 dark:text-white">{monthOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
    <select aria-label="Ano" value={year} onChange={(event) => onChange(`${event.target.value}-${month}`)} className="w-[4.5rem] shrink-0 rounded-lg border-0 bg-white py-2 pl-2 pr-5 text-sm font-bold text-primary focus:ring-primary dark:bg-gray-700 dark:text-white">{years.map((option) => <option key={option}>{option}</option>)}</select>
    <button type="button" onClick={() => moveMonth(1)} className="flex h-9 w-9 items-center justify-center rounded-lg text-primary hover:bg-green-100 dark:text-green-300 dark:hover:bg-green-900/30" aria-label="Próximo mês"><span className="material-symbols-outlined icon-plain">chevron_right</span></button>
  </div>;
}

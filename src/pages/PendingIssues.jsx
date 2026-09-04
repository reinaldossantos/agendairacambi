import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { usePendingIssues } from "../context/PendingIssuesContext";

function dateLabel(value, includeTime = false) {
  return value ? format(new Date(value), includeTime ? "dd/MM/yyyy 'as' HH:mm" : "dd/MM/yyyy", { locale: ptBR }) : "Data não informada";
}

export default function PendingIssues() {
  const { vehicleIssues, activityIssues, count, loading, error, refresh } = usePendingIssues();
  return <section className="mx-auto max-w-5xl space-y-5 px-2 sm:px-4">
    <header className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary-light dark:text-green-300">Acompanhamento pessoal</p><h1 className="text-3xl font-black text-primary dark:text-white">Central de pendências</h1><p className="text-sm text-outline">Avisos do seu usuário que desaparecem automaticamente depois da regularização.</p></div><button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-primary px-4 font-bold text-primary dark:text-white"><span className="material-symbols-outlined">refresh</span>Atualizar</button></header>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700 dark:bg-red-950/30 dark:text-red-300">{error}</p>}
    {loading ? <p className="py-16 text-center text-outline">Verificando pendências...</p> : count === 0 ? <div className="rounded-2xl border border-dashed border-emerald-300 bg-emerald-50 p-10 text-center dark:border-emerald-800 dark:bg-emerald-950/20"><span className="material-symbols-outlined text-5xl text-emerald-600">task_alt</span><h2 className="mt-2 text-xl font-bold text-primary dark:text-white">Tudo em dia</h2><p className="text-outline">Não há pendências para o seu usuário.</p></div> : <>
      <IssueSection title="Quilometragem de veículos" icon="directions_car" count={vehicleIssues.length} empty="Nenhuma viagem aguardando quilometragem.">
        {vehicleIssues.map((item) => <IssueCard key={item.id} tone="red" title={`${item.vehicle?.name || "Veículo"} · ${item.purpose}`} detail={`Retorno previsto em ${dateLabel(item.end_at, true)}${item.destination ? ` · ${item.destination}` : ""}`} reason="Informe o KM inicial e final para concluir este agendamento." link={`/vehicles?month=${format(new Date(item.start_at), "yyyy-MM")}&complete=${item.id}`} action="Informar quilometragem" />)}
      </IssueSection>
      <IssueSection title="Atividades" icon="assignment_late" count={activityIssues.length} empty="Nenhuma atividade atrasada ou sem movimentação.">
        {activityIssues.map((item) => <IssueCard key={item.id} tone={item.overdue ? "red" : "amber"} title={item.title} detail={`${item.program?.name || "Programa não informado"} · prazo ${dateLabel(`${item.due_date}T12:00:00`)}`} reason={[item.overdue && "Atividade atrasada", item.stale && "Sem mudança de status há mais de 7 dias"].filter(Boolean).join(" · ")} link={`/activity/${item.id}`} action="Abrir atividade" />)}
      </IssueSection>
    </>}
  </section>;
}

function IssueSection({ title, icon, count, empty, children }) {
  return <section className="rounded-2xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface sm:p-5"><div className="mb-4 flex items-center gap-3"><span className="material-symbols-outlined rounded-xl bg-amber-100 p-2 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{icon}</span><h2 className="flex-1 text-xl font-bold text-primary dark:text-white">{title}</h2><span className="rounded-full bg-surface px-3 py-1 text-sm font-black dark:bg-gray-700">{count}</span></div>{count ? <div className="space-y-3">{children}</div> : <p className="rounded-xl bg-surface p-4 text-sm text-outline dark:bg-white/5">{empty}</p>}</section>;
}

function IssueCard({ tone, title, detail, reason, link, action }) {
  const colors = tone === "red" ? "border-red-200 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20" : "border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20";
  return <article className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center ${colors}`}><div className="flex-1"><h3 className="font-bold text-primary dark:text-white">{title}</h3><p className="mt-1 text-sm text-outline">{detail}</p><p className="mt-2 text-sm font-semibold text-red-700 dark:text-red-300">{reason}</p></div><Link to={link} className="rounded-full bg-primary px-4 py-2.5 text-center text-sm font-bold text-white">{action}</Link></article>;
}

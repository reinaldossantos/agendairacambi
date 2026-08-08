import { Link } from "react-router-dom";

const STATUS_META = [
  { status: "Planejado", label: "Planejadas", color: "bg-slate-400", text: "text-slate-700 dark:text-slate-300", icon: "event_note" },
  { status: "Em andamento", label: "Em andamento", color: "bg-amber-400", text: "text-amber-700 dark:text-amber-300", icon: "pending_actions" },
  { status: "Realizado", label: "Realizadas", color: "bg-emerald-600", text: "text-emerald-700 dark:text-emerald-300", icon: "task_alt" },
  { status: "Pendente", label: "Pendentes", color: "bg-red-500", text: "text-red-700 dark:text-red-300", icon: "error" },
  { status: "Cancelado", label: "Canceladas", color: "bg-stone-300 dark:bg-stone-600", text: "text-stone-600 dark:text-stone-300", icon: "event_busy" },
];

export default function ProgressOverview({ activities, loading, periodMode, startDate, endDate, selectedProgram, onlyMine, currentUser, searchTerm }) {
  if (loading) return <div className="mb-6 flex min-h-64 animate-pulse items-center gap-6 rounded-3xl border border-surface-variant bg-white p-6 dark:border-white/10 dark:bg-white/5"><div className="h-32 w-32 shrink-0 rounded-full bg-slate-200 dark:bg-gray-700" /><div className="flex-1 space-y-3"><div className="h-5 w-40 rounded bg-slate-200 dark:bg-gray-700" /><div className="h-8 max-w-md rounded bg-slate-200 dark:bg-gray-700" /><div className="h-4 max-w-xl rounded bg-slate-100 dark:bg-gray-800" /></div></div>;
  const counts = Object.fromEntries(STATUS_META.map(({ status }) => [status, activities.filter((item) => item.status === status).length]));
  const cancelled = counts.Cancelado || 0;
  const eligibleTotal = Math.max(activities.length - cancelled, 0);
  const completed = counts.Realizado || 0;
  const remaining = Math.max(eligibleTotal - completed, 0);
  const percent = eligibleTotal ? Math.round((completed / eligibleTotal) * 100) : 0;
  const circumference = 2 * Math.PI * 42;
  const dashOffset = circumference * (1 - percent / 100);
  const periodLabel = periodMode === "month" ? "do mês" : "da semana";
  const context = selectedProgram !== "Todos" ? selectedProgram : onlyMine ? "Minhas atividades" : "Todos os programas";
  const message = !activities.length
    ? `Nenhuma atividade encontrada ${periodLabel}.`
    : !eligibleTotal
      ? "Todas as atividades do período foram canceladas."
      : percent === 100
        ? `Excelente! Todas as atividades ${periodLabel} foram realizadas.`
        : completed === 0
          ? `Nenhuma atividade foi concluída ainda. Há ${remaining} para acompanhar.`
          : `${remaining} atividade${remaining === 1 ? "" : "s"} ainda ${remaining === 1 ? "precisa" : "precisam"} ser concluída${remaining === 1 ? "" : "s"}.`;

  const historyLink = (status) => {
    const params = new URLSearchParams({ status, start: startDate, end: endDate });
    if (selectedProgram !== "Todos") params.set("program", selectedProgram);
    if (onlyMine && currentUser?.id) params.set("person", currentUser.id);
    return `/history?${params.toString()}`;
  };

  return <section className="relative mb-6 overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-white via-emerald-50/45 to-amber-50/45 p-5 shadow-sm dark:border-emerald-900/50 dark:from-dark-surface dark:via-emerald-950/20 dark:to-amber-950/10 sm:p-6" aria-label={`Progresso ${periodLabel}`}>
    <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-700/10" />
    <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-5 sm:flex-row">
        <div className="relative h-36 w-36 shrink-0" role="img" aria-label={`${percent}% das atividades realizadas`}>
          <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 drop-shadow-sm">
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="9" className="text-emerald-100 dark:text-emerald-950" />
            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={dashOffset} className="text-emerald-600 transition-all duration-700 ease-out" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center"><strong className="text-3xl font-black tracking-tight text-primary dark:text-white">{percent}%</strong><span className="text-[10px] font-bold uppercase tracking-wider text-outline">concluído</span></div>
        </div>
        <div className="min-w-0 text-center sm:text-left">
          <div className="mb-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start"><span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-xs font-bold text-white"><span className="material-symbols-outlined text-[15px]">monitoring</span>Progresso {periodLabel}</span><span className="rounded-full border border-emerald-200 bg-white/75 px-3 py-1 text-xs font-semibold text-primary dark:border-emerald-800 dark:bg-white/5 dark:text-green-300">{context}</span>{searchTerm && <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">Busca ativa</span>}</div>
          <h2 className="text-xl font-bold text-on-surface dark:text-white sm:text-2xl">{completed} de {eligibleTotal} atividades realizadas</h2>
          <p className="mt-1 max-w-xl text-sm text-on-surface-variant dark:text-gray-300">{message}</p>
          {cancelled > 0 && <p className="mt-2 text-xs text-outline">{cancelled} cancelada{cancelled === 1 ? "" : "s"} não {cancelled === 1 ? "entra" : "entram"} no cálculo da conclusão.</p>}
        </div>
      </div>

      <div className="grid min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:w-[390px]">
        <Metric icon="task_alt" value={completed} label="Realizadas" tone="text-emerald-700 bg-emerald-100 dark:text-emerald-300 dark:bg-emerald-900/30" />
        <Metric icon="pending_actions" value={remaining} label="Restantes" tone="text-amber-700 bg-amber-100 dark:text-amber-300 dark:bg-amber-900/30" />
        <Metric icon="list_alt" value={activities.length} label="Registradas" tone="text-primary bg-green-100 dark:text-green-300 dark:bg-green-900/30" className="col-span-2 sm:col-span-1" />
      </div>
    </div>

    <div className="relative mt-6">
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-black/5 dark:bg-gray-800" aria-label="Distribuição das atividades por situação">
        {STATUS_META.map(({ status, color }) => counts[status] > 0 && <div key={status} className={`${color} transition-all duration-700`} style={{ width: `${(counts[status] / activities.length) * 100}%` }} title={`${status}: ${counts[status]}`} />)}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {STATUS_META.map(({ status, label, color, text, icon }) => <Link key={status} to={historyLink(status)} className="group flex min-h-12 items-center gap-2 rounded-xl border border-black/5 bg-white/70 px-3 py-2 transition hover:-translate-y-0.5 hover:bg-white hover:shadow-sm dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10" title={`Ver atividades ${label.toLowerCase()} no Histórico`}><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${color} text-white`}><span className="material-symbols-outlined text-[17px]">{icon}</span></span><span className="min-w-0"><strong className={`block text-base leading-none ${text}`}>{counts[status]}</strong><span className="block truncate text-[11px] text-outline">{label}</span></span></Link>)}
      </div>
    </div>
  </section>;
}

function Metric({ icon, value, label, tone, className = "" }) {
  return <div className={`rounded-2xl border border-black/5 bg-white/75 p-3 dark:border-white/10 dark:bg-white/5 ${className}`}><div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><span className="material-symbols-outlined text-[20px]">{icon}</span></div><strong className="text-2xl font-black text-on-surface dark:text-white">{value}</strong><p className="text-xs text-outline">{label}</p></div>;
}

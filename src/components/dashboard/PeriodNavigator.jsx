import { useRef } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PeriodNavigator({ periodMode, startDate, endDate, isCurrent, activities, onModeChange, onPrevious, onNext, onToday, onSelectDate }) {
  const inputRef = useRef(null);
  const touchStart = useRef(null);
  const today = format(new Date(), "yyyy-MM-dd");
  const startValue = format(startDate, "yyyy-MM-dd");
  const endValue = format(endDate, "yyyy-MM-dd");
  const temporalState = isCurrent ? "current" : endValue < today ? "past" : startValue > today ? "future" : "current";
  const programs = new Set(activities.map((activity) => activity.programs?.name).filter(Boolean)).size;
  const completed = activities.filter((activity) => activity.status === "Realizado").length;
  const periodText = periodMode === "month"
    ? format(startDate, "MMMM 'de' yyyy", { locale: ptBR })
    : `${format(startDate, "dd", { locale: ptBR })}–${format(endDate, "dd 'de' MMMM", { locale: ptBR })}`;
  const stateMeta = {
    current: { label: periodMode === "month" ? "Mês atual" : "Semana atual", icon: "today", shell: "border-emerald-300 from-emerald-50 to-green-100/80 dark:border-emerald-800 dark:from-emerald-950/50 dark:to-green-950/30", badge: "bg-emerald-600 text-white" },
    past: { label: "Período anterior", icon: "history", shell: "border-slate-200 from-slate-50 to-blue-50/80 dark:border-slate-700 dark:from-slate-900/60 dark:to-blue-950/20", badge: "bg-slate-600 text-white" },
    future: { label: "Planejamento", icon: "event_upcoming", shell: "border-amber-300 from-amber-50 to-yellow-100/80 dark:border-amber-800 dark:from-amber-950/40 dark:to-yellow-950/20", badge: "bg-amber-500 text-amber-950" },
  }[temporalState];

  const openPicker = () => {
    if (inputRef.current?.showPicker) inputRef.current.showPicker();
    else inputRef.current?.click();
  };
  const handleKeyDown = (event) => {
    if (event.key === "ArrowLeft") { event.preventDefault(); onPrevious(); }
    if (event.key === "ArrowRight") { event.preventDefault(); onNext(); }
    if (event.key.toLowerCase() === "h") { event.preventDefault(); onToday(); }
  };
  const handleTouchEnd = (event) => {
    if (touchStart.current === null) return;
    const distance = event.changedTouches[0].clientX - touchStart.current;
    if (Math.abs(distance) > 55) distance > 0 ? onPrevious() : onNext();
    touchStart.current = null;
  };

  return <section className={`mb-6 overflow-hidden rounded-3xl border bg-gradient-to-r shadow-sm transition-colors ${stateMeta.shell}`} aria-label="Navegação por período" tabIndex="0" onKeyDown={handleKeyDown} onTouchStart={(event) => { touchStart.current = event.touches[0].clientX; }} onTouchEnd={handleTouchEnd}>
    <div className="flex flex-col lg:flex-row lg:items-stretch">
      <div className="flex items-center justify-center gap-1 border-b border-black/5 p-3 dark:border-white/10 lg:border-b-0 lg:border-r">
        <button type="button" onClick={() => onModeChange("week")} aria-pressed={periodMode === "week"} className={`min-h-10 rounded-xl px-4 text-sm font-bold transition ${periodMode === "week" ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-white/70 dark:text-green-300 dark:hover:bg-white/10"}`}>Semana</button>
        <button type="button" onClick={() => onModeChange("month")} aria-pressed={periodMode === "month"} className={`min-h-10 rounded-xl px-4 text-sm font-bold transition ${periodMode === "month" ? "bg-primary text-white shadow-sm" : "text-primary hover:bg-white/70 dark:text-green-300 dark:hover:bg-white/10"}`}>Mês</button>
      </div>

      <div className="flex min-w-0 flex-1 items-center p-2 sm:p-3">
        <NavButton icon="chevron_left" label={periodMode === "month" ? "Mês anterior" : "Semana anterior"} onClick={onPrevious} />
        <button type="button" onClick={openPicker} className="group min-w-0 flex-1 rounded-2xl px-2 py-2 text-center transition hover:bg-white/70 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:hover:bg-white/10" title="Clique para escolher uma data">
          <span className="flex items-center justify-center gap-2"><span className="material-symbols-outlined text-2xl text-primary dark:text-green-300">calendar_month</span><strong key={`${periodMode}-${startValue}`} className="animate-period-in truncate text-lg capitalize text-primary dark:text-white sm:text-2xl">{periodText}</strong></span>
          <span className="mt-1 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-on-surface-variant dark:text-gray-300"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 font-bold ${stateMeta.badge}`}><span className="material-symbols-outlined text-[14px]">{stateMeta.icon}</span>{stateMeta.label}</span><span>{activities.length} atividade{activities.length === 1 ? "" : "s"}</span><span aria-hidden="true">•</span><span>{completed} realizada{completed === 1 ? "" : "s"}</span><span aria-hidden="true">•</span><span>{programs} programa{programs === 1 ? "" : "s"}</span></span>
        </button>
        <input ref={inputRef} type="date" value={startValue} onChange={(event) => onSelectDate(event.target.value)} className="sr-only" tabIndex="-1" aria-label="Escolher data do período" />
        <NavButton icon="chevron_right" label={periodMode === "month" ? "Próximo mês" : "Próxima semana"} onClick={onNext} />
      </div>

      {!isCurrent && <div className="flex items-center justify-center border-t border-black/5 p-3 dark:border-white/10 lg:border-l lg:border-t-0"><button type="button" onClick={onToday} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-5 text-sm font-bold text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:bg-white/10 dark:text-white"><span className="material-symbols-outlined text-[18px]">my_location</span>Hoje</button></div>}
    </div>
    <p className="border-t border-black/5 px-4 py-1.5 text-center text-[10px] text-outline dark:border-white/10"><span className="hidden sm:inline">Use as setas do teclado para navegar, H para retornar a hoje ou </span>deslize horizontalmente no celular.</p>
  </section>;
}

function NavButton({ icon, label, onClick }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/75 text-primary shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md active:translate-y-0 dark:bg-white/10 dark:text-green-300 dark:hover:bg-white/15"><span className="material-symbols-outlined text-2xl">{icon}</span></button>;
}

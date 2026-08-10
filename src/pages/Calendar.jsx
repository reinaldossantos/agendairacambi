import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, startOfMonth, startOfWeek, subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";
import { getProgramColor } from "../lib/colors";
import ProgramSwitcher from "../components/ui/ProgramSwitcher";

const WEEK_DAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function ActivityCard({ activity, compact = false }) {
  const color = getProgramColor(activity.programs?.name);
  return (
    <Link
      to={`/activity/${activity.id}`}
      onClick={(event) => event.stopPropagation()}
      className={`group block min-w-0 rounded-lg border-l-[3px] ${color.border} ${color.bg} px-2 py-1 text-left transition hover:brightness-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent`}
      title={`${activity.title}${activity.programs?.name ? ` — ${activity.programs.name}` : ""}`}
    >
      <span className={`block truncate font-semibold text-primary ${compact ? "text-[11px]" : "text-sm"}`}>
        {activity.title}
      </span>
      {!compact && <span className={`block truncate text-xs ${color.text}`}>{activity.programs?.name || "Sem programa"}</span>}
    </Link>
  );
}

function DayAgenda({ date, activities, onSelect }) {
  const dateKey = format(date, "yyyy-MM-dd");
  return (
    <article className="overflow-hidden rounded-2xl border border-surface-variant bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface">
      <button type="button" onClick={() => onSelect(date)} className="flex min-h-14 w-full items-center gap-3 bg-surface/70 px-4 py-3 text-left transition hover:bg-green-50 dark:bg-white/5 dark:hover:bg-white/10">
        <span className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-white">
          <strong className="text-base leading-none">{format(date, "dd")}</strong>
          <span className="mt-0.5 text-[9px] uppercase">{format(date, "EEE", { locale: ptBR }).slice(0, 3)}</span>
        </span>
        <span className="min-w-0 flex-1">
          <strong className="block capitalize text-primary dark:text-white">{format(date, "EEEE", { locale: ptBR })}</strong>
          <span className="text-xs text-outline">{activities.length} {activities.length === 1 ? "atividade" : "atividades"}</span>
        </span>
        <span className="material-symbols-outlined text-outline">chevron_right</span>
      </button>
      <div className="divide-y divide-surface-variant dark:divide-white/10">
        {activities.map((activity) => (
          <Link key={activity.id} to={`/activity/${activity.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition hover:bg-green-50 dark:hover:bg-white/5">
            <span className={`h-3 w-3 shrink-0 rounded-full border ${getProgramColor(activity.programs?.name).bg} ${getProgramColor(activity.programs?.name).border}`} />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-sm text-primary dark:text-white">{activity.title}</strong>
              <span className="block truncate text-xs text-outline">{activity.programs?.name || "Sem programa"}{activity.persons?.name ? ` · ${activity.persons.name}` : ""}</span>
            </span>
          </Link>
        ))}
      </div>
      <Link to="/new" state={{ dueDate: dateKey }} className="flex min-h-11 items-center justify-center gap-1 border-t border-surface-variant px-3 text-xs font-bold text-primary hover:bg-accent/15 dark:border-white/10 dark:text-accent">
        <span className="material-symbols-outlined text-lg">add</span> Nova atividade neste dia
      </Link>
    </article>
  );
}

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("Todos");
  const [view, setView] = useState("month");
  const [showMenu, setShowMenu] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const menuRef = useRef(null);

  const { monthStart, monthEnd, rangeStart, rangeEnd } = useMemo(() => {
    const firstDay = startOfMonth(currentDate);
    const lastDay = endOfMonth(currentDate);
    return {
      monthStart: firstDay,
      monthEnd: lastDay,
      rangeStart: startOfWeek(firstDay, { weekStartsOn: 0 }),
      rangeEnd: endOfWeek(lastDay, { weekStartsOn: 0 }),
    };
  }, [currentDate]);

  const fetchPrograms = useCallback(async () => {
    const { data, error: queryError } = await supabase.from("programs").select("id,name").order("name");
    if (!queryError) setPrograms(data || []);
  }, []);

  const fetchActivities = useCallback(async () => {
    setLoading(true);
    setError("");
    let query = supabase
      .from("activities")
      .select("id,title,description,due_date,status,programs:program_id(id,name),persons:responsible_id(id,name)")
      .gte("due_date", format(rangeStart, "yyyy-MM-dd"))
      .lte("due_date", format(rangeEnd, "yyyy-MM-dd"));
    if (selectedProgram !== "Todos") {
      const programId = programs.find((program) => program.name === selectedProgram)?.id;
      if (!programId) { setActivities([]); setLoading(false); return; }
      query = query.eq("program_id", programId);
    }
    const { data, error: queryError } = await query.order("due_date");
    if (queryError) setError("Não foi possível carregar a agenda. Tente novamente.");
    setActivities(data || []);
    setLoading(false);
  }, [rangeEnd, rangeStart, programs, selectedProgram]);

  useEffect(() => {
    const timer = window.setTimeout(fetchPrograms, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPrograms]);
  useEffect(() => {
    const timer = window.setTimeout(fetchActivities, 0);
    return () => window.clearTimeout(timer);
  }, [fetchActivities]);
  useEffect(() => {
    const close = (event) => { if (menuRef.current && !menuRef.current.contains(event.target)) setShowMenu(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  useEffect(() => {
    if (!selectedDate) return undefined;
    const close = (event) => { if (event.key === "Escape") setSelectedDate(null); };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedDate]);

  const days = useMemo(() => {
    const result = [];
    for (let day = rangeStart; day <= rangeEnd; day = addDays(day, 1)) result.push(day);
    return result;
  }, [rangeEnd, rangeStart]);
  const activityMap = useMemo(() => activities.reduce((map, activity) => {
    (map[activity.due_date] ||= []).push(activity);
    return map;
  }, {}), [activities]);
  const agendaDays = days.filter((day) => isSameMonth(day, monthStart) && activityMap[format(day, "yyyy-MM-dd")]?.length);
  const selectedActivities = selectedDate ? activityMap[format(selectedDate, "yyyy-MM-dd")] || [] : [];

  const exportMonthPDF = async () => {
    setShowMenu(false);
    const { generateWeeklyPDF } = await import("../lib/pdfGenerator");
    await generateWeeklyPDF({ weekStart: format(monthStart, "yyyy-MM-dd"), weekEnd: format(monthEnd, "yyyy-MM-dd"), activities });
  };

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <header className="mb-5 space-y-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="font-roboto text-headline-md text-primary dark:text-white sm:text-headline-lg">Agenda</h2>
            <p className="mt-1 text-sm text-outline">Acompanhe atividades, responsáveis e programas em um só lugar.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setCurrentDate(new Date())} className="min-h-11 rounded-xl border border-surface-variant bg-white px-4 text-sm font-bold text-primary hover:bg-surface dark:border-white/10 dark:bg-dark-surface dark:text-white">Hoje</button>
            <div className="flex items-center rounded-xl bg-surface p-1 dark:bg-white/5">
              <button onClick={() => setCurrentDate((date) => subMonths(date, 1))} aria-label="Mês anterior" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-white/10"><span className="material-symbols-outlined">chevron_left</span></button>
              <div className="relative" ref={menuRef}>
                <button onClick={() => setShowMenu((open) => !open)} aria-expanded={showMenu} className="flex min-h-10 min-w-48 items-center justify-center gap-2 px-2 font-bold capitalize text-primary dark:text-white">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>{format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}<span className="material-symbols-outlined text-lg">expand_more</span>
                </button>
                <AnimatePresence>{showMenu && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute right-0 z-30 mt-2 w-52 overflow-hidden rounded-xl border border-surface-variant bg-white py-1 shadow-xl dark:border-white/10 dark:bg-dark-surface">
                  <button onClick={() => { setSelectedProgram("Todos"); setShowMenu(false); }} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><span className="material-symbols-outlined text-lg">filter_alt_off</span>Limpar filtros</button>
                  <button onClick={exportMonthPDF} className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm hover:bg-surface"><span className="material-symbols-outlined text-lg">picture_as_pdf</span>Exportar mês</button>
                </motion.div>}</AnimatePresence>
              </div>
              <button onClick={() => setCurrentDate((date) => addMonths(date, 1))} aria-label="Próximo mês" className="flex h-10 w-10 items-center justify-center rounded-lg hover:bg-white dark:hover:bg-white/10"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
            <div className="hidden rounded-xl bg-surface p-1 md:flex dark:bg-white/5" aria-label="Visualização da agenda">
              {[{ id: "month", label: "Mês", icon: "calendar_view_month" }, { id: "agenda", label: "Agenda", icon: "view_agenda" }].map((option) => <button key={option.id} onClick={() => setView(option.id)} aria-pressed={view === option.id} className={`flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-bold transition ${view === option.id ? "bg-white text-primary shadow-sm dark:bg-gray-700 dark:text-white" : "text-outline"}`}><span className="material-symbols-outlined text-lg">{option.icon}</span>{option.label}</button>)}
            </div>
          </div>
        </div>
        <ProgramSwitcher programs={programs} value={selectedProgram} onChange={(program) => { setSelectedProgram(program); setSelectedDate(null); }} className="max-w-xl" />
        {programs.length > 0 && (
          <section aria-labelledby="program-colors-title" className="rounded-2xl border border-surface-variant bg-white p-3 shadow-sm dark:border-white/10 dark:bg-dark-surface">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-xl text-primary-light dark:text-green-300">palette</span>
                <h3 id="program-colors-title" className="text-xs font-bold uppercase tracking-wide text-primary dark:text-white">Legenda dos programas</h3>
              </div>
              {selectedProgram !== "Todos" && <button type="button" onClick={() => setSelectedProgram("Todos")} className="text-xs font-bold text-primary-light hover:underline dark:text-green-300">Mostrar todos</button>}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Legenda e filtro por programa">
              {programs.map((program) => {
                const color = getProgramColor(program.name);
                const selected = selectedProgram === program.name;
                return (
                  <button
                    key={program.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => { setSelectedProgram(selected ? "Todos" : program.name); setSelectedDate(null); }}
                    className={`flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 text-left text-xs font-bold leading-tight transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${color.bg} ${color.text} ${color.border} ${selected ? "ring-2 ring-primary ring-offset-2 dark:ring-accent dark:ring-offset-dark-surface" : "hover:brightness-95"}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full border-2 ${color.border} bg-white/70`} aria-hidden="true" />
                    {program.name}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-outline md:hidden">Toque em uma legenda para filtrar o programa.</p>
          </section>
        )}
      </header>

      {error && <div role="alert" className="mb-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"><span>{error}</span><button onClick={fetchActivities} className="font-bold underline">Tentar novamente</button></div>}

      {loading ? <div className="grid animate-pulse grid-cols-7 gap-px overflow-hidden rounded-2xl bg-surface-variant"><div className="col-span-7 h-[520px] bg-white/70 dark:bg-dark-surface" /></div> : (
        <>
          <section className={`${view === "agenda" ? "md:block" : "md:hidden"} space-y-3`} aria-label="Agenda do mês">
            {agendaDays.map((day) => <DayAgenda key={day.toString()} date={day} activities={activityMap[format(day, "yyyy-MM-dd")]} onSelect={setSelectedDate} />)}
            {!agendaDays.length && <div className="rounded-2xl border border-dashed border-surface-variant px-4 py-14 text-center"><span className="material-symbols-outlined text-4xl text-outline">event_busy</span><p className="mt-2 text-sm text-outline">Nenhuma atividade neste mês.</p></div>}
          </section>

          {view === "month" && <div role="grid" aria-label={format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })} className="hidden grid-cols-7 gap-px overflow-hidden rounded-2xl border border-surface-variant bg-surface-variant shadow-sm md:grid dark:border-white/10 dark:bg-white/10">
            {WEEK_DAYS.map((label) => <div key={label} role="columnheader" className="bg-white py-3 text-center text-xs font-bold uppercase tracking-wide text-outline dark:bg-dark-surface">{label}</div>)}
            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dayActivities = activityMap[dateKey] || [];
              const today = isSameDay(day, new Date());
              const selected = selectedDate && isSameDay(day, selectedDate);
              return <div key={dateKey} role="gridcell" aria-label={`${format(day, "EEEE, d 'de' MMMM", { locale: ptBR })}, ${dayActivities.length} atividades`} className={`relative min-h-32 bg-white p-2 transition dark:bg-dark-surface ${!isSameMonth(day, monthStart) ? "opacity-40" : ""} ${selected ? "z-10 ring-2 ring-inset ring-accent" : ""} ${today ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}>
                <button type="button" onClick={() => setSelectedDate(day)} className="absolute inset-0 z-0 w-full rounded-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" aria-label={`Abrir ${format(day, "dd/MM")}`} />
                <div className="pointer-events-none relative z-10 mb-2 flex items-center justify-between">
                  <span className={`flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-sm font-bold ${today ? "bg-accent text-primary" : "text-primary dark:text-white"}`}>{format(day, "d")}</span>
                  {dayActivities.length > 2 && <span className="text-[11px] font-bold text-outline">+{dayActivities.length - 2}</span>}
                </div>
                <div className="relative z-10 space-y-1">{dayActivities.slice(0, 2).map((activity) => <ActivityCard key={activity.id} activity={activity} compact />)}</div>
              </div>;
            })}
          </div>}
        </>
      )}

      <AnimatePresence>{selectedDate && <>
        <motion.button type="button" aria-label="Fechar detalhes" onClick={() => setSelectedDate(null)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]" />
        <motion.aside role="dialog" aria-modal="true" aria-labelledby="day-panel-title" initial={{ opacity: 0, x: 40, y: 20 }} animate={{ opacity: 1, x: 0, y: 0 }} exit={{ opacity: 0, x: 40, y: 20 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[82vh] overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl md:inset-y-0 md:left-auto md:w-[420px] md:rounded-none dark:bg-dark-surface">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div><p className="text-xs font-bold uppercase tracking-wide text-outline">Agenda do dia</p><h3 id="day-panel-title" className="mt-1 text-xl font-bold capitalize text-primary dark:text-white">{format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}</h3><p className="mt-1 text-sm text-outline">{selectedActivities.length} {selectedActivities.length === 1 ? "atividade" : "atividades"}</p></div>
            <button onClick={() => setSelectedDate(null)} aria-label="Fechar" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface hover:bg-gray-200 dark:bg-white/10"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="space-y-3">{selectedActivities.map((activity) => <ActivityCard key={activity.id} activity={activity} />)}</div>
          {!selectedActivities.length && <div className="rounded-2xl border border-dashed border-surface-variant p-8 text-center text-sm text-outline">Nenhuma atividade cadastrada para este dia.</div>}
          <Link to="/new" state={{ dueDate: format(selectedDate, "yyyy-MM-dd") }} className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 font-bold text-primary shadow-sm hover:brightness-95"><span className="material-symbols-outlined">add_circle</span>Nova atividade neste dia</Link>
        </motion.aside>
      </>}</AnimatePresence>
    </div>
  );
}

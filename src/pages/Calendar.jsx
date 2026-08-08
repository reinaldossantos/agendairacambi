import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay, subMonths, addMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProgramColor } from "../lib/colors";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProgramSwitcher from "../components/ui/ProgramSwitcher";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("Todos");
  const [programs, setPrograms] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef(null);

  const fetchPrograms = useCallback(async () => {
    const { data } = await supabase.from("programs").select("id,name").order("name");
    setPrograms(data || []);
  }, []);

  const fetchActivities = useCallback(async () => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(currentDate);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    let query = supabase
      .from("activities")
      .select("*, programs:program_id(id,name)")
      .gte("due_date", startStr)
      .lte("due_date", endStr);
    if (selectedProgram !== "Todos") {
      const selectedProgramId = programs.find((program) => program.name === selectedProgram)?.id;
      if (!selectedProgramId) { setActivities([]); return; }
      query = query.eq("program_id", selectedProgramId);
    }
    const { data } = await query.order("due_date");
    setActivities(data || []);
  }, [currentDate, programs, selectedProgram]);

  useEffect(() => { const timer = window.setTimeout(fetchPrograms, 0); return () => window.clearTimeout(timer); }, [fetchPrograms]);
  useEffect(() => { const timer = window.setTimeout(fetchActivities, 0); return () => window.clearTimeout(timer); }, [fetchActivities]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const activityMap = {};
  const programsInMonth = new Set();

  activities.forEach(act => {
    const key = act.due_date;
    if (!activityMap[key]) activityMap[key] = [];
    activityMap[key].push(act);
    if (act.programs?.name) programsInMonth.add(act.programs.name);
  });

  const days = [];
  let day = startDate;
  while (day <= endDate) { days.push(day); day = addDays(day, 1); }

  const prevMonth = () => setCurrentDate(prev => subMonths(prev, 1));
  const nextMonth = () => setCurrentDate(prev => addMonths(prev, 1));
  const goToToday = () => setCurrentDate(new Date());

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMenuAction = (action) => {
    setShowMenu(false);
    if (action === "today") goToToday();
    if (action === "clearFilters") setSelectedProgram("Todos");
    if (action === "exportPDF") exportMonthPDF();
  };

  const exportMonthPDF = async () => {
    const { generateWeeklyPDF } = await import("../lib/pdfGenerator");
    await generateWeeklyPDF({
      weekStart: format(monthStart, "yyyy-MM-dd"),
      weekEnd: format(monthEnd, "yyyy-MM-dd"),
      activities,
    });
  };

  const selectedActivities = selectedDate ? activityMap[format(selectedDate, "yyyy-MM-dd")] || [] : [];
  const mobileDays = days.filter((calendarDay) => isSameMonth(calendarDay, monthStart) && (activityMap[format(calendarDay, "yyyy-MM-dd")] || []).length > 0);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
        <h2 className="font-roboto text-headline-md sm:text-headline-lg text-primary dark:text-white">
          Calendário Mensal
        </h2>
        <div className="grid w-full grid-cols-[48px_minmax(0,1fr)_48px] items-center gap-2 sm:flex sm:w-auto sm:justify-end">
          <button onClick={prevMonth} aria-label="Mês anterior" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-surface transition hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10">
            <span className="material-symbols-outlined text-outline dark:text-gray-300">chevron_left</span>
          </button>
          <div className="relative min-w-0" ref={menuRef}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-amber-200 bg-accent/20 px-3 py-2 font-roboto text-base font-bold capitalize text-primary shadow-sm transition-all hover:bg-accent/30 dark:border-amber-800 dark:text-white sm:min-w-52"
            >
              <span className="material-symbols-outlined text-[20px]">calendar_month</span>
              <span className="truncate">{format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })}</span>
              <span className="material-symbols-outlined text-[18px]">expand_more</span>
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-surface rounded-xl shadow-lg border border-surface-variant dark:border-white/10 z-20"
                >
                  <button onClick={() => handleMenuAction("today")} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">today</span> Hoje
                  </button>
                  <button onClick={() => handleMenuAction("clearFilters")} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">filter_alt_off</span> Limpar filtros
                  </button>
                  <button onClick={() => handleMenuAction("exportPDF")} className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> Exportar mês
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <button onClick={nextMonth} aria-label="Próximo mês" className="flex min-h-12 min-w-12 items-center justify-center rounded-xl bg-surface transition hover:bg-gray-100 dark:bg-white/5 dark:hover:bg-white/10">
            <span className="material-symbols-outlined text-outline dark:text-gray-300">chevron_right</span>
          </button>
        </div>
      </div>

      <ProgramSwitcher programs={programs} value={selectedProgram} onChange={(program) => { setSelectedProgram(program); setSelectedDate(null); }} className="mb-6 max-w-xl" />

      <section className="space-y-3 md:hidden" aria-label="Agenda do mês">
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300"><span className="material-symbols-outlined mr-1 align-middle text-[18px]">view_agenda</span>Visualização em agenda otimizada para celular.</div>
        {mobileDays.map((calendarDay) => { const dateKey = format(calendarDay, "yyyy-MM-dd"); return <article key={dateKey} className="overflow-hidden rounded-2xl border border-surface-variant bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface"><button type="button" onClick={() => setSelectedDate(calendarDay)} className="flex min-h-12 w-full items-center gap-3 bg-surface/70 px-4 py-3 text-left dark:bg-white/5"><span className="flex h-10 w-10 flex-col items-center justify-center rounded-xl bg-primary text-white"><strong className="text-base leading-none">{format(calendarDay, "dd")}</strong><span className="text-[9px] uppercase">{format(calendarDay, "EEE", { locale: ptBR }).slice(0, 3)}</span></span><span className="flex-1 font-bold capitalize text-primary dark:text-white">{format(calendarDay, "EEEE", { locale: ptBR })}</span><span className="rounded-full bg-white px-2 py-1 text-xs font-bold text-outline dark:bg-gray-700">{activityMap[dateKey].length}</span></button><div className="divide-y divide-surface-variant dark:divide-white/10">{activityMap[dateKey].map((activity) => <Link key={activity.id} to={`/activity/${activity.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 hover:bg-green-50 dark:hover:bg-white/5"><span className={`h-3 w-3 shrink-0 rounded-full border ${getProgramColor(activity.programs?.name).bg} ${getProgramColor(activity.programs?.name).border}`} /><span className="min-w-0 flex-1"><strong className="block truncate text-sm text-primary dark:text-white">{activity.title}</strong><span className="block truncate text-xs text-outline">{activity.programs?.name || "Sem programa"}</span></span><span className="material-symbols-outlined text-outline">chevron_right</span></Link>)}</div></article>; })}
        {!mobileDays.length && <div className="rounded-2xl border border-dashed border-surface-variant px-4 py-12 text-center"><span className="material-symbols-outlined text-4xl text-outline">event_busy</span><p className="mt-2 text-sm text-outline">Nenhuma atividade neste mês.</p></div>}
      </section>

      {/* Grade do calendário */}
      <div className="hidden grid-cols-7 gap-px bg-surface-variant dark:bg-white/10 rounded-xl overflow-hidden shadow-md md:grid">
        {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
          <div key={i} className="py-2 text-center font-roboto text-xs font-semibold text-outline dark:text-gray-400 bg-white dark:bg-dark-surface border-b border-surface-variant dark:border-white/10">
            {d}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayActivities = activityMap[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isToday = isSameDay(day, new Date());
          return (
            <button
              key={day.toString()}
              onClick={() => setSelectedDate(day)}
              className={`relative p-1 sm:p-2 min-h-[60px] sm:min-h-[70px] md:min-h-[80px] bg-white dark:bg-dark-surface hover:bg-gray-50 dark:hover:bg-white/5 transition-all flex flex-col items-start ${
                !isCurrentMonth ? "opacity-40" : ""
              } ${isSelected ? "ring-1 ring-accent z-10" : ""} ${isToday ? "bg-amber-50 dark:bg-amber-900/20" : ""}`}
            >
              <span className={`text-xs sm:text-sm font-roboto ${isToday ? "font-bold text-accent" : "text-on-surface dark:text-gray-200"}`}>
                {format(day, "d")}
              </span>
              <div className="flex flex-wrap gap-0.5 mt-0.5">
                {dayActivities.slice(0, 2).map(act => {
                  const color = getProgramColor(act.programs?.name);
                  return (
                    <div
                      key={act.id}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${color.bg} border ${color.border}`}
                      title={act.title}
                    />
                  );
                })}
                {dayActivities.length > 2 && (
                  <span className="text-[8px] sm:text-[10px] text-outline dark:text-gray-400 font-roboto">
                    +{dayActivities.length - 2}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Legenda interativa com nomes abreviados */}
      {programsInMonth.size > 0 && (
        <div className="mt-6 bg-white dark:bg-dark-surface rounded-xl p-3 shadow-sm border border-surface-variant dark:border-white/10">
          <h4 className="font-roboto text-label-sm text-primary dark:text-white mb-2">Programas</h4>
          <div className="flex flex-wrap gap-2">
            {Array.from(programsInMonth).map(progName => {
              const color = getProgramColor(progName);
              return (
                <button
                  key={progName}
                  onClick={() => { setSelectedProgram(progName); setSelectedDate(null); }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all ${
                    selectedProgram === progName ? `${color.bg} ${color.text} border ${color.border} shadow-sm` : "hover:bg-gray-100 dark:hover:bg-white/10"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${color.bg} border ${color.border}`}></span>
                  <span>{progName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Detalhe do dia */}
      {selectedDate && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 bg-white dark:bg-dark-surface rounded-xl p-4 shadow-lg border border-surface-variant dark:border-white/10"
        >
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-roboto text-md sm:text-headline-md text-primary dark:text-white">
              {format(selectedDate, "EEEE, dd/MM", { locale: ptBR })}
            </h3>
            <button onClick={() => setSelectedDate(null)} className="text-outline hover:text-primary p-1">
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
          {selectedActivities.length === 0 ? (
            <p className="text-sm text-on-surface-variant dark:text-gray-400">Nenhuma atividade neste dia.</p>
          ) : (
            <div className="space-y-2">
              {selectedActivities.map(act => {
                const color = getProgramColor(act.programs?.name);
                return (
                  <Link
                    to={`/activity/${act.id}`}
                    key={act.id}
                    className={`block p-3 rounded-xl border-l-4 ${color.border} bg-surface dark:bg-white/5 hover:shadow-sm transition-all`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-roboto font-semibold text-sm sm:text-base text-primary dark:text-white">{act.title}</h4>
                        <p className="text-xs text-on-surface-variant dark:text-gray-300 line-clamp-2">{act.description}</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>
                            {act.programs?.name}
                          </span>
                          <span className="text-[10px] sm:text-xs text-outline">{act.persons?.name}</span>
                        </div>
                      </div>
                      <span className="material-symbols-outlined text-outline text-base sm:text-lg">chevron_right</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

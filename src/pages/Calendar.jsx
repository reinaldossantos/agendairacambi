import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays,
  isSameMonth, isSameDay,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProgramColor } from "../lib/colors";
import { Link } from "react-router-dom";

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedProgram, setSelectedProgram] = useState("Todos");
  const [programs, setPrograms] = useState([]);

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  useEffect(() => { fetchPrograms(); }, []);
  useEffect(() => { fetchActivities(); }, [currentDate, selectedProgram]);

  async function fetchPrograms() {
    const { data } = await supabase.from("programs").select("name").order("name");
    setPrograms(data || []);
  }

  async function fetchActivities() {
    const startStr = format(startDate, "yyyy-MM-dd");
    const endStr = format(endDate, "yyyy-MM-dd");
    let query = supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name, initials)")
      .gte("due_date", startStr)
      .lte("due_date", endStr);
    if (selectedProgram !== "Todos") query = query.eq("programs.name", selectedProgram);
    const { data } = await query.order("due_date");
    setActivities(data || []);
  }

  const activityMap = {};
  activities.forEach(act => {
    const key = act.due_date;
    if (!activityMap[key]) activityMap[key] = [];
    activityMap[key].push(act);
  });

  const days = [];
  let day = startDate;
  while (day <= endDate) { days.push(day); day = addDays(day, 1); }

  const prevMonth = () => setCurrentDate(prev => addDays(startOfMonth(prev), -1));
  const nextMonth = () => setCurrentDate(prev => addDays(endOfMonth(prev), 1));
  const goToToday = () => setCurrentDate(new Date());

  const selectedActivities = selectedDate ? activityMap[format(selectedDate, "yyyy-MM-dd")] || [] : [];

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-4 md:mb-6">Calendário Mensal</h2>
      
      {/* Navegação do mês */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
          <span className="material-symbols-outlined text-outline dark:text-gray-300">chevron_left</span>
        </button>
        <h3 className="font-roboto text-lg md:text-headline-md text-primary dark:text-white">
          {format(currentDate, "MMMM yyyy", { locale: ptBR })}
        </h3>
        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
          <span className="material-symbols-outlined text-outline dark:text-gray-300">chevron_right</span>
        </button>
        <button onClick={goToToday} className="px-3 py-1.5 md:px-4 md:py-2 rounded-full bg-accent/20 text-primary dark:text-white font-roboto text-label-sm min-h-[44px] flex items-center active:scale-95 transition-all">
          Hoje
        </button>
      </div>

      {/* Filtro de programas */}
      <div className="flex flex-nowrap gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
        <button onClick={() => setSelectedProgram("Todos")}
          className={`px-3 py-1.5 rounded-full font-roboto text-label-sm border whitespace-nowrap transition-all ${selectedProgram === "Todos" ? "bg-accent text-primary border-accent" : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10"}`}>Todos</button>
        {programs.map(prog => {
          const color = getProgramColor(prog.name);
          return (
            <button key={prog.name} onClick={() => setSelectedProgram(prog.name)}
              className={`px-3 py-1.5 rounded-full font-roboto text-label-sm border whitespace-nowrap transition-all ${selectedProgram === prog.name ? `${color.bg} ${color.text} ${color.border}` : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10"}`}>
              {prog.name}
            </button>
          );
        })}
      </div>

      {/* Grade do calendário – responsiva */}
      <div className="grid grid-cols-7 gap-px bg-surface-variant dark:bg-white/10 rounded-xl overflow-hidden mb-8">
        {["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"].map(d => (
          <div key={d} className="p-1 md:p-2 text-center font-roboto text-[10px] md:text-label-sm text-outline dark:text-gray-400 bg-surface dark:bg-dark-background">
            {d}
          </div>
        ))}
        {days.map(day => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayActivities = activityMap[dateKey] || [];
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          return (
            <button key={day.toString()} onClick={() => setSelectedDate(day)}
              className={`p-1 md:p-2 min-h-[40px] md:min-h-[60px] bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/5 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors relative ${!isCurrentMonth ? "opacity-30" : ""} ${isSelected ? "ring-2 ring-accent" : ""}`}>
              <span className="text-xs md:text-sm font-roboto text-on-surface dark:text-gray-200">{format(day, "d")}</span>
              {dayActivities.length > 0 && (
                <div className="flex justify-center mt-0.5 flex-wrap gap-0.5">
                  {dayActivities.slice(0,2).map(act => {
                    const color = getProgramColor(act.programs?.name);
                    return <span key={act.id} className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${color.bg} border ${color.border}`} title={act.title}></span>;
                  })}
                  {dayActivities.length > 2 && (
                    <span className="text-[8px] md:text-[10px] text-outline dark:text-gray-400">+{dayActivities.length - 2}</span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Lista de atividades do dia selecionado */}
      {selectedDate && (
        <div className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-4 md:p-6">
          <h4 className="font-roboto text-lg md:text-headline-md text-primary dark:text-white mb-4">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h4>
          {selectedActivities.length === 0 ? (
            <p className="text-on-surface-variant dark:text-gray-400 text-sm md:text-base">Nenhuma atividade neste dia.</p>
          ) : (
            <div className="space-y-3">
              {selectedActivities.map(act => {
                const color = getProgramColor(act.programs?.name);
                return (
                  <Link to={`/activity/${act.id}`} key={act.id}
                    className={`block p-3 rounded-xl border-l-4 ${color.border} bg-surface dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 transition-colors`}>
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-roboto font-semibold text-primary dark:text-white text-sm md:text-base">{act.title}</span>
                        <p className="text-xs md:text-sm text-on-surface-variant dark:text-gray-300 line-clamp-1">{act.description}</p>
                      </div>
                      <span className={`text-[10px] md:text-xs font-roboto font-semibold px-2 py-0.5 rounded-full border ${color.bg} ${color.text}`}>
                        {act.programs?.name}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
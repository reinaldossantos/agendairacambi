import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { getProgramColor } from "../../lib/colors";

export default function WeeklyListView({ activities, loading }) {
  if (loading) {
    return <div className="space-y-4">{/* skeletons opcionais */}</div>;
  }

  // Agrupar por data
  const grouped = {};
  activities.forEach(act => {
    const date = act.due_date;
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(act);
  });
  const sortedDates = Object.keys(grouped).sort();

  const [expandedDays, setExpandedDays] = useState(() => {
    const init = {};
    sortedDates.forEach(d => { init[d] = true; });
    return init;
  });

  const toggleDay = (date) => {
    setExpandedDays(prev => ({ ...prev, [date]: !prev[date] }));
  };

  if (sortedDates.length === 0) {
    return <div className="text-center py-10 text-on-surface-variant">Nenhuma atividade na semana.</div>;
  }

  return (
    <div className="space-y-4">
      {sortedDates.map(date => {
        const dayActivities = grouped[date];
        const isExpanded = expandedDays[date];
        const dateObj = parseISO(date);
        const dayName = format(dateObj, "EEEE, dd/MM", { locale: ptBR });
        return (
          <div key={date} className="bg-white dark:bg-white/5 rounded-xl border border-surface-variant dark:border-white/10 overflow-hidden">
            <button onClick={() => toggleDay(date)} className="w-full flex justify-between items-center p-4 bg-surface dark:bg-dark-surface hover:bg-gray-100 dark:hover:bg-white/10 transition">
              <span className="font-roboto text-headline-md text-primary dark:text-white">{dayName}</span>
              <span className="material-symbols-outlined text-primary">{isExpanded ? "expand_less" : "expand_more"}</span>
            </button>
            {isExpanded && (
              <div className="divide-y divide-surface-variant dark:divide-white/10">
                {dayActivities.map(act => {
                  const color = getProgramColor(act.programs?.name);
                  return (
                    <Link key={act.id} to={`/activity/${act.id}`} className="block p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className={`text-xs px-2 py-0.5 rounded-full ${color.bg} ${color.text}`}>{act.programs?.name}</span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">{act.persons?.name}</span>
                          </div>
                          <h4 className="font-roboto font-semibold text-primary dark:text-white">{act.title}</h4>
                          <p className="text-sm text-on-surface dark:text-gray-300 line-clamp-2 mt-1">{act.description}</p>
                        </div>
                        <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
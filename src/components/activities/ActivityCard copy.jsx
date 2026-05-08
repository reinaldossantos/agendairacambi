import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { useState, useEffect } from "react";
import { shareViaWhatsApp } from "../../lib/whatsapp";
import { getProgramColor } from "../../lib/colors";

const statusColors = {
  Planejado: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  "Em andamento": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200",
  Realizado: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200",
  Pendente: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-red-200",
};

export default function ActivityCard({ activity }) {
  const [involvedNames, setInvolvedNames] = useState([]);
  const dateToShow = activity.due_date || activity.week_start;
  const dateObj = parseISO(dateToShow);
  const displayDate = isValid(dateObj) ? format(dateObj, "EEEE, dd MMM", { locale: ptBR }) : dateToShow;

  useEffect(() => {
    if (activity.involved_ids?.length) {
      supabase
        .from("persons")
        .select("name, initials")
        .in("id", activity.involved_ids)
        .then(({ data }) => setInvolvedNames(data || []));
    }
  }, [activity.involved_ids]);

  const handleShare = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const text = `📋 *Atividade – Iracambi*\n\n*Título:* ${activity.title}\n*Programa:* ${activity.programs?.name || "N/D"}\n*Data:* ${displayDate}\n*Status:* ${activity.status}\n*Responsável:* ${activity.persons?.name || "N/D"}\n\n📝 *Descrição:* ${activity.description || "Sem descrição"}\n\n🌿 *Colegiado IRACAMBI®*`;
    shareViaWhatsApp(text);
  };

  const programName = activity.programs?.name || "Programa";
  const programColor = getProgramColor(programName);

  const textColorClass = programColor.text || "text-[#2E7D32]";
  const hexColor = textColorClass.match(/#[0-9A-Fa-f]{6}/)?.[0] || "#2E7D32";

  const hoverShadowStyle = { boxShadow: `0 4px 12px ${hexColor}20` };

  return (
    <Link
      to={`/activity/${activity.id}`}
      style={hoverShadowStyle}
      className={`group bg-white dark:bg-white/5 backdrop-blur-sm border-l-4 ${programColor.border} border-t border-r border-b border-surface-variant dark:border-white/10 rounded-xl p-4 hover:shadow-md transition-all duration-300 flex flex-col relative max-w-sm`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-block px-2.5 py-0.5 rounded-full ${programColor.bgLight} ${programColor.text} text-[11px] font-roboto font-medium border ${programColor.border}`}>
          {programName}
        </span>
        <span className={`text-[10px] font-roboto font-semibold px-2 py-0.5 rounded-full border ${statusColors[activity.status] || statusColors.Planejado}`}>
          {activity.status}
        </span>
      </div>

      <div className="flex items-center gap-2 text-gray-500 dark:text-gray-300 mb-2">
        <span className="material-symbols-outlined text-[16px]">calendar_today</span>
        <span className="font-roboto text-label-sm">{displayDate}</span>
      </div>

      <h3 className="font-roboto text-headline-md text-primary dark:text-white mb-2 leading-tight line-clamp-2">
        {activity.title}
      </h3>

      <p className="text-on-surface dark:text-gray-200 font-roboto text-body-md line-clamp-2 mb-4 flex-grow">
        {activity.description || "Sem descrição"}
      </p>

      <div className="pt-3 border-t border-surface-variant dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full ${programColor.bg} flex items-center justify-center text-xs font-bold ${programColor.text}`}>
            {activity.persons?.initials || "?"}
          </div>
          <span className="font-roboto text-label-sm text-primary dark:text-white">
            {activity.persons?.name || "Responsável"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {involvedNames.length > 0 && (
            <span className="text-xs text-green-600 dark:text-green-400 font-roboto px-2 py-1 font-medium">+{involvedNames.length}</span>
          )}
          <button
            onClick={handleShare}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[20px]">share</span>
          </button>
          <span className="material-symbols-outlined text-accent dark:text-accent group-hover:text-yellow-400 transition-colors">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}
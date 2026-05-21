import { Link } from "react-router-dom";
import { format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { useState, useEffect } from "react";
import {
  shareViaWhatsApp,
  formatSingleActivityForWhatsAppSimple,
} from "../../lib/whatsapp";
import { getProgramColor } from "../../lib/colors";

const statusColors = {
  Planejado: "bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300",
  "Em andamento":
    "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Realizado:
    "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  Pendente: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
};

const priorityEmojis = {
  Baixa: "🟢",
  Média: "🟡",
  Alta: "🟠",
  Urgente: "🔴",
};

const programShortNames = {
  "Relações Institucionais": "Rel. Institucionais",
  "Assistente de Colegiado": "Assist. Colegiado",
  "Pesquisas e Monitoramento": "Pesq. e Monitor.",
  "Viveiro e Manutenção": "Viveiro e Manut.",
  "Educação Ambiental": "Educ. Ambiental",
  "Florestas para Água": "Florestas p/ Água",
  "Gestão Financeira": "Gestão Financeira",
  Voluntariado: "Voluntariado",
};

function shortenProgramName(name) {
  if (!name) return "";
  if (programShortNames[name]) return programShortNames[name];
  const MAX_LEN = 18;
  if (name.length <= MAX_LEN) return name;
  const words = name.split(" ");
  if (words.length > 1) {
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    if ((firstWord + " " + lastWord).length <= MAX_LEN + 2) {
      return `${firstWord} ${lastWord}`;
    }
    return firstWord;
  }
  return name.substring(0, MAX_LEN - 3) + "...";
}

export default function ActivityCard({ activity }) {
  const [involvedNames, setInvolvedNames] = useState([]);
  const dateToShow = activity.due_date || activity.week_start;
  const dateObj = parseISO(dateToShow);
  const displayDate = isValid(dateObj)
    ? format(dateObj, "EEEE, dd MMM", { locale: ptBR })
    : dateToShow;

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
    const text = formatSingleActivityForWhatsAppSimple({
      title: activity.title,
      description: activity.description || "Sem descrição",
      dueDate: activity.due_date || activity.week_start,
      program: activity.programs?.name || "N/D",
      responsible: activity.persons?.name || "N/D",
    });
    shareViaWhatsApp(text);
  };

  const fullProgramName = activity.programs?.name || "Programa";
  const shortProgramName = shortenProgramName(fullProgramName);
  const programColor = getProgramColor(fullProgramName);

  const textColorClass = programColor.text || "text-[#2E7D32]";
  const hexColor = textColorClass.match(/#[0-9A-Fa-f]{6}/)?.[0] || "#2E7D32";
  const hoverShadowStyle = { boxShadow: `0 4px 12px ${hexColor}20` };

  const priority = activity.priority || "Média";
  const emoji = priorityEmojis[priority] || "🟡";

  return (
    <Link
      to={`/activity/${activity.id}`}
      style={hoverShadowStyle}
      className={`group bg-white dark:bg-white/5 backdrop-blur-sm border-l-4 ${programColor.border} border-t border-r border-b border-surface-variant dark:border-white/10 rounded-xl p-3 hover:shadow-md transition-all duration-300 flex flex-col relative`}
    >
      <div className="flex items-start justify-between mb-2">
        <span
          className={`inline-block px-2 py-0.5 rounded-full ${programColor.bgLight} ${programColor.text} text-[10px] font-roboto font-medium border ${programColor.border}`}
        >
          {shortProgramName}
        </span>
        <div className="flex gap-1">
          <span className="text-[9px] font-roboto font-semibold px-1.5 py-0.5 rounded-full border bg-white dark:bg-white/5">
            {emoji} {priority}
          </span>
          <span
            className={`text-[9px] font-roboto font-semibold px-1.5 py-0.5 rounded-full border ${
              statusColors[activity.status] || statusColors.Planejado
            }`}
          >
            {activity.status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 text-gray-500 dark:text-gray-300 mb-1">
        <span className="material-symbols-outlined text-[14px]">
          calendar_today
        </span>
        <span className="font-roboto text-[10px]">{displayDate}</span>
      </div>

      <h3 className="font-roboto text-sm font-semibold text-primary dark:text-white mb-1 leading-tight line-clamp-2">
        {activity.title}
      </h3>

      <p className="text-on-surface dark:text-gray-200 font-roboto text-xs line-clamp-2 mb-2 flex-grow">
        {activity.description || "Sem descrição"}
      </p>

      <div className="pt-2 border-t border-surface-variant dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-6 h-6 rounded-full ${programColor.bg} flex items-center justify-center text-[10px] font-bold ${programColor.text}`}
          >
            {activity.persons?.initials || "?"}
          </div>
          <span className="font-roboto text-[11px] text-primary dark:text-white truncate max-w-[80px]">
            {activity.persons?.name || "Responsável"}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {involvedNames.length > 0 && (
            <span className="text-[10px] text-green-600 dark:text-green-400 font-roboto px-1">
              +{involvedNames.length}
            </span>
          )}
          <button
            onClick={handleShare}
            className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[32px] min-w-[32px] flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-[16px]">
              share
            </span>
          </button>
          {/* Seta com mesmo efeito hover do compartilhamento */}
          <span className="material-symbols-outlined text-green-600 dark:text-green-400 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full p-1 -m-1 active:scale-95 transition-all cursor-pointer text-[16px]">
            arrow_forward
          </span>
        </div>
      </div>
    </Link>
  );
}

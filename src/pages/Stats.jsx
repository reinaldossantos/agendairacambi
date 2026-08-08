/* eslint-disable react-hooks/immutability, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, subWeeks, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProgramColor } from "../lib/colors";

export default function Stats() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total: 0, byStatus: {}, byProgram: {} });
  const [currentMonday, setCurrentMonday] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5);

  useEffect(() => {
    fetchStats();
  }, [currentMonday]);

  async function fetchStats() {
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");

    const { data: activities } = await supabase
      .from("activities")
      .select("id, status, program_id, due_date, programs:program_id(name)")
      .gte("due_date", startStr)
      .lte("due_date", endStr);

    const total = activities?.length || 0;
    const byStatus = {};
    const byProgram = {};

    activities?.forEach((act) => {
      byStatus[act.status] = (byStatus[act.status] || 0) + 1;
      const progName = act.programs?.name || "Sem programa";
      byProgram[progName] = (byProgram[progName] || 0) + 1;
    });

    setStats({ total, byStatus, byProgram });
  }

  const goToPreviousWeek = () => setCurrentMonday(subWeeks(currentMonday, 1));
  const goToNextWeek = () => setCurrentMonday(addWeeks(currentMonday, 1));
  const goToCurrentWeek = () =>
    setCurrentMonday(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const maxCount = Math.max(...Object.values(stats.byProgram), 1);

  const handleStatusClick = (status) => {
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");
    navigate(`/history?status=${encodeURIComponent(status)}&start=${startStr}&end=${endStr}`);
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    return format(currentMonday, "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd");
  };
  const currentWeekFlag = isCurrentWeek();

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">
        Dashboard de Estatísticas
      </h2>

      {/* Destaque da semana (tamanho normal) */}
      <div className="mb-6">
        <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${
          currentWeekFlag 
            ? 'bg-gradient-to-r from-green-100 to-green-200 dark:from-green-900/40 dark:to-green-800/40 border-2 border-green-500 dark:border-green-400 shadow-md' 
            : 'bg-surface dark:bg-white/5 border border-surface-variant dark:border-white/10'
        }`}>
          <span className="material-symbols-outlined text-primary dark:text-white text-xl">calendar_today</span>
          <span className={`font-roboto font-semibold ${currentWeekFlag ? 'text-green-800 dark:text-green-300' : 'text-on-surface dark:text-gray-300'}`}>
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
            {currentWeekFlag && (
              <span className="ml-2 text-xs font-normal bg-green-600 text-white px-2 py-0.5 rounded-full">
                SEMANA ATUAL
              </span>
            )}
          </span>
        </div>
      </div>

      {/* Navegação da semana (botões) */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={goToPreviousWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_left</span>
          </button>
          <button onClick={goToCurrentWeek} className="px-4 py-2 rounded-full bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-700/40 dark:text-green-200 dark:hover:bg-green-700/60 font-roboto text-label-sm min-h-[44px] flex items-center active:scale-95 transition-all">
            Hoje
          </button>
          <button onClick={goToNextWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_right</span>
          </button>
        </div>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {["Planejado", "Em andamento", "Realizado", "Pendente"].map((st) => {
          const count = stats.byStatus[st] || 0;
          const colorMap = {
            Planejado: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/20 cursor-pointer transition-colors",
            "Em andamento": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 cursor-pointer transition-colors",
            Realizado: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/50 cursor-pointer transition-colors",
            Pendente: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 cursor-pointer transition-colors",
          };
          return (
            <div
              key={st}
              onClick={() => handleStatusClick(st)}
              className={`p-4 rounded-xl border ${colorMap[st]} flex flex-col items-center`}
            >
              <span className="text-3xl font-bold">{count}</span>
              <span className="text-sm font-roboto">{st}</span>
            </div>
          );
        })}
      </div>

      {/* Gráfico por programa */}
      <div className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-6">
        <h3 className="font-roboto text-headline-md text-primary dark:text-white mb-4">
          Atividades por Programa
        </h3>
        <div className="space-y-3">
          {Object.entries(stats.byProgram).map(([progName, count]) => {
            const color = getProgramColor(progName);
            const widthPercent = (count / maxCount) * 100;
            return (
              <div key={progName} className="flex items-center gap-3">
                <span className="w-32 text-sm font-roboto text-on-surface dark:text-gray-200 truncate">{progName}</span>
                <div className="flex-1 bg-surface-variant dark:bg-white/5 rounded-full h-4">
                  <div className={`h-4 rounded-full ${color.bg} border ${color.border}`} style={{ width: `${widthPercent}%` }}></div>
                </div>
                <span className="text-sm font-roboto text-on-surface dark:text-gray-200 w-8 text-right">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

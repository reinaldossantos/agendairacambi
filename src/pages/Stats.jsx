// import { useState, useEffect } from "react";
// import { supabase } from "../lib/supabaseClient";
// import { startOfWeek, addDays, format } from "date-fns";
// import { getProgramColor } from "../lib/colors";

// export default function Stats() {
//   const [stats, setStats] = useState({ total: 0, byStatus: {}, byProgram: {} });
//   const [weekLabel, setWeekLabel] = useState("");

//   useEffect(() => { fetchStats(); }, []);

//   async function fetchStats() {
//     const today = new Date();
//     const monday = startOfWeek(today, { weekStartsOn: 1 });
//     const saturday = addDays(monday, 5);
//     const startStr = format(monday, "yyyy-MM-dd");
//     const endStr = format(saturday, "yyyy-MM-dd");
//     setWeekLabel(`${format(monday, "dd/MM")} a ${format(saturday, "dd/MM")}`);

//     const { data: activities } = await supabase
//       .from("activities")
//       .select("id, status, program_id, programs:program_id(name)")
//       .gte("due_date", startStr)
//       .lte("due_date", endStr);

//     const total = activities?.length || 0;
//     const byStatus = {};
//     const byProgram = {};
//     activities?.forEach(act => {
//       byStatus[act.status] = (byStatus[act.status] || 0) + 1;
//       const progName = act.programs?.name || "Sem programa";
//       byProgram[progName] = (byProgram[progName] || 0) + 1;
//     });
//     setStats({ total, byStatus, byProgram });
//   }

//   const maxCount = Math.max(...Object.values(stats.byProgram), 1);

//   return (
//     <div className="max-w-4xl mx-auto px-4 md:px-0">
//       <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">Dashboard de Estatísticas</h2>
//       <p className="text-on-surface-variant dark:text-gray-400 mb-8">Semana atual: {weekLabel}</p>

//       <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
//         {["Planejado","Em andamento","Realizado","Pendente"].map(st => {
//           const count = stats.byStatus[st] || 0;
//           const colorMap = {
//             Planejado: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
//             "Em andamento": "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
//             Realizado: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
//             Pendente: "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
//           };
//           return (
//             <div key={st} className={`p-4 rounded-xl border ${colorMap[st]} flex flex-col items-center`}>
//               <span className="text-3xl font-bold">{count}</span>
//               <span className="text-sm font-roboto">{st}</span>
//             </div>
//           );
//         })}
//       </div>

//       <div className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-6">
//         <h3 className="font-roboto text-headline-md text-primary dark:text-white mb-4">Atividades por Programa</h3>
//         <div className="space-y-3">
//           {Object.entries(stats.byProgram).map(([progName, count]) => {
//             const color = getProgramColor(progName);
//             const widthPercent = (count / maxCount) * 100;
//             return (
//               <div key={progName} className="flex items-center gap-3">
//                 <span className="w-32 text-sm font-roboto text-on-surface dark:text-gray-200 truncate">{progName}</span>
//                 <div className="flex-1 bg-surface-variant dark:bg-white/5 rounded-full h-4">
//                   <div className={`h-4 rounded-full ${color.bg} border ${color.border}`} style={{ width: `${widthPercent}%` }}></div>
//                 </div>
//                 <span className="text-sm font-roboto text-on-surface dark:text-gray-200 w-8 text-right">{count}</span>
//               </div>
//             );
//           })}
//         </div>
//       </div>
//     </div>
//   );
// }



import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, subWeeks, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getProgramColor } from "../lib/colors";

export default function Stats() {
  const [stats, setStats] = useState({ total: 0, byStatus: {}, byProgram: {} });
  const [currentMonday, setCurrentMonday] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5); // sábado

  useEffect(() => {
    fetchStats();
  }, [currentMonday]);

  async function fetchStats() {
    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");

    const { data: activities } = await supabase
      .from("activities")
      .select("id, status, program_id, programs:program_id(name)")
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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">
        Dashboard de Estatísticas
      </h2>

      {/* Barra de navegação da semana – idêntica ao Mural de Avisos e Dashboard */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">
              chevron_left
            </span>
          </button>
          <button
            onClick={goToCurrentWeek}
            className="px-4 py-2 rounded-full bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-700/40 dark:text-green-200 dark:hover:bg-green-700/60 font-roboto text-label-sm min-h-[44px] flex items-center active:scale-95 transition-all"
          >
            Hoje
          </button>
          <button
            onClick={goToNextWeek}
            className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">
              chevron_right
            </span>
          </button>
        </div>
        <span className="text-on-surface-variant dark:text-gray-300 text-sm md:text-base">
          {format(weekStart, "dd 'de' MMM", { locale: ptBR })} –{" "}
          {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {["Planejado", "Em andamento", "Realizado", "Pendente"].map((st) => {
          const count = stats.byStatus[st] || 0;
          const colorMap = {
            Planejado: "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-gray-300",
            "Em andamento":
              "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
            Realizado:
              "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400",
            Pendente:
              "bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400",
          };
          return (
            <div
              key={st}
              className={`p-4 rounded-xl border ${colorMap[st]} flex flex-col items-center`}
            >
              <span className="text-3xl font-bold">{count}</span>
              <span className="text-sm font-roboto">{st}</span>
            </div>
          );
        })}
      </div>

      {/* Gráfico de barras por programa */}
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
                <span className="w-32 text-sm font-roboto text-on-surface dark:text-gray-200 truncate">
                  {progName}
                </span>
                <div className="flex-1 bg-surface-variant dark:bg-white/5 rounded-full h-4">
                  <div
                    className={`h-4 rounded-full ${color.bg} border ${color.border}`}
                    style={{ width: `${widthPercent}%` }}
                  ></div>
                </div>
                <span className="text-sm font-roboto text-on-surface dark:text-gray-200 w-8 text-right">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
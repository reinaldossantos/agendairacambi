// import { useState, useEffect, useRef } from "react";
// import { useSearchParams } from "react-router-dom";
// import { supabase } from "../lib/supabaseClient";
// import {
//   startOfWeek,
//   addDays,
//   subDays,
//   subWeeks,
//   addWeeks,
//   format,
// } from "date-fns";
// import { ptBR } from "date-fns/locale";

// import ActivityCard from "../components/activities/ActivityCard";
// import SkeletonCard from "../components/ui/SkeletonCard";
// import { useCurrentUser } from "../context/CurrentUserContext";
// import { getProgramColor } from "../lib/colors";

// // ✅ FAB IMPORTADO
// import FAB from "../components/layout/FAB";

// function getCurrentMonday() {
//   const today = new Date();
//   const day = today.getDay();

//   if (day === 0) {
//     return addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
//   } else if (day === 6) {
//     return startOfWeek(subDays(today, 6), { weekStartsOn: 1 });
//   } else {
//     return startOfWeek(today, { weekStartsOn: 1 });
//   }
// }

// export default function Dashboard() {
//   const { currentUser } = useCurrentUser();
//   const [searchParams] = useSearchParams();

//   const programFromUrl = searchParams.get("program") || "Todos";

//   const [activities, setActivities] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [selectedProgram, setSelectedProgram] = useState(programFromUrl);
//   const [programs, setPrograms] = useState([]);
//   const [programIds, setProgramIds] = useState({});
//   const [currentMonday, setCurrentMonday] = useState(getCurrentMonday());

//   const weekStart = currentMonday;
//   const weekEnd = addDays(weekStart, 5);

//   const filterContainerRef = useRef(null);

//   const [isDragging, setIsDragging] = useState(false);
//   const [startX, setStartX] = useState(0);
//   const [scrollLeft, setScrollLeft] = useState(0);

//   useEffect(() => {
//     fetchPrograms();
//   }, []);

//   useEffect(() => {
//     setSelectedProgram(programFromUrl);
//   }, [programFromUrl]);

//   useEffect(() => {
//     setLoading(true);
//     fetchActivities();
//   }, [selectedProgram, currentMonday]);

//   async function fetchPrograms() {
//     const { data } = await supabase
//       .from("programs")
//       .select("id, name")
//       .order("name");

//     if (data) {
//       setPrograms(data || []);

//       const idMap = {};
//       data.forEach((prog) => {
//         idMap[prog.name] = prog.id;
//       });

//       setProgramIds(idMap);
//     }
//   }

//   async function fetchActivities() {
//     setLoading(true);

//     const startStr = format(weekStart, "yyyy-MM-dd");
//     const endStr = format(weekEnd, "yyyy-MM-dd");

//     let query = supabase
//       .from("activities")
//       .select(
//         "*, programs:program_id(name), persons:responsible_id(name, initials)"
//       )
//       .gte("due_date", startStr)
//       .lte("due_date", endStr);

//     if (
//       selectedProgram !== "Todos" &&
//       programIds[selectedProgram]
//     ) {
//       query = query.eq("program_id", programIds[selectedProgram]);
//     }

//     const { data, error } = await query.order("due_date", {
//       ascending: true,
//     });

//     if (error) {
//       console.error("Erro ao buscar atividades:", error);
//       setActivities([]);
//     } else {
//       setActivities(data || []);
//     }

//     setLoading(false);
//   }

//   const goToPreviousWeek = () =>
//     setCurrentMonday(subWeeks(currentMonday, 1));

//   const goToNextWeek = () =>
//     setCurrentMonday(addWeeks(currentMonday, 1));

//   const goToCurrentWeek = () =>
//     setCurrentMonday(getCurrentMonday());

//   const handleMouseDown = (e) => {
//     setIsDragging(true);
//     setStartX(e.pageX - filterContainerRef.current.offsetLeft);
//     setScrollLeft(filterContainerRef.current.scrollLeft);
//     filterContainerRef.current.style.cursor = "grabbing";
//   };

//   const handleMouseUp = () => {
//     setIsDragging(false);
//     if (filterContainerRef.current) {
//       filterContainerRef.current.style.cursor = "grab";
//     }
//   };

//   const handleMouseMove = (e) => {
//     if (!isDragging) return;

//     e.preventDefault();

//     const x = e.pageX - filterContainerRef.current.offsetLeft;
//     const walk = (x - startX) * 2;

//     filterContainerRef.current.scrollLeft = scrollLeft - walk;
//   };

//   const handleMouseLeave = () => {
//     if (isDragging) {
//       setIsDragging(false);
//       if (filterContainerRef.current) {
//         filterContainerRef.current.style.cursor = "grab";
//       }
//     }
//   };

//   return (
//     <section className="px-4 md:px-0">
//       <div className="max-w-4xl mx-auto">

//         {currentUser && (
//           <p className="text-body-md text-on-surface dark:text-gray-200 mb-4">
//             Bem-vindo(a),{" "}
//             <span className="font-semibold text-primary dark:text-white">
//               {currentUser.name}
//             </span>.
//           </p>
//         )}

//         {/* CABEÇALHO */}
//         <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
//           <div>
//             <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-1">
//               Atividades da Semana
//             </h2>

//             <p className="text-on-surface-variant dark:text-gray-300 text-sm md:text-base">
//               {format(weekStart, "dd 'de' MMM", { locale: ptBR })} –{" "}
//               {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
//             </p>
//           </div>

//           <div className="flex items-center gap-2 mt-4 md:mt-0">
//             <button onClick={goToPreviousWeek} className="p-2 rounded-full bg-green-100">◀</button>
//             <button onClick={goToCurrentWeek} className="px-4 py-2 rounded-full bg-green-200">Hoje</button>
//             <button onClick={goToNextWeek} className="p-2 rounded-full bg-green-100">▶</button>
//           </div>
//         </div>

//         {/* FILTROS */}
//         <div
//           ref={filterContainerRef}
//           className="flex flex-nowrap gap-2 mb-8 overflow-x-auto pb-4"
//           onMouseDown={handleMouseDown}
//           onMouseUp={handleMouseUp}
//           onMouseMove={handleMouseMove}
//           onMouseLeave={handleMouseLeave}
//         >
//           <button
//             onClick={() => setSelectedProgram("Todos")}
//             className={`px-4 py-2 rounded-full border ${
//               selectedProgram === "Todos" ? "bg-accent text-primary" : "bg-surface"
//             }`}
//           >
//             Todos
//           </button>

//           {programs.map((prog) => {
//             const color = getProgramColor(prog.name);
//             const isSelected = selectedProgram === prog.name;

//             return (
//               <button
//                 key={prog.id}
//                 onClick={() => setSelectedProgram(prog.name)}
//                 className={`px-4 py-2 rounded-full border ${
//                   isSelected ? `${color.bg} ${color.text}` : "bg-surface"
//                 }`}
//               >
//                 {prog.name}
//               </button>
//             );
//           })}
//         </div>

//         {/* CONTEÚDO + FAB */}
//         <div className="flex flex-col">

//           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
//             {loading ? (
//               Array.from({ length: 6 }).map((_, i) => (
//                 <SkeletonCard key={i} />
//               ))
//             ) : activities.length === 0 ? (
//               <div className="col-span-full text-center py-20">
//                 Nenhuma atividade encontrada.
//               </div>
//             ) : (
//               activities.map((activity) => (
//                 <ActivityCard key={activity.id} activity={activity} />
//               ))
//             )}
//           </div>

//           {/* ✅ BOTÃO CORRETO: SEM ESPAÇO EXTRA E ROLANDO */}
//           <FAB />

//         </div>
//       </div>
//     </section>
//   );
// }





import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  startOfWeek,
  addDays,
  subDays,
  subWeeks,
  addWeeks,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

import ActivityCard from "../components/activities/ActivityCard";
import SkeletonCard from "../components/ui/SkeletonCard";
import { useCurrentUser } from "../context/CurrentUserContext";
import { getProgramColor } from "../lib/colors";

function getCurrentMonday() {
  const today = new Date();
  const day = today.getDay();

  if (day === 0) {
    return addDays(startOfWeek(today, { weekStartsOn: 1 }), 7);
  } else if (day === 6) {
    return startOfWeek(subDays(today, 6), { weekStartsOn: 1 });
  } else {
    return startOfWeek(today, { weekStartsOn: 1 });
  }
}

export default function Dashboard() {
  const { currentUser } = useCurrentUser();
  const [searchParams] = useSearchParams();

  const programFromUrl = searchParams.get("program") || "Todos";

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProgram, setSelectedProgram] = useState(programFromUrl);
  const [programs, setPrograms] = useState([]);
  const [programIds, setProgramIds] = useState({});
  const [currentMonday, setCurrentMonday] = useState(getCurrentMonday());

  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5);

  const filterContainerRef = useRef(null);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    setSelectedProgram(programFromUrl);
  }, [programFromUrl]);

  useEffect(() => {
    fetchActivities();
  }, [selectedProgram, currentMonday]);

  async function fetchPrograms() {
    const { data } = await supabase
      .from("programs")
      .select("id, name")
      .order("name");

    if (data) {
      setPrograms(data || []);

      const idMap = {};
      data.forEach((prog) => {
        idMap[prog.name] = prog.id;
      });

      setProgramIds(idMap);
    }
  }

  async function fetchActivities() {
    setLoading(true);

    const startStr = format(weekStart, "yyyy-MM-dd");
    const endStr = format(weekEnd, "yyyy-MM-dd");

    let query = supabase
      .from("activities")
      .select("*, programs:program_id(name)")
      .gte("due_date", startStr)
      .lte("due_date", endStr);

    if (
      selectedProgram !== "Todos" &&
      programIds[selectedProgram]
    ) {
      query = query.eq("program_id", programIds[selectedProgram]);
    }

    const { data } = await query.order("due_date");

    setActivities(data || []);
    setLoading(false);
  }

  return (
    <section className="px-4 md:px-0">
      <div className="max-w-4xl mx-auto">

        {currentUser && (
          <p className="mb-4">
            Bem-vindo(a), <strong>{currentUser.name}</strong>
          </p>
        )}

        <div className="mb-8">
          <h2 className="text-xl font-semibold">
            Atividades da Semana
          </h2>
          <p className="text-sm text-gray-500">
            {format(weekStart, "dd/MM")} - {format(weekEnd, "dd/MM")}
          </p>
        </div>

        <div
          ref={filterContainerRef}
          className="flex gap-2 mb-8 overflow-x-auto"
        >
          <button onClick={() => setSelectedProgram("Todos")}>
            Todos
          </button>

          {programs.map((prog) => (
            <button
              key={prog.id}
              onClick={() => setSelectedProgram(prog.name)}
            >
              {prog.name}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))
          ) : (
            activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))
          )}
        </div>

      </div>
    </section>
  );
}
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, subDays, subWeeks, addWeeks, format } from "date-fns";
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
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    setSelectedProgram(programFromUrl);
  }, [programFromUrl]);

  useEffect(() => {
    setLoading(true);
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
      .select("*, programs:program_id(name), persons:responsible_id(name, initials)")
      .gte("due_date", startStr)
      .lte("due_date", endStr);

    if (selectedProgram !== "Todos" && programIds[selectedProgram]) {
      query = query.eq("program_id", programIds[selectedProgram]);
    }

    const { data, error } = await query.order("due_date", { ascending: true });
    if (error) {
      console.error("Erro ao buscar atividades:", error);
      setActivities([]);
    } else {
      setActivities(data || []);
    }
    setLoading(false);
  }

  const goToPreviousWeek = () => setCurrentMonday(subWeeks(currentMonday, 1));
  const goToNextWeek = () => setCurrentMonday(addWeeks(currentMonday, 1));
  const goToCurrentWeek = () => setCurrentMonday(getCurrentMonday());

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - filterContainerRef.current.offsetLeft);
    setScrollLeft(filterContainerRef.current.scrollLeft);
    filterContainerRef.current.style.cursor = "grabbing";
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    if (filterContainerRef.current) {
      filterContainerRef.current.style.cursor = "grab";
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const x = e.pageX - filterContainerRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    filterContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      if (filterContainerRef.current) {
        filterContainerRef.current.style.cursor = "grab";
      }
    }
  };

  return (
    <section className="px-4 md:px-0">
      <div className="max-w-4xl mx-auto">
        {currentUser && (
          <p className="text-body-md text-on-surface dark:text-gray-200 mb-4">
            Bem-vindo(a),{" "}
            <span className="font-semibold text-primary dark:text-white">
              {currentUser.name}
            </span>
            .
          </p>
        )}

        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
          <div>
            <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-1">
              Atividades da Semana
            </h2>
            <p className="text-on-surface-variant dark:text-gray-300 text-sm md:text-base">
              {format(weekStart, "dd 'de' MMM", { locale: ptBR })} –{" "}
              {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
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
        </div>

        <div
          ref={filterContainerRef}
          className="flex flex-nowrap gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide cursor-grab select-none"
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <button
            onClick={() => setSelectedProgram("Todos")}
            className={`px-4 py-2 rounded-full font-roboto text-label-sm transition-all active:scale-95 min-h-[44px] flex items-center justify-center border whitespace-nowrap ${
              selectedProgram === "Todos"
                ? "bg-accent text-primary border-accent shadow-sm"
                : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10 hover:bg-accent/10"
            }`}
          >
            Todos
          </button>
          {programs.map((prog) => {
            const color = getProgramColor(prog.name);
            const isSelected = selectedProgram === prog.name;
            return (
              <button
                key={prog.id}
                onClick={() => setSelectedProgram(prog.name)}
                className={`px-4 py-2 rounded-full font-roboto text-label-sm transition-all active:scale-95 min-h-[44px] flex items-center justify-center border whitespace-nowrap ${
                  isSelected
                    ? `${color.bg} ${color.text} ${color.border} shadow-sm`
                    : `bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10 ${color.hover}`
                }`}
              >
                {prog.name}
              </button>
            );
          })}
        </div>

        {selectedProgram !== "Todos" && (
          <div className="mb-4">
            <span className={`inline-block px-4 py-1.5 rounded-full font-roboto text-label-md font-semibold ${getProgramColor(selectedProgram).bg} ${getProgramColor(selectedProgram).text} border ${getProgramColor(selectedProgram).border}`}>
              {selectedProgram}
            </span>
            <span className="ml-2 text-sm text-on-surface-variant dark:text-gray-300">
              {activities.length} atividade(s)
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          ) : activities.length === 0 ? (
            <div className="col-span-full text-center py-20 text-on-surface-variant dark:text-gray-400">
              {selectedProgram === "Todos"
                ? "Nenhuma atividade para esta semana."
                : `Nenhuma atividade para ${selectedProgram} nesta semana.`}
            </div>
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
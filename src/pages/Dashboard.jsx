import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, subDays, subWeeks, addWeeks, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ActivityCard from "../components/activities/ActivityCard";
import SkeletonCard from "../components/ui/SkeletonCard";
import WeeklyListView from "../components/activities/WeeklyListView";
import { useCurrentUser } from "../context/CurrentUserContext";
import { getProgramColor } from "../lib/colors";
import { generateWeeklyPDF } from "../lib/pdfGenerator";
import { useLanguage } from "../i18n/context";

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
  const [selectedProgram, setSelectedProgram] = useState(() => {
    const saved = localStorage.getItem("iracambi_dashboard_program");
    return saved && saved !== "Todos" ? saved : programFromUrl;
  });
  const [programs, setPrograms] = useState([]);
  const [programIds, setProgramIds] = useState({});
  const [currentMonday, setCurrentMonday] = useState(getCurrentMonday());
  const [onlyMine, setOnlyMine] = useState(() => {
    const saved = localStorage.getItem("iracambi_dashboard_onlyMine");
    return saved === "true";
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("iracambi_dashboard_viewMode") || "cards";
  });

  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5);

  const filterContainerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const { t } = useLanguage();

  // Persistir preferências
  useEffect(() => {
    localStorage.setItem("iracambi_dashboard_onlyMine", onlyMine);
  }, [onlyMine]);
  useEffect(() => {
    if (selectedProgram) localStorage.setItem("iracambi_dashboard_program", selectedProgram);
  }, [selectedProgram]);
  useEffect(() => {
    localStorage.setItem("iracambi_dashboard_viewMode", viewMode);
  }, [viewMode]);

  // Carregar programas
  useEffect(() => {
    fetchPrograms();
  }, []);

  // Sincronizar programa da URL
  useEffect(() => {
    setSelectedProgram(programFromUrl);
  }, [programFromUrl]);

  // Buscar atividades quando filtros mudarem
  useEffect(() => {
    setLoading(true);
    fetchActivities();
  }, [selectedProgram, onlyMine, currentMonday, searchTerm]);

  async function fetchPrograms() {
    const { data } = await supabase.from("programs").select("id, name").order("name");
    if (data) {
      setPrograms(data);
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
    if (onlyMine && currentUser?.id) {
      query = query.eq("responsible_id", currentUser.id);
    }
    if (searchTerm.trim()) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query.order("due_date", { ascending: true }).order("id", { ascending: true });
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

  const handleExportPDF = async () => {
    await generateWeeklyPDF({ weekStart: format(weekStart, "yyyy-MM-dd"), weekEnd: format(weekEnd, "yyyy-MM-dd"), activities });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setStartX(e.pageX - filterContainerRef.current.offsetLeft);
    setScrollLeft(filterContainerRef.current.scrollLeft);
    filterContainerRef.current.style.cursor = "grabbing";
  };
  const handleMouseUp = () => {
    setIsDragging(false);
    if (filterContainerRef.current) filterContainerRef.current.style.cursor = "grab";
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
      if (filterContainerRef.current) filterContainerRef.current.style.cursor = "grab";
    }
  };

  // Cálculo da barra de progresso
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.status === "Realizado").length;
  const progressPercent = totalActivities > 0 ? Math.round((completedActivities / totalActivities) * 100) : 0;

  return (
    <section>
      {currentUser && (
        <p className="text-body-md text-on-surface dark:text-gray-200 mb-4">
          {t("common.welcome")}, <span className="font-semibold text-primary dark:text-white">{currentUser.name}</span>.
        </p>
      )}

      {/* Barra de progresso */}
      <div className="mb-6 bg-surface dark:bg-white/5 rounded-xl p-4 border border-surface-variant dark:border-white/10">
        <div className="flex justify-between text-sm font-roboto mb-2">
          <span className="text-on-surface dark:text-gray-200">Atividades realizadas esta semana</span>
          <span className="text-primary dark:text-white font-bold">{completedActivities} / {totalActivities} ({progressPercent}%)</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div className="bg-green-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-1">{t("dashboard.title")}</h2>
          <p className="text-on-surface-variant dark:text-gray-300 text-sm md:text-base">
            {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={goToPreviousWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_left</span>
          </button>
          <button onClick={goToCurrentWeek} className="px-4 py-2 rounded-full bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-700/40 dark:text-green-200 dark:hover:bg-green-700/60 font-roboto text-label-sm min-h-[44px] flex items-center">
            {t("common.today")}
          </button>
          <button onClick={goToNextWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_right</span>
          </button>
          <button onClick={handleExportPDF} className="px-4 py-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 font-roboto text-label-sm min-h-[44px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> PDF
          </button>
          <button onClick={() => setViewMode(viewMode === "cards" ? "list" : "cards")} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-roboto text-label-sm min-h-[44px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{viewMode === "cards" ? "view_list" : "grid_view"}</span>
            {viewMode === "cards" ? "Lista" : "Cards"}
          </button>
          <button onClick={() => setOnlyMine(!onlyMine)} className={`px-4 py-2 rounded-full font-roboto text-label-sm min-h-[44px] flex items-center gap-2 transition-all ${onlyMine ? "bg-primary text-white" : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border border-surface-variant"}`}>
            {onlyMine ? "Apenas minhas atividades" : "Todas as atividades"}
          </button>
        </div>
      </div>

      {/* Campo de busca */}
      <div className="mb-4 flex justify-end">
        <div className="relative w-full max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          </span>
          <input type="text" placeholder="Buscar por título ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-8 pr-3 py-2 rounded-full bg-surface dark:bg-dark-background border border-surface-variant dark:border-white/10 focus:border-accent outline-none text-sm" />
        </div>
      </div>

      {/* Filtros de programa */}
      <div ref={filterContainerRef} className="flex flex-nowrap gap-2 mb-8 overflow-x-auto pb-4 scrollbar-hide cursor-grab select-none" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
        <button onClick={() => setSelectedProgram("Todos")} className={`px-4 py-2 rounded-full font-roboto text-label-sm transition-all active:scale-95 min-h-[44px] flex items-center justify-center border whitespace-nowrap ${selectedProgram === "Todos" ? "bg-accent text-primary border-accent shadow-sm" : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10 hover:bg-accent/10"}`}>
          {t("common.all")}
        </button>
        {programs.map((prog) => {
          const color = getProgramColor(prog.name);
          return (
            <button key={prog.id} onClick={() => setSelectedProgram(prog.name)} className={`px-4 py-2 rounded-full font-roboto text-label-sm transition-all active:scale-95 min-h-[44px] flex items-center justify-center border whitespace-nowrap ${selectedProgram === prog.name ? `${color.bg} ${color.text} ${color.border} shadow-sm` : `bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border-surface-variant dark:border-white/10 ${color.hover}`}`}>
              {prog.name}
            </button>
          );
        })}
      </div>

      {selectedProgram !== "Todos" && (
        <div className="mb-4">
          <span className={`inline-block px-4 py-1.5 rounded-full font-roboto text-label-md font-semibold ${getProgramColor(selectedProgram).bg} ${getProgramColor(selectedProgram).text} border ${getProgramColor(selectedProgram).border}`}>{selectedProgram}</span>
          <span className="ml-2 text-sm text-on-surface-variant dark:text-gray-300">{t("dashboard.activitiesCount", { count: activities.length })}</span>
        </div>
      )}

      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
          {loading ? Array.from({ length: 10 }).map((_, i) => <SkeletonCard key={i} />) : activities.length === 0 ? (
            <div className="col-span-full text-center py-20 text-on-surface-variant dark:text-gray-400">
              {selectedProgram === "Todos" ? t("dashboard.noActivities") : t("dashboard.noActivitiesForProgram", { program: selectedProgram })}
            </div>
          ) : (
            activities.map((activity) => <ActivityCard key={activity.id} activity={activity} />)
          )}
        </div>
      ) : (
        <WeeklyListView activities={activities} loading={loading} />
      )}
    </section>
  );
}
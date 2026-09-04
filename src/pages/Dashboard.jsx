/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, startOfMonth, endOfMonth, addDays, subDays, subWeeks, addWeeks, subMonths, addMonths, format, parseISO } from "date-fns";
import ActivityCard from "../components/activities/ActivityCard";
import SkeletonCard from "../components/ui/SkeletonCard";
import WeeklyListView from "../components/activities/WeeklyListView";
import { useCurrentUser } from "../context/CurrentUserContext";
import { getProgramColor } from "../lib/colors";
import { generateWeeklyPDF } from "../lib/pdfGenerator";
import { useLanguage } from "../i18n/context";
import ProgramSwitcher from "../components/ui/ProgramSwitcher";
import ProgressOverview from "../components/dashboard/ProgressOverview";
import PeriodNavigator from "../components/dashboard/PeriodNavigator";
import PendingIssuesBanner from "../components/dashboard/PendingIssuesBanner";

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
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [periodMode, setPeriodMode] = useState(() => localStorage.getItem("iracambi_dashboard_periodMode") || "week");
  const [onlyMine, setOnlyMine] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem("iracambi_dashboard_viewMode") || "cards";
  });

  const weekStart = periodMode === "month" ? startOfMonth(currentMonth) : currentMonday;
  const weekEnd = periodMode === "month" ? endOfMonth(currentMonth) : addDays(weekStart, 5);
  const overdueThreshold = format(getCurrentMonday(), "yyyy-MM-dd");

  const { t } = useLanguage();

  useEffect(() => {
    localStorage.removeItem("iracambi_dashboard_onlyMine");
  }, []);
  useEffect(() => {
    if (selectedProgram) localStorage.setItem("iracambi_dashboard_program", selectedProgram);
  }, [selectedProgram]);
  useEffect(() => {
    localStorage.setItem("iracambi_dashboard_viewMode", viewMode);
  }, [viewMode]);
  useEffect(() => {
    localStorage.setItem("iracambi_dashboard_periodMode", periodMode);
  }, [periodMode]);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    setSelectedProgram(programFromUrl);
  }, [programFromUrl]);

  useEffect(() => {
    setLoading(true);
    fetchActivities();
  }, [selectedProgram, onlyMine, currentMonday, currentMonth, periodMode, searchTerm]);

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
      .select("*, programs:program_id(name), persons:responsible_id(name, initials, is_active)")
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

  const goToPreviousPeriod = () => periodMode === "month" ? setCurrentMonth((value) => subMonths(value, 1)) : setCurrentMonday((value) => subWeeks(value, 1));
  const goToNextPeriod = () => periodMode === "month" ? setCurrentMonth((value) => addMonths(value, 1)) : setCurrentMonday((value) => addWeeks(value, 1));
  const goToCurrentPeriod = () => periodMode === "month" ? setCurrentMonth(new Date()) : setCurrentMonday(getCurrentMonday());
  const selectPeriodDate = (value) => {
    if (!value) return;
    const selectedDate = parseISO(value);
    if (periodMode === "month") setCurrentMonth(selectedDate);
    else setCurrentMonday(startOfWeek(selectedDate, { weekStartsOn: 1 }));
  };

  const handleExportPDF = async () => {
    await generateWeeklyPDF({ weekStart: format(weekStart, "yyyy-MM-dd"), weekEnd: format(weekEnd, "yyyy-MM-dd"), activities });
  };

  const activitiesInPeriod = activities.filter((activity) => activity.due_date >= format(weekStart, "yyyy-MM-dd") && activity.due_date <= format(weekEnd, "yyyy-MM-dd"));

  const isCurrentPeriod = () => {
    const today = new Date();
    if (periodMode === "month") return format(today, "yyyy-MM") === format(currentMonth, "yyyy-MM");
    const currentMonday = startOfWeek(today, { weekStartsOn: 1 });
    return format(currentMonday, "yyyy-MM-dd") === format(weekStart, "yyyy-MM-dd");
  };
  const currentWeekFlag = isCurrentPeriod();

  return (
    <section>
      {currentUser && (
        <p className="text-body-md text-on-surface dark:text-gray-200 mb-4 text-center md:text-left">
          {t("common.welcome")}, <span className="font-semibold text-primary dark:text-white">{currentUser.name}</span>.
        </p>
      )}
      <PendingIssuesBanner />

      <ProgressOverview
        activities={activitiesInPeriod}
        loading={loading}
        periodMode={periodMode}
        startDate={format(weekStart, "yyyy-MM-dd")}
        endDate={format(weekEnd, "yyyy-MM-dd")}
        selectedProgram={selectedProgram}
        onlyMine={onlyMine}
        currentUser={currentUser}
        searchTerm={searchTerm}
      />

      <PeriodNavigator
        periodMode={periodMode}
        startDate={weekStart}
        endDate={weekEnd}
        isCurrent={currentWeekFlag}
        activities={activitiesInPeriod}
        onModeChange={setPeriodMode}
        onPrevious={goToPreviousPeriod}
        onNext={goToNextPeriod}
        onToday={goToCurrentPeriod}
        onSelectDate={selectPeriodDate}
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-1">{t("dashboard.title")}</h2>
        </div>
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
          <button onClick={handleExportPDF} className="px-4 py-2 rounded-full bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 font-roboto text-label-sm min-h-[44px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span> PDF
          </button>
          <button onClick={() => setViewMode(viewMode === "cards" ? "list" : "cards")} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 font-roboto text-label-sm min-h-[44px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">{viewMode === "cards" ? "view_list" : "grid_view"}</span>
            {viewMode === "cards" ? "Lista" : "Cards"}
          </button>
          <button onClick={() => setOnlyMine(!onlyMine)} aria-pressed={onlyMine} className={`px-4 py-2 rounded-full font-roboto text-label-sm min-h-[44px] flex items-center gap-2 transition-all ${onlyMine ? "bg-primary text-white" : "bg-surface dark:bg-white/5 text-on-surface dark:text-gray-300 border border-surface-variant"}`}>
            <span className="material-symbols-outlined text-[18px]">{onlyMine ? "groups" : "person"}</span>
            {onlyMine ? "Mostrar todas as atividades" : "Mostrar apenas minhas"}
          </button>
        </div>
      </div>

      {/* Navegação por programa e busca */}
      <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:justify-between">
        <ProgramSwitcher programs={programs} value={selectedProgram} onChange={setSelectedProgram} className="w-full lg:max-w-xl lg:flex-1" />
        <div className="relative w-full lg:max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2">
            <span className="material-symbols-outlined text-gray-400 text-lg">search</span>
          </span>
          <input type="text" placeholder="Buscar por título ou descrição..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="min-h-[56px] w-full rounded-2xl border border-surface-variant bg-white pl-9 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-dark-surface dark:text-white" />
        </div>
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
            activities.map((activity) => <ActivityCard key={activity.id} activity={activity} attention={activity.due_date < overdueThreshold && !["Realizado", "Cancelado"].includes(activity.status)} />)
          )}
        </div>
      ) : (
        <WeeklyListView activities={activities} loading={loading} periodMode={periodMode} attentionBefore={overdueThreshold} />
      )}
    </section>
  );
}

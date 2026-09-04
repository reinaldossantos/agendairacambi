/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { format, subDays } from "date-fns";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "./CurrentUserContext";

const PendingIssuesContext = createContext(null);
const FINAL_ACTIVITY_STATUSES = ["Realizado", "Cancelado"];

export function PendingIssuesProvider({ children }) {
  const { currentUser } = useCurrentUser();
  const userId = currentUser?.id;
  const [vehicleIssues, setVehicleIssues] = useState([]);
  const [activityIssues, setActivityIssues] = useState([]);
  const [bonusIssues, setBonusIssues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError("");
    const now = new Date();
    const today = format(now, "yyyy-MM-dd");
    const staleLimit = subDays(now, 7).toISOString();
    const [vehicleResult, activityResult, managerResult] = await Promise.all([
      supabase
        .from("vehicle_bookings")
        .select("id,start_at,end_at,purpose,destination,start_odometer,end_odometer,status,vehicle:vehicle_id(name,plate)")
        .eq("person_id", userId)
        .eq("status", "scheduled")
        .lt("end_at", now.toISOString())
        .order("end_at", { ascending: false }),
      supabase
        .from("activities")
        .select("id,title,status,due_date,created_at,program:program_id(name)")
        .eq("responsible_id", userId)
        .not("status", "in", `(${FINAL_ACTIVITY_STATUSES.map((status) => `"${status}"`).join(",")})`)
        .order("due_date", { ascending: true }),
      supabase.from("expense_approval_config").select("person_id").eq("person_id", userId).eq("is_active", true).maybeSingle(),
    ]);
    const firstError = vehicleResult.error || activityResult.error || managerResult.error;
    if (firstError) {
      setError(`Não foi possível consultar todas as pendências: ${firstError.message}`);
      setLoading(false);
      return;
    }

    const activities = activityResult.data || [];
    let statusLogs = [];
    if (activities.length) {
      const { data, error: logsError } = await supabase
        .from("activity_logs")
        .select("activity_id,created_at")
        .eq("type", "status_change")
        .in("activity_id", activities.map((activity) => activity.id))
        .order("created_at", { ascending: false });
      if (logsError) setError(`Não foi possível consultar a movimentação das atividades: ${logsError.message}`);
      statusLogs = data || [];
    }

    const lastStatusChange = new Map();
    statusLogs.forEach((log) => {
      if (!lastStatusChange.has(log.activity_id)) lastStatusChange.set(log.activity_id, log.created_at);
    });
    setVehicleIssues((vehicleResult.data || []).map((booking) => ({ ...booking, kind: "vehicle" })));
    setActivityIssues(activities.flatMap((activity) => {
      const overdue = activity.due_date && activity.due_date < today;
      const lastChange = lastStatusChange.get(activity.id) || activity.created_at;
      const stale = Boolean(lastChange && lastChange <= staleLimit);
      if (!overdue && !stale) return [];
      return [{ ...activity, kind: "activity", overdue, stale, last_status_change: lastChange }];
    }));
    if (managerResult.data) {
      const { data, error: bonusError } = await supabase.from("souvenir_movements")
        .select("id,quantity,recipient_name,requested_at,product:product_id(name),requester:requested_by(name)")
        .eq("movement_type", "bonus").eq("status", "pending_approval").neq("requested_by", userId).order("requested_at");
      if (bonusError) setError(`Não foi possível consultar as bonificações pendentes: ${bonusError.message}`);
      setBonusIssues((data || []).map((item) => ({ ...item, kind: "bonus" })));
    } else setBonusIssues([]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    const timer = window.setTimeout(refresh, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  useEffect(() => {
    if (!userId) return undefined;
    const channel = supabase.channel(`pending-issues-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "vehicle_bookings" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "activities" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, refresh)
      .on("postgres_changes", { event: "*", schema: "public", table: "souvenir_movements" }, refresh)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [userId, refresh]);

  const value = useMemo(() => ({
    vehicleIssues,
    activityIssues,
    bonusIssues,
    issues: [...vehicleIssues, ...activityIssues, ...bonusIssues],
    count: vehicleIssues.length + activityIssues.length + bonusIssues.length,
    loading,
    error,
    refresh,
  }), [vehicleIssues, activityIssues, bonusIssues, loading, error, refresh]);

  return <PendingIssuesContext.Provider value={value}>{children}</PendingIssuesContext.Provider>;
}

export function usePendingIssues() {
  return useContext(PendingIssuesContext) || { vehicleIssues: [], activityIssues: [], bonusIssues: [], issues: [], count: 0, loading: false, error: "", refresh: async () => {} };
}

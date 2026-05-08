import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser || !currentUser.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      // Atividades do usuário (responsável ou envolvido)
      const { data: activitiesResponsible } = await supabase
        .from("activities")
        .select("id")
        .eq("responsible_id", currentUser.id);

      const { data: activitiesInvolved } = await supabase
        .from("activities")
        .select("id")
        .contains("involved_ids", [currentUser.id]);

      const responsibleIds = (activitiesResponsible || []).map(a => a.id);
      const involvedIds = (activitiesInvolved || []).map(a => a.id);
      const allActivityIds = [...new Set([...responsibleIds, ...involvedIds])];

      let query = supabase
        .from("activity_logs")
        .select("id, type, content, created_at, activity:activity_id(title, id), person:person_id(name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (allActivityIds.length > 0) {
        query = query.or(
          `activity_id.in.(${allActivityIds.join(",")}),and(activity_id.is.null,person_id.eq.${currentUser.id})`
        );
      } else {
        query = query.and("activity_id.is.null,person_id.eq.${currentUser.id}");
      }

      const { data: logs } = await query;
      setNotifications(logs || []);
      setUnreadCount(logs?.length || 0);
    } catch (err) {
      console.error("Erro ao buscar notificações", err);
    }
  }, [currentUser]);

  // Fallback de lembretes (mantido)
  const generateClientReminders = useCallback(async () => {
    if (!currentUser) return;
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const { data: activitiesTomorrow } = await supabase
      .from("activities")
      .select("id, title, responsible_id, involved_ids")
      .eq("due_date", tomorrowStr)
      .not("status", "in", '("Realizado","Pendente")');

    if (!activitiesTomorrow?.length) return;

    for (const act of activitiesTomorrow) {
      const { data: existing } = await supabase
        .from("activity_logs")
        .select("id")
        .eq("activity_id", act.id)
        .eq("type", "reminder")
        .gte("created_at", today.toISOString().split("T")[0]);

      if (existing && existing.length === 0) {
        await supabase.from("activity_logs").insert({
          activity_id: act.id,
          person_id: act.responsible_id,
          type: "reminder",
          content: `Lembrete: a atividade "${act.title}" vence amanhã.`,
        });
        if (act.involved_ids?.length) {
          const logs = act.involved_ids.map(pid => ({
            activity_id: act.id,
            person_id: pid,
            type: "reminder",
            content: `Lembrete: você está envolvido na atividade "${act.title}" que vence amanhã.`,
          }));
          await supabase.from("activity_logs").insert(logs);
        }
      }
    }
  }, [currentUser]);

  useEffect(() => {
    fetchNotifications();
    generateClientReminders();
    const interval = setInterval(() => {
      fetchNotifications();
      generateClientReminders();
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications, generateClientReminders]);

  // Realtime
  useEffect(() => {
    if (!currentUser) return;
    const channel = supabase
      .channel("public:activity_logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "activity_logs" }, () => {
        fetchNotifications();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchNotifications, currentUser]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  const toggleOpen = () => {
    setOpen((prev) => !prev);
    if (!open) {
      fetchNotifications();
    }
  };

  return { notifications, unreadCount, open, toggleOpen, dropdownRef };
}
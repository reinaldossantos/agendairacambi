import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../lib/supabaseClient";

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // Atividades em que sou responsável ou envolvido
    const { data: responsibleData } = await supabase
      .from("activities")
      .select("id")
      .eq("responsible_id", currentUser.id);

    const { data: involvedData } = await supabase
      .from("activities")
      .select("id")
      .contains("involved_ids", [currentUser.id]);

    const activityIds = [
      ...new Set([
        ...(responsibleData || []).map(a => a.id),
        ...(involvedData || []).map(a => a.id),
      ]),
    ];

    let query = supabase
      .from("activity_logs")
      .select(
        "id, type, content, created_at, activity:activity_id(title, id), person:person_id(name)"
      )
      .order("created_at", { ascending: false })
      .limit(30);

    if (activityIds.length > 0) {
      // Logs das atividades vinculadas OU logs diretos para o usuário
      query = query.or(
        `activity_id.in.(${activityIds.join(",")}),person_id.eq.${currentUser.id}`
      );
    } else {
      query = query.eq("person_id", currentUser.id);
    }

    const { data: logs } = await query;
    setNotifications(logs || []);
    setUnreadCount(logs?.length || 0);
  }, [currentUser]);

  // Polling a cada 5 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Realtime (Supabase)
  useEffect(() => {
    if (!currentUser?.id) return;
    const channel = supabase
      .channel("public:activity_logs")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "activity_logs" },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser, fetchNotifications]);

  // Fechar dropdown clicando fora
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
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
    if (!open) fetchNotifications();
  };

  return { notifications, unreadCount, open, toggleOpen, dropdownRef };
}
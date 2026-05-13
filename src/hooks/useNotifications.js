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
      // Busca atividades onde o usuário é responsável ou está envolvido
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
        .limit(30);

      // Combina: logs das atividades vinculadas OU logs diretos para o usuário
      if (allActivityIds.length > 0) {
        query = query.or(
          `activity_id.in.(${allActivityIds.join(",")}),person_id.eq.${currentUser.id}`
        );
      } else {
        query = query.eq("person_id", currentUser.id);
      }

      const { data: logs } = await query;
      setNotifications(logs || []);
      setUnreadCount(logs?.length || 0);
    } catch (err) {
      console.error("Erro ao buscar notificações", err);
    }
  }, [currentUser]);

  // Polling a cada 5 segundos
  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 5000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

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

  // Fechar dropdown ao clicar fora
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
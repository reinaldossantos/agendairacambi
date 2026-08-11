import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export function useNotifications(currentUser) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationError, setNotificationError] = useState("");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]); setUnreadCount(0); setNotificationError("");
      return;
    }

    const [responsibleResult, involvedResult] = await Promise.all([
      supabase.from("activities").select("id").eq("responsible_id", currentUser.id),
      supabase.from("activities").select("id").contains("involved_ids", [currentUser.id]),
    ]);
    if (responsibleResult.error || involvedResult.error) {
      setNotificationError(`Não foi possível verificar suas atividades: ${(responsibleResult.error || involvedResult.error).message}`);
      return;
    }
    const activityIds = [...new Set([...(responsibleResult.data || []).map((item) => item.id), ...(involvedResult.data || []).map((item) => item.id)])];
    let activityQuery = supabase.from("activity_logs")
      .select("id,type,content,created_at,person_id,activity:activity_id(title,id),person:person_id(name)")
      .order("created_at", { ascending: false }).limit(30);
    activityQuery = activityIds.length
      ? activityQuery.or(`activity_id.in.(${activityIds.join(",")}),person_id.eq.${currentUser.id}`)
      : activityQuery.eq("person_id", currentUser.id);

    const [logsResult, expenseResult, securityResult, projectResult, purchaseResult] = await Promise.all([
      activityQuery,
      supabase.from("expense_report_notifications").select("id,type,title,content,created_at,read_at,report_id,person:actor_id(name)").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("security_notifications").select("id,type,title,content,created_at,is_read").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("management_project_notifications").select("id,title,content,created_at,read_at,project_id,person:actor_id(name)").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(30),
      supabase.from("purchase_request_notifications").select("id,type,title,content,created_at,read_at,request_id,person:actor_id(name)").eq("recipient_id", currentUser.id).order("created_at", { ascending: false }).limit(30),
    ]);
    const queryError = logsResult.error || expenseResult.error || securityResult.error || projectResult.error || purchaseResult.error;
    if (queryError) {
      setNotificationError(`Não foi possível carregar as notificações: ${queryError.message}`);
      return;
    }

    const activityLogs = (logsResult.data || []).filter((item) => !(item.type === "comment" && item.person_id === currentUser.id));
    const logIds = activityLogs.map((item) => String(item.id));
    let readIds = new Set();
    if (logIds.length) {
      const { data: reads, error: readsError } = await supabase.from("activity_notification_reads").select("log_id").eq("person_id", currentUser.id).in("log_id", logIds);
      if (readsError) {
        setNotificationError(`Não foi possível consultar a leitura das notificações: ${readsError.message}`);
        return;
      }
      readIds = new Set((reads || []).map((item) => String(item.log_id)));
    }

    const activityTitles = { mention: "Você foi mencionado", involvement: "Você foi incluído", comment: "Novo comentário", file: "Novo arquivo", create: "Nova atividade" };
    const activityNotifications = activityLogs.map((item) => ({ ...item, title: activityTitles[item.type] || "Atualização da atividade", source: "activity", is_read: readIds.has(String(item.id)) }));
    const expenseNotifications = (expenseResult.data || []).map((item) => ({ ...item, source: "expense_report", link: "/expense-reports", is_read: Boolean(item.read_at) }));
    const securityNotifications = (securityResult.data || []).map((item) => ({ ...item, source: "security", link: "/admin/persons" }));
    const projectNotifications = (projectResult.data || []).map((item) => ({ ...item, source: "project", link: `/projects/${item.project_id}`, is_read: Boolean(item.read_at) }));
    const purchaseNotifications = (purchaseResult.data || []).map((item) => ({ ...item, source: "purchase_request", link: "/purchase-requests", is_read: Boolean(item.read_at) }));
    const combined = [...activityNotifications, ...expenseNotifications, ...securityNotifications, ...projectNotifications, ...purchaseNotifications]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 30);
    setNotifications(combined);
    setUnreadCount(combined.filter((item) => !item.is_read).length);
    setNotificationError("");
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser?.id) return undefined;
    const initialFetch = window.setTimeout(fetchNotifications, 0);
    const realtimeStatus = (status) => {
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") setNotificationError("A atualização automática das notificações foi interrompida. Abra o sino para tentar atualizar.");
    };
    const activityChannel = supabase.channel("notifications:activity_logs")
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_logs" }, fetchNotifications).subscribe(realtimeStatus);
    const expenseChannel = supabase.channel("notifications:expense_reports")
      .on("postgres_changes", { event: "*", schema: "public", table: "expense_report_notifications" }, fetchNotifications).subscribe(realtimeStatus);
    const securityChannel = supabase.channel("notifications:security")
      .on("postgres_changes", { event: "*", schema: "public", table: "security_notifications" }, fetchNotifications).subscribe(realtimeStatus);
    const projectChannel = supabase.channel("notifications:projects")
      .on("postgres_changes", { event: "*", schema: "public", table: "management_project_notifications" }, fetchNotifications).subscribe(realtimeStatus);
    const purchaseChannel = supabase.channel("notifications:purchases")
      .on("postgres_changes", { event: "*", schema: "public", table: "purchase_request_notifications" }, fetchNotifications).subscribe(realtimeStatus);
    return () => {
      window.clearTimeout(initialFetch);
      supabase.removeChannel(activityChannel); supabase.removeChannel(expenseChannel); supabase.removeChannel(securityChannel); supabase.removeChannel(projectChannel); supabase.removeChannel(purchaseChannel);
    };
  }, [currentUser, fetchNotifications]);

  useEffect(() => {
    const closeOutside = (event) => dropdownRef.current && !dropdownRef.current.contains(event.target) && setOpen(false);
    if (open) { document.addEventListener("mousedown", closeOutside); document.addEventListener("touchstart", closeOutside); }
    return () => { document.removeEventListener("mousedown", closeOutside); document.removeEventListener("touchstart", closeOutside); };
  }, [open]);

  async function toggleOpen() {
    const opening = !open;
    setOpen(opening);
    if (!opening || !currentUser?.id) return;
    const unreadActivity = notifications.filter((item) => item.source === "activity" && !item.is_read);
    const operations = [
      supabase.from("expense_report_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", currentUser.id).is("read_at", null),
      supabase.from("security_notifications").update({ is_read: true }).eq("recipient_id", currentUser.id).eq("is_read", false),
      supabase.from("purchase_request_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", currentUser.id).is("read_at", null),
    ];
    if (notifications.some((item) => item.source === "project" && !item.is_read)) operations.push(supabase.from("management_project_notifications").update({ read_at: new Date().toISOString() }).eq("recipient_id", currentUser.id).is("read_at", null));
    if (unreadActivity.length) operations.push(supabase.from("activity_notification_reads").upsert(unreadActivity.map((item) => ({ log_id: String(item.id), person_id: currentUser.id })), { onConflict: "log_id,person_id" }));
    const results = await Promise.all(operations);
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) setNotificationError(`Não foi possível marcar as notificações como lidas: ${updateError.message}`);
    await fetchNotifications();
  }

  return { notifications, unreadCount, notificationError, open, toggleOpen, dropdownRef };
}

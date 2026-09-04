import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ConfirmDialog from "../ui/ConfirmDialog";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { usePendingIssues } from "../../context/PendingIssuesContext";

const ALERT_SESSION_KEY = "iracambi_pending_alert_access";

export default function PendingLoginAlert() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const { count, vehicleIssues, activityIssues, loading } = usePendingIssues();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (loading || !currentUser?.id || count === 0) return;
    const accessId = localStorage.getItem("iracambi_access_log_id") || `user-${currentUser.id}`;
    const alertId = `${currentUser.id}:${accessId}`;
    if (sessionStorage.getItem(ALERT_SESSION_KEY) === alertId) return;
    sessionStorage.setItem(ALERT_SESSION_KEY, alertId);
    const timer = window.setTimeout(() => setOpen(true), 0);
    return () => window.clearTimeout(timer);
  }, [activityIssues.length, count, currentUser?.id, loading, vehicleIssues.length]);

  const message = `Encontramos ${count} pendência${count === 1 ? "" : "s"} para o seu usuário: ${vehicleIssues.length} de veículo e ${activityIssues.length} de atividade. Consulte a Central de Pendências para regularizar.`;

  return <ConfirmDialog
    isOpen={open}
    title="Você possui pendências"
    message={message}
    confirmText="Ver pendências"
    cancelText="Agora não"
    variant="warning"
    onCancel={() => setOpen(false)}
    onConfirm={() => { setOpen(false); navigate("/pending-issues"); }}
  />;
}

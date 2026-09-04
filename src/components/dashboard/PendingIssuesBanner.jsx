import { Link } from "react-router-dom";
import { usePendingIssues } from "../../context/PendingIssuesContext";

export default function PendingIssuesBanner() {
  const { count, vehicleIssues, activityIssues, loading } = usePendingIssues();
  if (loading || count === 0) return null;
  return <div role="alert" className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 shadow-sm dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-100 sm:flex-row sm:items-center">
    <span className="material-symbols-outlined rounded-xl bg-amber-200 p-2 text-amber-800 dark:bg-amber-900 dark:text-amber-200">notification_important</span>
    <div className="flex-1"><strong className="block">Você possui {count} pendência{count === 1 ? "" : "s"}</strong><p className="text-sm">{vehicleIssues.length} de veículo e {activityIssues.length} de atividade. Os avisos permanecerão até a regularização.</p></div>
    <Link to="/pending-issues" className="rounded-full bg-amber-400 px-5 py-2.5 text-center text-sm font-black text-primary hover:bg-amber-300">Ver pendências</Link>
  </div>;
}

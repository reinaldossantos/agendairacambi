import { Navigate, Routes, Route } from "react-router-dom";
import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import NewActivity from "./pages/NewActivity";
import History from "./pages/History";
import Programs from "./pages/Programs";
import ActivityDetail from "./pages/ActivityDetail";
import Settings from "./pages/Settings";
import AdminPrograms from "./pages/AdminPrograms";
import AdminPersons from "./pages/AdminPersons";
import AdminLeaders from "./pages/AdminLeaders";
import AdminMaintenance from "./pages/AdminMaintenance";
import About from "./pages/About";
import Calendar from "./pages/Calendar";
import Stats from "./pages/Stats";
import Announcements from "./pages/Announcements";
import ProgramFiles from "./pages/ProgramFiles";
import AdvancedSettings from "./pages/AdvancedSettings";
import Vehicles from "./pages/Vehicles";
import ExpenseReports from "./pages/ExpenseReports";
import ExpenseReportSummary from "./pages/ExpenseReportSummary";
import MonthlyActivityReports from "./pages/MonthlyActivityReports";
import AuditLog from "./pages/AuditLog";
import Login from "./pages/Login";
import ChangePassword from "./pages/ChangePassword";
import Events from "./pages/Events";
import Projects from "./pages/Projects";
import ProjectEditor from "./pages/ProjectEditor";
import ProjectDetail from "./pages/ProjectDetail";
import { useCurrentUser } from "./context/CurrentUserContext";

function ReinaldoOnly({ children }) {
  const { currentUser } = useCurrentUser();
  const normalizedName = currentUser?.name?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return normalizedName === "reinaldo" ? children : <Navigate to="/" replace />;
}

function AdminOnly({ children }) {
  const { currentUser } = useCurrentUser();
  return currentUser?.access_role === "admin" ? children : <Navigate to="/" replace />;
}

function AuthenticatedLayout() {
  const { session, currentUser, authLoading } = useCurrentUser();
  if (authLoading) return <div className="flex min-h-screen items-center justify-center text-primary">Verificando acesso…</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (!currentUser) return <Navigate to="/login" replace />;
  if (currentUser?.must_change_password) return <Navigate to="/change-password" replace />;
  return <Layout />;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/change-password" element={<ChangePassword />} />
      <Route path="/reset-password" element={<ChangePassword />} />
      <Route element={<AuthenticatedLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewActivity />} />
        <Route path="/history" element={<History />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/activity/:id" element={<ActivityDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/programs" element={<AdminOnly><AdminPrograms /></AdminOnly>} />
        <Route path="/admin/persons" element={<AdminOnly><AdminPersons /></AdminOnly>} />
        <Route path="/admin/leaders" element={<AdminOnly><AdminLeaders /></AdminOnly>} />
        <Route path="/admin/maintenance" element={<AdminOnly><AdminMaintenance /></AdminOnly>} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/events" element={<Events />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ProjectEditor />} />
        <Route path="/projects/:id" element={<ProjectDetail />} />
        <Route path="/projects/:id/edit" element={<ProjectEditor />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/files" element={<ProgramFiles />} />
        <Route path="/advanced-settings" element={<AdminOnly><AdvancedSettings /></AdminOnly>} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/expense-reports" element={<ExpenseReports />} />
        <Route path="/expense-report-summary" element={<ExpenseReportSummary />} />
        <Route path="/monthly-activity-reports" element={<MonthlyActivityReports />} />
        <Route path="/audit-log" element={<ReinaldoOnly><AuditLog /></ReinaldoOnly>} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;

import { Routes, Route } from "react-router-dom";
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
import About from "./pages/About";
import Calendar from "./pages/Calendar";
import Stats from "./pages/Stats";
import Announcements from "./pages/Announcements";
import ProgramFiles from "./pages/ProgramFiles";
import AdvancedSettings from "./pages/AdvancedSettings";

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/new" element={<NewActivity />} />
        <Route path="/history" element={<History />} />
        <Route path="/programs" element={<Programs />} />
        <Route path="/activity/:id" element={<ActivityDetail />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin/programs" element={<AdminPrograms />} />
        <Route path="/admin/persons" element={<AdminPersons />} />
        <Route path="/admin/leaders" element={<AdminLeaders />} />
        <Route path="/calendar" element={<Calendar />} />
        <Route path="/stats" element={<Stats />} />
        <Route path="/announcements" element={<Announcements />} />
        <Route path="/files" element={<ProgramFiles />} />
        <Route path="/advanced-settings" element={<AdvancedSettings />} />
        <Route path="/about" element={<About />} />
      </Route>
    </Routes>
  );
}

export default App;
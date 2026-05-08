import { Outlet } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import FAB from "./FAB";

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-[#0f172a]">

      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      <Footer />

      <BottomNav />

      {/* ✅ FAB GLOBAL */}
      <FAB />

    </div>
  );
}
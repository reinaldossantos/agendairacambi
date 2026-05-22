import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./Header";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import FAB from "./FAB";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-dark-background/30 backdrop-blur-sm">
      <Header />
      {/* Main agora tem position: relative para servir de referência ao FAB absoluto */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 md:px-5 py-6 md:py-8 pb-24 md:pb-16 relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
        {/* FAB será posicionado relativamente a este main */}
        <FAB />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}
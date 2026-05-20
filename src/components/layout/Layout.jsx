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
      {/* Main content: largura responsiva */}
      {/* No mobile: padding lateral reduzido (px-4) e largura 100% */}
      {/* No desktop: padding lateral maior (px-8), largura máxima maior (max-w-screen-2xl) */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-16">
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
      </main>
      <Footer />
      <BottomNav />
      <FAB />
    </div>
  );
}
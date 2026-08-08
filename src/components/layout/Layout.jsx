import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Header from "./ResponsiveHeader";
import Footer from "./Footer";
import BottomNav from "./BottomNav";
import FAB from "./FAB";

export default function Layout() {
  const location = useLocation();

  return (
    <div className="flex flex-col min-h-screen bg-background dark:bg-dark-background/30 backdrop-blur-sm">
      <Header />
      {/* 
        - mobile: padding lateral original (px-4)
        - desktop (md e acima): padding reduzido (px-2) e largura máxima maior (max-w-screen-2xl)
        Isso dá mais espaço horizontal para os cards ficarem mais largos/retangulares.
      */}
      <main className="flex-1 w-full max-w-screen-2xl mx-auto px-4 md:px-2 py-6 md:py-8 pb-24 md:pb-16 relative">
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
        <FAB />
      </main>
      <Footer />
      <BottomNav />
    </div>
  );
}

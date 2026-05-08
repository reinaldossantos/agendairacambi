import { Link } from "react-router-dom";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function FAB() {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(true);

  const lastScrollY = useRef(0);
  const hideTimer = useRef(null);
  const isHiding = useRef(false);

  const handleScroll = useCallback(() => {
    if (typeof window === "undefined") return;

    const currentScroll = window.scrollY;
    const delta = currentScroll - lastScrollY.current;

    // Ignora scrolls muito curtos (menos de 5px)
    if (Math.abs(delta) < 5) return;

    if (delta > 0 && currentScroll > 80) {
      // Rolando para baixo além de 80px -> agenda esconder
      if (!isHiding.current) {
        isHiding.current = true;
      }
      // Limpa o timer anterior e define um novo
      clearTimeout(hideTimer.current);
      hideTimer.current = setTimeout(() => {
        setVisible(false);
      }, 300); // 300ms de delay para evitar sumir rápido
    } else if (delta < 0) {
      // Rolando para cima -> mostra imediatamente
      clearTimeout(hideTimer.current);
      isHiding.current = false;
      setVisible(true);
    }

    lastScrollY.current = currentScroll;
  }, []);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScroll);
      clearTimeout(hideTimer.current);
    };
  }, [handleScroll]);

  const actions = [
    {
      label: "Nova Atividade",
      icon: "add_circle",
      link: "/new",
      color: "bg-emerald-500",
    },
    {
      label: "Calendário",
      icon: "calendar_month",
      link: "/calendar",
      color: "bg-blue-500",
    },
    {
      label: "Arquivos",
      icon: "folder",
      link: "/files",
      color: "bg-violet-500",
    },
  ];

  return (
    <>
      {/* Overlay estilo iOS */}
      <AnimatePresence>
        {open && (
          <motion.div
            onClick={() => setOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/20 backdrop-blur-md z-40"
          />
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 80 }}
        animate={{
          opacity: visible ? 1 : 0,
          y: visible ? 0 : 80,
        }}
        transition={{ duration: 0.35 }}
        className="fixed bottom-24 md:bottom-10 right-6 z-50 flex flex-col items-end gap-3"
      >
        {/* Menu com animação spring */}
        <AnimatePresence>
          {open &&
            actions.map((item, index) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20, scale: 0.8 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.8 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.05,
                }}
              >
                <Link
                  to={item.link}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2 rounded-full backdrop-blur-lg bg-white/70 dark:bg-gray-800/70 border border-white/20 shadow-lg hover:scale-105 hover:shadow-xl transition-all duration-200"
                >
                  <div
                    className={`w-9 h-9 ${item.color} text-white rounded-full flex items-center justify-center shadow`}
                  >
                    <span className="material-symbols-outlined text-sm">
                      {item.icon}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.label}
                  </span>
                </Link>
              </motion.div>
            ))}
        </AnimatePresence>

        {/* Botão principal premium */}
        <motion.button
          onClick={() => setOpen(!open)}
          whileTap={{ scale: 0.92 }}
          animate={{
            rotate: open ? 45 : 0,
            boxShadow: open
              ? "0 12px 40px rgba(0,0,0,0.35)"
              : "0 8px 24px rgba(0,0,0,0.25)",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 20,
          }}
          className="relative bg-gradient-to-br from-yellow-300 to-yellow-500 text-black w-16 h-16 rounded-full flex items-center justify-center"
        >
          <div className="absolute inset-0 rounded-full bg-white/20 blur-sm" />
          <span className="material-symbols-outlined text-3xl relative">add</span>
        </motion.button>
      </motion.div>
    </>
  );
}
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const actions = [
  { id: "activity", label: "Nova atividade", description: "Registrar uma ação na agenda", icon: "add_task", to: "/new", tone: "agenda" },
  { id: "event", label: "Novo evento", description: "Seminário, oficina ou encontro", icon: "festival", to: "/new", state: { createEvent: true }, tone: "management" },
  { id: "project", label: "Novo projeto", description: "Planejar uma iniciativa", icon: "view_kanban", to: "/projects/new", tone: "management" },
  { id: "vehicle", label: "Agendar veículo", description: "Criar uma nova reserva", icon: "directions_car", to: "/vehicles", state: { quickAction: "booking" }, tone: "operations" },
  { id: "expense", label: "Novo relatório", description: "Iniciar prestação de despesas", icon: "receipt_long", to: "/expense-reports", state: { quickAction: "expense" }, tone: "content" },
  { id: "notice", label: "Publicar aviso", description: "Comunicar à organização", icon: "campaign", to: "/announcements", state: { quickAction: "notice" }, tone: "content" },
  { id: "calendar", label: "Abrir calendário", description: "Consultar o planejamento", icon: "calendar_month", to: "/calendar", tone: "operations" },
];

const contextualAction = (pathname) => {
  if (pathname.startsWith("/events")) return "event";
  if (pathname.startsWith("/projects")) return "project";
  if (pathname.startsWith("/vehicles")) return "vehicle";
  if (pathname.startsWith("/expense-reports")) return "expense";
  if (pathname.startsWith("/announcements")) return "notice";
  return "activity";
};

export default function FAB() {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState(() => localStorage.getItem("iracambi_quick_action") || "");
  const [floatingBottom, setFloatingBottom] = useState(() => window.innerWidth >= 768 ? 24 : 80);
  const recommendedId = contextualAction(location.pathname);
  const recommended = actions.find((action) => action.id === recommendedId) || actions[0];
  const orderedActions = useMemo(() => [...actions].sort((a, b) => {
    if (a.id === recommendedId) return -1;
    if (b.id === recommendedId) return 1;
    if (a.id === recent) return -1;
    if (b.id === recent) return 1;
    return 0;
  }), [recommendedId, recent]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
      if (event.altKey && event.key.toLowerCase() === "n") { event.preventDefault(); setOpen((value) => !value); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);
  useEffect(() => {
    let frame;
    const reposition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const footer = document.querySelector("footer");
        const base = window.innerWidth >= 768 ? 24 : 80;
        if (!footer) return setFloatingBottom(base);
        const footerTop = footer.getBoundingClientRect().top;
        const clearance = footerTop < window.innerHeight ? window.innerHeight - footerTop + 16 : base;
        setFloatingBottom(Math.min(Math.max(base, clearance), window.innerHeight - 88));
      });
    };
    reposition();
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, []);

  const toggle = () => {
    if (navigator.vibrate) navigator.vibrate(18);
    setOpen((value) => !value);
  };
  const selectAction = (id) => {
    localStorage.setItem("iracambi_quick_action", id);
    setRecent(id);
    setOpen(false);
  };

  return <>
    <AnimatePresence>
      {open && <motion.button type="button" aria-label="Fechar ações rápidas" onClick={() => setOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: reduceMotion ? 0 : 0.18 }} className="fixed inset-0 z-[80] cursor-default bg-stone-950/30 backdrop-blur-sm" />}
    </AnimatePresence>

    <AnimatePresence>
      {open && <motion.section role="dialog" aria-modal="true" aria-labelledby="quick-actions-title" initial={reduceMotion ? false : { opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 }} transition={{ type: reduceMotion ? "tween" : "spring", stiffness: 330, damping: 28 }} style={{ bottom: Math.min(floatingBottom + 76, 160) }} className="fixed inset-x-3 z-[90] overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-dark-surface/95 md:left-auto md:right-6 md:w-[440px]">
        <header className="flex items-start justify-between border-b border-surface-variant bg-gradient-to-r from-emerald-50 via-white to-amber-50 p-5 dark:border-white/10 dark:from-emerald-950/40 dark:via-dark-surface dark:to-amber-950/20"><div><p className="text-xs font-bold uppercase tracking-[0.16em] text-primary-light dark:text-green-300">Central inteligente</p><h2 id="quick-actions-title" className="mt-1 text-xl font-black text-primary dark:text-white">Ações rápidas</h2><p className="mt-1 text-xs text-outline">A opção recomendada acompanha a página atual.</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-10 w-10 items-center justify-center rounded-full text-outline transition hover:bg-white hover:text-primary dark:hover:bg-white/10" aria-label="Fechar"><span className="material-symbols-outlined icon-plain">close</span></button></header>
        <div className="grid max-h-[52vh] grid-cols-1 gap-2 overflow-y-auto p-3 sm:grid-cols-2 md:max-h-none">
          {orderedActions.map((action, index) => <motion.div key={action.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduceMotion ? 0 : index * 0.035 }}><Link to={action.to} state={action.state} onClick={() => selectAction(action.id)} className={`group relative flex min-h-[82px] items-center gap-3 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md dark:hover:bg-white/10 ${action.id === recommendedId ? "border-primary/30 bg-emerald-50/70 ring-1 ring-primary/10 dark:border-emerald-800 dark:bg-emerald-950/20" : "border-surface-variant bg-surface/60 dark:border-white/10 dark:bg-white/5"}`}>
            <span className={`material-symbols-outlined icon-plain flex h-11 w-11 shrink-0 items-center justify-center rounded-xl icon-tone-${action.tone}`}>{action.icon}</span><span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-1.5"><strong className="text-sm text-primary dark:text-white">{action.label}</strong>{action.id === recommendedId && <span className="rounded-full bg-primary px-2 py-0.5 text-[8px] font-bold uppercase tracking-wide text-white">Recomendado</span>}</span><span className="mt-0.5 block text-[11px] leading-snug text-outline">{action.description}</span></span>
          </Link></motion.div>)}
        </div>
        <footer className="flex items-center justify-between border-t border-surface-variant px-5 py-3 text-[10px] text-outline dark:border-white/10"><span>Alt + N para abrir</span><span>Esc para fechar</span></footer>
      </motion.section>}
    </AnimatePresence>

    <div style={{ bottom: floatingBottom }} className="fixed right-4 z-[100] transition-[bottom] duration-200 md:right-6">
      <motion.button type="button" onClick={toggle} whileTap={reduceMotion ? undefined : { scale: 0.94 }} whileHover={reduceMotion ? undefined : { y: -2 }} aria-expanded={open} aria-haspopup="dialog" aria-label={open ? "Fechar ações rápidas" : `Abrir ações rápidas. Recomendado: ${recommended.label}`} title={`${recommended.label} · Alt + N`} className={`group relative flex h-16 items-center overflow-hidden rounded-full border border-amber-300 bg-gradient-to-br from-[#ffe36d] via-[#ffd84d] to-[#f7bd21] text-primary shadow-[0_12px_34px_rgba(146,104,0,0.28)] transition-shadow hover:shadow-[0_16px_40px_rgba(146,104,0,0.36)] focus:outline-none focus:ring-4 focus:ring-amber-300/40 ${open ? "w-16 justify-center" : "w-16 justify-center md:w-auto md:px-5"}`}>
        <span className="absolute inset-0 bg-gradient-to-t from-transparent to-white/35" />
        <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ duration: reduceMotion ? 0 : 0.2 }} className="material-symbols-outlined icon-plain relative text-[30px]">add</motion.span>
        {!open && <span className="relative ml-2 hidden text-sm font-black md:block">{recommended.label}</span>}
        {!open && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-[#ffd84d] bg-primary md:right-2" aria-hidden="true" />}
      </motion.button>
    </div>
  </>;
}

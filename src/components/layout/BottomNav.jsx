import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const linkClasses = ({ isActive }) =>
    `flex flex-col items-center justify-center ${
      isActive ? "text-primary dark:text-white font-bold" : "text-stone-400 dark:text-gray-500"
    } hover:text-primary dark:hover:text-white transition-colors group py-1`;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 w-full bg-white dark:bg-dark-background border-t border-surface-variant dark:border-white/10 z-50 px-2 pb-safe flex justify-around items-center">
      <NavLink to="/" className={linkClasses} end>
        <span className="material-symbols-outlined text-xl">calendar_view_week</span>
        <span className="font-roboto text-[10px] mt-0.5">Agenda</span>
      </NavLink>
      <NavLink to="/new" className={linkClasses}>
        <span className="material-symbols-outlined text-xl">add_circle</span>
        <span className="font-roboto text-[10px] mt-0.5">Novo</span>
      </NavLink>
      <NavLink to="/history" className={linkClasses}>
        <span className="material-symbols-outlined text-xl">history</span>
        <span className="font-roboto text-[10px] mt-0.5">Histórico</span>
      </NavLink>
      <NavLink to="/programs" className={linkClasses}>
        <span className="material-symbols-outlined text-xl">account_tree</span>
        <span className="font-roboto text-[10px] mt-0.5">Programas</span>
      </NavLink>
    </nav>
  );
}
import { NavLink } from "react-router-dom";

export default function BottomNav() {
  const linkClasses = ({ isActive }) =>
    `flex min-h-14 flex-1 flex-col items-center justify-center ${
      isActive ? "text-primary dark:text-white font-bold" : "text-stone-400 dark:text-gray-500"
    } hover:text-primary dark:hover:text-white transition-colors group px-1 py-1`;

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
      <NavLink to="/projects" className={linkClasses}>
        <span className="material-symbols-outlined text-xl">view_kanban</span>
        <span className="font-roboto text-[10px] mt-0.5">Projetos</span>
      </NavLink>
      <NavLink to="/vehicles" className={linkClasses}>
        <span className="material-symbols-outlined text-xl">directions_car</span>
        <span className="font-roboto text-[10px] mt-0.5">Veículos</span>
      </NavLink>
    </nav>
  );
}

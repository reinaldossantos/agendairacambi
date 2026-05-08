import { useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNotifications } from "../../hooks/useNotifications";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { format } from "date-fns";

export default function Header() {
  const { currentUser, persons, selectUser } = useCurrentUser();
  const { notifications, unreadCount, open, toggleOpen, dropdownRef } = useNotifications(currentUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOnline = useOnlineStatus();

  return (
    <header className="bg-white/90 dark:bg-dark-background/30 backdrop-blur-md sticky top-0 z-50 border-b border-surface-variant dark:border-white/10 font-roboto">
      {!isOnline && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs text-center py-1">
          Sem conexão – algumas funcionalidades podem não funcionar.
        </div>
      )}

      <div className="flex justify-between items-center w-full px-4 md:px-6 py-5 max-w-7xl mx-auto">
        {/* Logo e nome – logo oculto no mobile */}
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/logo.webp"
            alt="Iracambi"
            className="hidden md:block h-12 md:h-14 w-auto object-contain"
          />
          <h1 className="text-xl md:text-2xl font-black text-primary dark:text-white tracking-tighter leading-none">
            AGENDA IRACAMBI
          </h1>
        </Link>

        {/* Desktop: todos os ícones visíveis */}
        <div className="hidden md:flex items-center gap-2 md:gap-3">
          <Link
            to="/new"
            title="Lançar atividade"
            className="flex items-center gap-1.5 text-primary dark:text-white font-roboto text-label-sm hover:text-primary-light transition-all shadow-sm hover:shadow-md px-4 py-2 rounded-full bg-white/80 dark:bg-white/10 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">add_circle</span>
            Nova
          </Link>

          <Link to="/calendar" title="Calendário Mensal" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </Link>

          <Link to="/stats" title="Estatísticas" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">bar_chart</span>
          </Link>

          <Link to="/announcements" title="Mural de Avisos" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">campaign</span>
          </Link>

          <Link to="/files" title="Repositório de Arquivos" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">folder</span>
          </Link>

          <Link to="/settings" title="Configurações" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>

          <Link to="/admin/programs" title="Gerenciar programas" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
          </Link>

          <Link to="/admin/persons" title="Gerenciar pessoas" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">group</span>
          </Link>

          <Link to="/admin/leaders" title="Gerenciar líderes" className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm">
            <span className="material-symbols-outlined text-[22px]">diversity_3</span>
          </Link>

          <select
            value={currentUser?.id || ""}
            onChange={(e) => {
              const selected = persons.find((p) => p.id === e.target.value);
              if (selected) selectUser(selected);
            }}
            title="Selecionar seu nome"
            className="bg-surface dark:bg-white/5 border-b-2 border-primary/20 focus:border-accent outline-none py-2.5 px-3.5 rounded-t-lg text-sm font-roboto text-on-surface dark:text-gray-200"
          >
            <option value="">Seu nome</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Botão de notificações no desktop */}
          <button
            onClick={toggleOpen}
            title="Notificações"
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-gray-500 dark:text-gray-300 relative shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[20px] h-[20px] bg-accent text-primary text-[11px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
        </div>

        {/* Mobile: ícones essenciais + hambúrguer */}
        <div className="flex md:hidden items-center gap-2">
          <Link to="/new" className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-primary dark:text-white">
            <span className="material-symbols-outlined text-2xl">add_circle</span>
          </Link>

          <select
            value={currentUser?.id || ""}
            onChange={(e) => {
              const selected = persons.find((p) => p.id === e.target.value);
              if (selected) selectUser(selected);
            }}
            className="bg-surface dark:bg-white/5 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-2 rounded-t-lg text-sm font-roboto text-on-surface dark:text-gray-200 max-w-[120px]"
          >
            <option value="">Nome</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Botão de notificações no mobile */}
          <button onClick={toggleOpen} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-300 relative">
            <span className="material-symbols-outlined text-2xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-accent text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-300"
          >
            <span className="material-symbols-outlined text-2xl">{mobileMenuOpen ? "close" : "menu"}</span>
          </button>
        </div>
      </div>

      {/* Dropdown de notificações – comum a desktop e mobile */}
      <AnimatePresence>
        {open && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ duration: 0.15 }}
            className="absolute right-4 md:right-6 top-16 md:top-20 w-72 md:w-80 bg-white dark:bg-white/10 backdrop-blur-md border border-surface-variant dark:border-white/10 rounded-xl shadow-lg z-50 max-h-80 overflow-y-auto"
          >
            <div className="p-3 border-b border-surface-variant dark:border-white/10">
              <p className="font-roboto text-label-md text-primary dark:text-white font-semibold">Notificações</p>
            </div>
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-sm text-on-surface dark:text-gray-300">Nenhuma notificação.</div>
            ) : (
              <ul className="divide-y divide-surface-variant dark:divide-white/10">
                {notifications.map((notif) => (
                  <li key={notif.id} className="odd:bg-stone-50 dark:odd:bg-white/5 even:bg-white dark:even:bg-transparent p-3 hover:bg-gray-50 dark:hover:bg-white/10">
                    {notif.activity ? (
                      <Link to={`/activity/${notif.activity.id}`} onClick={toggleOpen} className="block">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-primary dark:text-white">
                            {notif.type === "comment" ? "Comentário" : notif.type === "involvement" ? "Envolvimento" : notif.type === "reminder" ? "Lembrete" : notif.type === "file" ? "Arquivo" : "Status"}
                          </span>
                          <span className="text-[10px] text-outline dark:text-gray-400">
                            {format(new Date(notif.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface dark:text-gray-200 mt-1 truncate">
                          <span className="font-medium">{notif.person?.name}</span> em{" "}
                          <span className="italic">{notif.activity.title}</span>
                        </p>
                        <p className="text-xs text-outline dark:text-gray-400 mt-1 truncate">{notif.content}</p>
                      </Link>
                    ) : (
                      <div className="block">
                        <div className="flex justify-between items-start">
                          <span className="text-xs font-bold text-primary dark:text-white">
                            {notif.type === "file" ? "Arquivo" : "Notificação"}
                          </span>
                          <span className="text-[10px] text-outline dark:text-gray-400">
                            {format(new Date(notif.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm text-on-surface dark:text-gray-200 mt-1 truncate">
                          <span className="font-medium">{notif.person?.name}</span>
                        </p>
                        <p className="text-xs text-outline dark:text-gray-400 mt-1 truncate">{notif.content}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Menu mobile */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-surface border-t border-surface-variant dark:border-white/10 px-4 py-4 space-y-3">
          <Link to="/calendar" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">calendar_month</span>
            <span className="font-roboto text-label-md">Calendário</span>
          </Link>
          <Link to="/stats" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">bar_chart</span>
            <span className="font-roboto text-label-md">Estatísticas</span>
          </Link>
          <Link to="/announcements" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">campaign</span>
            <span className="font-roboto text-label-md">Avisos</span>
          </Link>
          <Link to="/files" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">folder</span>
            <span className="font-roboto text-label-md">Arquivos</span>
          </Link>
          <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">settings</span>
            <span className="font-roboto text-label-md">Configurações</span>
          </Link>
          <Link to="/admin/programs" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">admin_panel_settings</span>
            <span className="font-roboto text-label-md">Programas</span>
          </Link>
          <Link to="/admin/persons" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">group</span>
            <span className="font-roboto text-label-md">Pessoas</span>
          </Link>
          <Link to="/admin/leaders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined">diversity_3</span>
            <span className="font-roboto text-label-md">Líderes</span>
          </Link>
        </div>
      )}
    </header>
  );
}
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNotifications } from "../../hooks/useNotifications";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useAnnouncementsAlert } from "../../hooks/useAnnouncementsAlert";
import { useFilesAlert } from "../../hooks/useFilesAlert";
import { useLanguage } from "../../i18n/context";
import { format } from "date-fns";

export default function Header() {
  const { currentUser, persons, selectUser } = useCurrentUser();
  const { notifications, unreadCount, open, toggleOpen, dropdownRef } =
    useNotifications(currentUser);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showMobileNotifications, setShowMobileNotifications] = useState(false);
  const isOnline = useOnlineStatus();
  const { locale, changeLocale, t } = useLanguage();
  const hasNewAnnouncements = useAnnouncementsAlert();
  const hasNewFiles = useFilesAlert();

  // Fechar modal de notificações mobile ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showMobileNotifications) {
        const modalContent = document.querySelector('.mobile-notifications-modal-content');
        if (modalContent && !modalContent.contains(event.target)) {
          setShowMobileNotifications(false);
        }
      }
    };

    if (showMobileNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMobileNotifications]);

  return (
    <header className="bg-green-50/85 dark:bg-dark-background/30 backdrop-blur-md sticky top-0 z-50 border-b border-surface-variant dark:border-white/10 font-roboto">
      {!isOnline && (
        <div className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs text-center py-1">
          Sem conexão – algumas funcionalidades podem não funcionar.
        </div>
      )}

      <div className="flex justify-between items-center w-full px-4 md:px-6 py-5 max-w-7xl mx-auto">
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

        {/* Desktop: ícones e selects */}
        <div className="hidden md:flex items-center gap-2 md:gap-3">
          {/* Botão Nova Atividade estilizado como FAB */}
          <Link
            to="/new"
            title={t("header.newActivity")}
            className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-black w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-125 hover:shadow-lg transition-transform duration-200"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </Link>

          <Link
            to="/calendar"
            title={t("header.calendar")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">calendar_month</span>
          </Link>

          <Link
            to="/vehicles"
            title="Veículos"
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">directions_car</span>
          </Link>

          <Link
            to="/stats"
            title={t("header.statistics")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">bar_chart</span>
          </Link>

          <Link
            to="/history"
            title="Histórico e Relatórios"
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">history</span>
          </Link>

          <Link
            to="/announcements"
            title={t("header.announcements")}
            className={`p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm ${
              hasNewAnnouncements ? "text-red-500 animate-pulse" : "text-primary dark:text-primary-light"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">campaign</span>
          </Link>

          <Link
            to="/files"
            title={t("header.files")}
            className={`p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm ${
              hasNewFiles ? "text-blue-500 animate-pulse" : "text-primary dark:text-primary-light"
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">folder</span>
          </Link>

          <Link
            to="/settings"
            title={t("header.settings")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </Link>

          <Link
            to="/advanced-settings"
            title="Configurações Avançadas"
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">tune</span>
          </Link>

          <Link
            to="/admin/programs"
            title={t("header.programs")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
          </Link>

          <Link
            to="/admin/persons"
            title={t("header.people")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">group</span>
          </Link>

          <Link
            to="/admin/leaders"
            title={t("header.leaders")}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">diversity_3</span>
          </Link>

          {/* Botão de Ajuda (Manual) na cor vermelho escuro */}
          <Link
            to="/about"
            title="Manual do Usuário"
            className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-red-700 dark:text-red-400 shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
          >
            <span className="material-symbols-outlined text-[22px]">help</span>
          </Link>

          <select
            value={locale}
            onChange={(e) => changeLocale(e.target.value)}
            title="Idioma"
            className="bg-surface dark:bg-white/5 border-b-2 border-primary/20 focus:border-accent outline-none py-2.5 px-2 rounded-t-lg text-sm font-roboto text-on-surface dark:text-gray-200 min-w-[70px]"
          >
            <option value="pt">🇧🇷 PT</option>
            <option value="en">🇺🇸 EN</option>
            <option value="es">🇪🇸 ES</option>
          </select>

          <select
            value={currentUser?.id || ""}
            onChange={(e) => {
              const selected = persons.find((p) => p.id === e.target.value);
              if (selected) selectUser(selected);
            }}
            title={t("header.selectName")}
            className="bg-surface dark:bg-white/5 border-b-2 border-primary/20 focus:border-accent outline-none py-2.5 px-3.5 rounded-t-lg text-sm font-roboto text-on-surface dark:text-gray-200 min-w-[120px]"
          >
            <option value="">{t("header.selectName")}</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <div className="relative" ref={dropdownRef}>
            <button
              onClick={toggleOpen}
              title={t("header.notifications")}
              className="p-2.5 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[50px] min-w-[50px] flex items-center justify-center transition-colors text-primary dark:text-primary-light relative shadow-sm bg-white/50 dark:bg-white/5 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-[22px]">notifications</span>
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 min-w-[20px] h-[20px] bg-accent text-primary text-[11px] font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

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
                    <p className="font-roboto text-label-md text-primary dark:text-white font-semibold">{t("header.notifications")}</p>
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
                                <span className="text-[10px] text-outline dark:text-gray-400">{format(new Date(notif.created_at), "dd/MM HH:mm")}</span>
                              </div>
                              <p className="text-sm text-on-surface dark:text-gray-200 mt-1 truncate">
                                <span className="font-medium">{notif.person?.name}</span> em <span className="italic">{notif.activity.title}</span>
                              </p>
                              <p className="text-xs text-outline dark:text-gray-400 mt-1 truncate">{notif.content}</p>
                            </Link>
                          ) : (
                            <div className="block">
                              <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-primary dark:text-white">{notif.type === "file" ? "Arquivo" : "Notificação"}</span>
                                <span className="text-[10px] text-outline dark:text-gray-400">{format(new Date(notif.created_at), "dd/MM HH:mm")}</span>
                              </div>
                              <p className="text-sm text-on-surface dark:text-gray-200 mt-1 truncate"><span className="font-medium">{notif.person?.name}</span></p>
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
          </div>
        </div>

        {/* Mobile: ícones essenciais + hambúrguer */}
        <div className="flex md:hidden items-center gap-2">
          <Link
            to="/new"
            className="bg-gradient-to-br from-yellow-300 to-yellow-500 text-black w-10 h-10 rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform duration-200"
          >
            <span className="material-symbols-outlined text-2xl">add</span>
          </Link>

          <button
            onClick={() => setShowMobileNotifications(true)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-primary dark:text-primary-light relative"
          >
            <span className="material-symbols-outlined text-2xl">notifications</span>
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[18px] h-[18px] bg-accent text-primary text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center text-primary dark:text-primary-light"
          >
            <span className={`material-symbols-outlined ${mobileMenuOpen ? "text-red-500 text-3xl" : "text-2xl"}`}>
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Barra inferior mobile (seletores) */}
      <div className="md:hidden bg-white/80 dark:bg-dark-background/50 backdrop-blur-sm border-t border-surface-variant dark:border-white/10 px-4 py-2 flex items-center justify-between gap-3">
        <div className="flex-1 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">person</span>
          <select
            value={currentUser?.id || ""}
            onChange={(e) => {
              const selected = persons.find((p) => p.id === e.target.value);
              if (selected) selectUser(selected);
            }}
            className="flex-1 bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm font-roboto text-on-surface dark:text-gray-200"
          >
            <option value="">Selecione seu nome</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-xl">language</span>
          <select
            value={locale}
            onChange={(e) => changeLocale(e.target.value)}
            className="bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm font-roboto text-on-surface dark:text-gray-200"
          >
            <option value="pt">PT</option>
            <option value="en">EN</option>
            <option value="es">ES</option>
          </select>
        </div>
      </div>

      {/* Menu mobile (links adicionais) */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-dark-surface border-t border-surface-variant dark:border-white/10 px-4 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          <Link to="/history" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">history</span>
            <span className="font-roboto text-body-md">Histórico e Relatórios</span>
          </Link>
          <Link to="/calendar" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">calendar_month</span>
            <span className="font-roboto text-body-md">Calendário</span>
          </Link>
          <Link to="/vehicles" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">directions_car</span>
            <span className="font-roboto text-body-md">Veículos</span>
          </Link>
          <Link to="/stats" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">bar_chart</span>
            <span className="font-roboto text-body-md">Estatísticas</span>
          </Link>
          <Link to="/announcements" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className={`material-symbols-outlined text-2xl ${hasNewAnnouncements ? "text-red-500 animate-pulse" : "text-primary"}`}>campaign</span>
            <span className="font-roboto text-body-md">Mural de Avisos</span>
          </Link>
          <Link to="/files" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className={`material-symbols-outlined text-2xl ${hasNewFiles ? "text-blue-500 animate-pulse" : "text-primary"}`}>folder</span>
            <span className="font-roboto text-body-md">Arquivos</span>
          </Link>
          <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">settings</span>
            <span className="font-roboto text-body-md">Configurações</span>
          </Link>
          <Link to="/advanced-settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">tune</span>
            <span className="font-roboto text-body-md">Avançado</span>
          </Link>
          <Link to="/admin/programs" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
            <span className="font-roboto text-body-md">Programas</span>
          </Link>
          <Link to="/admin/persons" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">group</span>
            <span className="font-roboto text-body-md">Pessoas</span>
          </Link>
          <Link to="/admin/leaders" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl">diversity_3</span>
            <span className="font-roboto text-body-md">Líderes</span>
          </Link>
          {/* Botão de Ajuda no menu mobile também na cor vermelho escuro */}
          <Link to="/about" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-on-surface dark:text-gray-200">
            <span className="material-symbols-outlined text-primary text-2xl text-red-700 dark:text-red-400">help</span>
            <span className="font-roboto text-body-md">Manual</span>
          </Link>
        </div>
      )}

      {/* Modal de notificações para mobile - corrigido para fechar ao clicar fora */}
      {showMobileNotifications && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 w-full max-w-md mx-4 rounded-xl shadow-xl max-h-[80vh] flex flex-col mobile-notifications-modal-content">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-roboto text-label-md text-primary dark:text-white font-semibold">Notificações</h3>
              <button
                onClick={() => setShowMobileNotifications(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="overflow-y-auto flex-1">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-on-surface dark:text-gray-300">
                  Nenhuma notificação.
                </div>
              ) : (
                <ul className="divide-y divide-surface-variant dark:divide-gray-700">
                  {notifications.map((notif) => (
                    <li key={notif.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {notif.activity ? (
                        <Link
                          to={`/activity/${notif.activity.id}`}
                          onClick={() => setShowMobileNotifications(false)}
                          className="block"
                        >
                          <div className="flex justify-between items-start">
                            <span className="text-xs font-bold text-primary dark:text-white">
                              {notif.type === "comment"
                                ? "Comentário"
                                : notif.type === "involvement"
                                ? "Envolvimento"
                                : notif.type === "reminder"
                                ? "Lembrete"
                                : notif.type === "file"
                                ? "Arquivo"
                                : "Status"}
                            </span>
                            <span className="text-[10px] text-outline dark:text-gray-400">
                              {format(new Date(notif.created_at), "dd/MM HH:mm")}
                            </span>
                          </div>
                          <p className="text-sm text-on-surface dark:text-gray-200 mt-1 truncate">
                            <span className="font-medium">{notif.person?.name}</span> em{" "}
                            <span className="italic">{notif.activity.title}</span>
                          </p>
                          <p className="text-xs text-outline dark:text-gray-400 mt-1 truncate">
                            {notif.content}
                          </p>
                        </Link>
                      ) : (
                        <div>
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
                          <p className="text-xs text-outline dark:text-gray-400 mt-1 truncate">
                            {notif.content}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

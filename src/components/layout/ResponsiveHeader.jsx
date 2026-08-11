import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { format } from "date-fns";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { useNotifications } from "../../hooks/useNotifications";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";
import { useAnnouncementsAlert } from "../../hooks/useAnnouncementsAlert";
import { useFilesAlert } from "../../hooks/useFilesAlert";
import { useLanguage } from "../../i18n/context";

const groups = [
  { id: "agenda", label: "Agenda", icon: "calendar_month", tone: "agenda", items: [
    { to: "/", label: "Agenda semanal", icon: "calendar_view_week", end: true },
    { to: "/calendar", label: "Calendário", icon: "calendar_month" },
    { to: "/events", label: "Eventos", icon: "festival" },
    { to: "/vehicles", label: "Veículos", icon: "directions_car" },
  ] },
  { id: "operations", label: "Operações", icon: "monitoring", tone: "operations", items: [
    { to: "/new", label: "Nova atividade", icon: "add_circle" },
    { to: "/history", label: "Histórico e relatórios", icon: "history" },
    { to: "/expense-reports", label: "Relatórios de despesas", icon: "receipt_long" },
    { to: "/purchase-requests", label: "Solicitações de compras", icon: "shopping_cart", iconClass: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
    { to: "/expense-report-summary", label: "Resumo financeiro", icon: "analytics" },
    { to: "/monthly-activity-reports", label: "Relatórios mensais", icon: "summarize" },
    { to: "/stats", label: "Estatísticas", icon: "bar_chart" },
  ] },
  { id: "content", label: "Conteúdo", icon: "folder_open", tone: "content", items: [
    { to: "/announcements", label: "Mural de avisos", icon: "campaign", alert: "announcements" },
    { to: "/files", label: "Arquivos", icon: "folder", alert: "files" },
  ] },
  { id: "management", label: "Gestão", icon: "groups", tone: "management", items: [
    { to: "/projects", label: "Gestão de projetos", icon: "view_kanban" },
    { to: "/programs", label: "Programas", icon: "account_tree" },
    { to: "/admin/programs", label: "Administrar programas", icon: "admin_panel_settings", requiredRole: "admin" },
    { to: "/admin/persons", label: "Pessoas", icon: "group", requiredRole: "admin" },
    { to: "/admin/leaders", label: "Líderes", icon: "diversity_3", requiredRole: "admin" },
  ] },
  { id: "admin", label: "Administração", icon: "settings", tone: "admin", items: [
    { to: "/settings", label: "Configurações", icon: "settings" },
    { to: "/advanced-settings", label: "Ajustes avançados", icon: "tune", requiredRole: "admin" },
    { to: "/admin/maintenance", label: "Manutenção de dados", icon: "cleaning_services", requiredRole: "admin" },
    { to: "/audit-log", label: "Auditoria do sistema", icon: "policy", restrictedTo: "reinaldo" },
    { to: "/about", label: "Manual do usuário", icon: "help" },
  ] },
];

export default function ResponsiveHeader() {
  const { currentUser, signOut } = useCurrentUser();
  const { notifications, unreadCount, notificationError, open, toggleOpen, dropdownRef } = useNotifications(currentUser);
  const { locale, changeLocale } = useLanguage();
  const location = useLocation();
  const isOnline = useOnlineStatus();
  const alerts = { announcements: useAnnouncementsAlert(), files: useFilesAlert() };
  const [activeGroup, setActiveGroup] = useState(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileNotifications, setMobileNotifications] = useState(false);
  const navigationRef = useRef(null);
  const normalizedCurrentUser = currentUser?.name?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const visibleGroups = groups.map((group) => ({
    ...group,
    items: group.items.filter((item) => (!item.restrictedTo || item.restrictedTo === normalizedCurrentUser) && (!item.requiredRole || item.requiredRole === currentUser?.access_role)),
  })).filter((group) => group.items.length > 0);

  useEffect(() => {
    function closeOutside(event) {
      if (navigationRef.current && !navigationRef.current.contains(event.target)) setActiveGroup(null);
    }
    function closeEscape(event) {
      if (event.key === "Escape") {
        setActiveGroup(null);
        setMobileOpen(false);
        setMobileNotifications(false);
      }
    }
    document.addEventListener("mousedown", closeOutside);
    document.addEventListener("keydown", closeEscape);
    return () => {
      document.removeEventListener("mousedown", closeOutside);
      document.removeEventListener("keydown", closeEscape);
    };
  }, []);

  const currentGroup = visibleGroups.find((group) => group.items.some((item) =>
    item.end ? location.pathname === item.to : location.pathname.startsWith(item.to),
  ))?.id;

  return (
    <header className="sticky top-0 z-50 border-b border-surface-variant bg-green-50/95 font-roboto shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-dark-background/95">
      {!isOnline && <div className="bg-red-100 py-1 text-center text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">Sem conexão – algumas funcionalidades podem não funcionar.</div>}
      <div className="mx-auto flex min-h-[72px] max-w-screen-2xl items-center justify-between gap-4 px-4 py-3 md:px-6">
        <Link to="/" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
          <img src="/logo.webp" alt="Iracambi" className="hidden h-12 w-auto object-contain sm:block" />
          <h1 className="truncate text-lg font-black leading-none tracking-tighter text-primary dark:text-white sm:text-xl">AGENDA <span className="hidden lg:inline">IRACAMBI</span></h1>
        </Link>
        <div className="hidden items-center gap-3 md:flex">
          <Link to="/new" className="flex items-center gap-2 rounded-full bg-[#ffd12f] px-4 py-2.5 font-bold text-primary shadow-sm transition duration-200 hover:scale-105 hover:bg-[#ffda45] hover:shadow-md"><span className="material-symbols-outlined icon-plain">add</span><span className="hidden lg:inline">Novo</span></Link>
          <LanguageSelect locale={locale} changeLocale={changeLocale} />
          <UserIdentity currentUser={currentUser} signOut={signOut} />
          <NotificationButton count={unreadCount} onClick={toggleOpen} />
          <AnimatePresence>{open && <NotificationPanel notifications={notifications} error={notificationError} onClose={toggleOpen} panelRef={dropdownRef} />}</AnimatePresence>
        </div>
        <div className="flex items-center gap-1 md:hidden">
          <Link to="/new" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffd12f] text-primary shadow-sm transition duration-200 hover:scale-105 hover:bg-[#ffda45] hover:shadow-md" aria-label="Nova atividade"><span className="material-symbols-outlined icon-plain">add</span></Link>
          <NotificationButton count={unreadCount} onClick={() => { toggleOpen(); setMobileNotifications(true); }} />
          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-full text-primary dark:text-white" aria-expanded={mobileOpen} aria-label="Menu"><span className="material-symbols-outlined">{mobileOpen ? "close" : "menu"}</span></button>
        </div>
      </div>

      <nav ref={navigationRef} className="relative hidden border-t border-primary/10 bg-white/55 md:block dark:border-white/10 dark:bg-white/5" aria-label="Navegação principal">
        <div className="mx-auto flex max-w-screen-2xl items-stretch gap-1 px-4 md:px-6">
          {visibleGroups.map((group) => {
            const selected = activeGroup === group.id;
            const highlighted = selected || currentGroup === group.id;
            return <button key={group.id} type="button" onClick={() => setActiveGroup(selected ? null : group.id)} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-semibold transition lg:px-5 ${highlighted ? "border-accent bg-white text-primary dark:bg-white/10 dark:text-white" : "border-transparent text-on-surface-variant hover:bg-white/70 hover:text-primary dark:text-gray-300"}`} aria-expanded={selected}>
              <span className={`material-symbols-outlined text-[20px] icon-tone-${group.tone}`}>{group.icon}</span>{group.label}
              <span className="material-symbols-outlined icon-plain text-[18px]">{selected ? "expand_less" : "expand_more"}</span>
              {group.items.some((item) => alerts[item.alert]) && <span className="h-2 w-2 rounded-full bg-red-500" />}
            </button>;
          })}
        </div>
        <AnimatePresence>{activeGroup && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="absolute inset-x-0 top-full border-y border-surface-variant bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface">
          <div className="mx-auto grid max-w-screen-2xl grid-cols-2 gap-2 px-6 py-4 lg:grid-cols-4">
            {visibleGroups.find((group) => group.id === activeGroup)?.items.map((item) => <MenuLink key={item.to} item={item} tone={visibleGroups.find((group) => group.id === activeGroup)?.tone} alerts={alerts} onClick={() => setActiveGroup(null)} />)}
          </div>
        </motion.div>}</AnimatePresence>
      </nav>

      {mobileOpen && <div className="max-h-[calc(100vh-72px)] overflow-y-auto border-t border-surface-variant bg-white px-4 pb-5 dark:border-white/10 dark:bg-dark-surface md:hidden">
        <div className="grid grid-cols-[1fr_auto] gap-3 border-b border-surface-variant py-3 dark:border-white/10"><UserIdentity currentUser={currentUser} signOut={signOut} /><LanguageSelect locale={locale} changeLocale={changeLocale} /></div>
        {visibleGroups.map((group) => <details key={group.id} className="group border-b border-surface-variant dark:border-white/10" open={currentGroup === group.id}>
          <summary className="flex cursor-pointer list-none items-center gap-3 py-4 font-bold text-primary dark:text-white"><span className={`material-symbols-outlined rounded-lg p-1.5 icon-tone-${group.tone}`}>{group.icon}</span><span className="flex-1">{group.label}</span>{group.items.some((item) => alerts[item.alert]) && <span className="h-2 w-2 rounded-full bg-red-500" />}<span className="material-symbols-outlined transition group-open:rotate-180">expand_more</span></summary>
          <div className="grid gap-1 pb-3 pl-3">{group.items.map((item) => <MenuLink key={item.to} item={item} tone={group.tone} alerts={alerts} onClick={() => setMobileOpen(false)} />)}</div>
        </details>)}
      </div>}

      {mobileNotifications && <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm md:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) { setMobileNotifications(false); if (open) toggleOpen(); } }}>
        <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl bg-white shadow-xl dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-surface-variant p-4 dark:border-white/10"><h2 className="font-bold text-primary dark:text-white">Notificações</h2><button type="button" onClick={() => { setMobileNotifications(false); if (open) toggleOpen(); }} aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div>
          <NotificationList notifications={notifications} error={notificationError} onClose={() => { setMobileNotifications(false); if (open) toggleOpen(); }} />
        </div>
      </div>}
    </header>
  );
}

function MenuLink({ item, tone, alerts, onClick }) {
  return <NavLink to={item.to} end={item.end} onClick={onClick} className={({ isActive }) => `flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 transition ${isActive ? "bg-green-100 font-bold text-primary dark:bg-white/15 dark:text-white" : "text-on-surface hover:bg-surface dark:text-gray-200 dark:hover:bg-white/10"}`}>
    <span className={`material-symbols-outlined rounded-lg p-1.5 ${alerts[item.alert] ? "bg-red-500/10 text-red-500" : item.iconClass || `icon-tone-${tone}`}`}>{item.icon}</span><span>{item.label}</span>{alerts[item.alert] && <span className="ml-auto rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700">Novo</span>}
  </NavLink>;
}

function LanguageSelect({ locale, changeLocale }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageRef = useRef(null);
  const languages = {
    pt: { short: "PT", name: "Português" },
    en: { short: "EN", name: "English" },
    es: { short: "ES", name: "Español" },
  };
  const current = languages[locale] || languages.pt;
  useEffect(() => {
    const closeOutside = (event) => {
      if (languageRef.current && !languageRef.current.contains(event.target)) setLanguageOpen(false);
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, []);
  const selectLanguage = (value) => {
    changeLocale(value);
    setLanguageOpen(false);
  };
  return <div ref={languageRef} className="relative">
    <button type="button" onClick={() => setLanguageOpen((value) => !value)} className="group flex min-h-11 items-center gap-2 rounded-xl border border-surface-variant bg-white/70 px-2 shadow-sm transition hover:border-primary/30 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10" title={`Idioma atual: ${current.name}`} aria-haspopup="listbox" aria-expanded={languageOpen} aria-label={`Selecionar idioma. Atual: ${current.name}`}><span className="flex h-7 w-9 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10" aria-hidden="true"><FlagIcon locale={locale} /></span><span className="text-sm font-bold text-primary dark:text-white">{current.short}</span><span className={`material-symbols-outlined icon-plain text-[18px] text-outline transition-transform ${languageOpen ? "rotate-180" : ""}`}>expand_more</span></button>
    {languageOpen && <div role="listbox" aria-label="Idiomas disponíveis" className="absolute right-0 top-full z-[120] mt-2 w-52 overflow-hidden rounded-2xl border border-surface-variant bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-dark-surface">{Object.entries(languages).map(([value, language]) => <button key={value} type="button" role="option" aria-selected={locale === value} onClick={() => selectLanguage(value)} className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${locale === value ? "bg-green-50 text-primary dark:bg-emerald-950/40 dark:text-green-300" : "text-on-surface hover:bg-surface dark:text-gray-200 dark:hover:bg-white/10"}`}><span className="flex h-7 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm ring-1 ring-black/10" aria-hidden="true"><FlagIcon locale={value} /></span><span className="min-w-0 flex-1"><strong className="block text-sm">{language.short}</strong><span className="block text-xs text-outline">{language.name}</span></span>{locale === value && <span className="material-symbols-outlined icon-plain text-[18px] text-primary dark:text-green-300">check</span>}</button>)}</div>}
  </div>;
}

function FlagIcon({ locale }) {
  if (locale === "en") return <svg viewBox="0 0 36 24" className="h-full w-full" role="img" aria-label="Bandeira dos Estados Unidos"><rect width="36" height="24" fill="#fff" />{[0, 4, 8, 12, 16, 20].map((y) => <rect key={y} y={y} width="36" height="2" fill="#B22234" />)}<rect width="16" height="13" fill="#3C3B6E" /><g fill="#fff">{[3, 8, 13].flatMap((x) => [3, 7, 11].map((y) => <circle key={`${x}-${y}`} cx={x} cy={y} r="0.8" />))}</g></svg>;
  if (locale === "es") return <svg viewBox="0 0 36 24" className="h-full w-full" role="img" aria-label="Bandeira da Espanha"><rect width="36" height="24" fill="#AA151B" /><rect y="6" width="36" height="12" fill="#F1BF00" /><rect x="10" y="9" width="2.5" height="6" rx="0.5" fill="#AA151B" /><circle cx="11.25" cy="9" r="1" fill="#AA151B" /></svg>;
  return <svg viewBox="0 0 36 24" className="h-full w-full" role="img" aria-label="Bandeira do Brasil"><rect width="36" height="24" fill="#009B3A" /><path d="M18 3 32 12 18 21 4 12Z" fill="#FFDF00" /><circle cx="18" cy="12" r="5.3" fill="#002776" /><path d="M13.4 10.7c3.6-.6 7 .2 9.6 2" fill="none" stroke="#fff" strokeWidth="0.8" /></svg>;
}

function UserIdentity({ currentUser, signOut }) {
  return <div className="flex min-w-0 items-center gap-2 rounded-xl border border-surface-variant bg-white/70 px-2 py-1.5 dark:border-white/10 dark:bg-white/5">{currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" /> : <span className="material-symbols-outlined text-[24px] text-primary">account_circle</span>}<span className="max-w-36 truncate text-sm font-bold text-primary dark:text-white">{currentUser?.name || "Usuário"}</span><button type="button" onClick={signOut} title="Sair" aria-label="Sair do sistema" className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-red-50 hover:text-red-700"><span className="material-symbols-outlined text-[18px]">logout</span></button></div>;
}

function NotificationButton({ count, onClick }) {
  return <button type="button" onClick={onClick} className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/70 text-primary shadow-sm dark:bg-white/5 dark:text-green-300" aria-label="Notificações"><span className="material-symbols-outlined">notifications</span>{count > 0 && <span className="absolute right-0 top-0 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-black text-primary">{count > 9 ? "9+" : count}</span>}</button>;
}

function NotificationPanel({ notifications, error, onClose, panelRef }) {
  return <motion.div ref={panelRef} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-6 top-16 z-[70] w-80 overflow-hidden rounded-xl border border-surface-variant bg-white shadow-xl dark:border-white/10 dark:bg-dark-surface"><div className="border-b border-surface-variant p-3 font-bold text-primary dark:border-white/10 dark:text-white">Notificações</div><NotificationList notifications={notifications} error={error} onClose={onClose} /></motion.div>;
}

function NotificationList({ notifications, error, onClose }) {
  if (error) return <div role="alert" className="m-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</div>;
  if (!notifications.length) return <div className="p-6 text-center text-sm text-outline">Nenhuma notificação.</div>;
  return <ul className="max-h-80 divide-y divide-surface-variant overflow-y-auto dark:divide-white/10">{notifications.map((notification) => <li key={`${notification.source}-${notification.id}`} className="relative">{!notification.is_read && <span className="absolute left-1.5 top-4 h-2 w-2 rounded-full bg-blue-600" aria-label="Não lida" />}<Link to={notification.link || (notification.activity ? `/activity/${notification.activity.id}` : "#")} onClick={onClose} className={`block p-3 pl-5 hover:bg-surface dark:hover:bg-white/10 ${!notification.is_read ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}`}><div className="flex justify-between gap-3"><strong className="text-xs text-primary dark:text-white">{notification.title || (notification.type === "comment" ? "Comentário" : notification.type === "file" ? "Arquivo" : "Notificação")}</strong><span className="text-[10px] text-outline">{format(new Date(notification.created_at), "dd/MM HH:mm")}</span></div><p className="mt-1 truncate text-sm dark:text-gray-200">{notification.person?.name}{notification.activity?.title ? ` · ${notification.activity.title}` : ""}</p><p className="mt-1 truncate text-xs text-outline">{notification.content}</p></Link></li>)}</ul>;
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useOnlineStatus } from "../../hooks/useOnlineStatus";

const socialLinks = [
  { label: "Instagram", icon: "instagram", href: "https://www.instagram.com/ong_iracambi/", color: "text-[#E4405F]", hover: "hover:border-pink-300 hover:bg-pink-50 dark:hover:border-pink-800 dark:hover:bg-pink-950/30" },
  { label: "Facebook", icon: "facebook", href: "https://www.facebook.com/iracambi", color: "text-[#1877F2]", hover: "hover:border-blue-300 hover:bg-blue-50 dark:hover:border-blue-800 dark:hover:bg-blue-950/30" },
  { label: "YouTube", icon: "youtube", href: "https://www.youtube.com/@Iracambi", color: "text-[#FF0000]", hover: "hover:border-red-300 hover:bg-red-50 dark:hover:border-red-800 dark:hover:bg-red-950/30" },
  { label: "LinkedIn", icon: "linkedin", href: "https://www.linkedin.com/company/ong-iracambi", color: "text-[#0A66C2]", hover: "hover:border-sky-300 hover:bg-sky-50 dark:hover:border-sky-800 dark:hover:bg-sky-950/30" },
];

const footerTones = {
  admin: "border-slate-200 bg-slate-50 text-[#52606d] hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800",
  management: "border-violet-200 bg-violet-50 text-[#6d4bb3] hover:bg-violet-100 dark:border-violet-900 dark:bg-violet-950/30 dark:text-violet-300 dark:hover:bg-violet-950/50",
  operations: "border-blue-200 bg-blue-50 text-[#2563a6] hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300 dark:hover:bg-blue-950/50",
};

export default function Footer() {
  const isOnline = useOnlineStatus();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const updateVisibility = () => setShowBackToTop(window.scrollY > 500);
    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateVisibility);
  }, []);

  const backToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

  return (
    <footer className="relative mt-auto w-full overflow-hidden border-t border-emerald-100 bg-gradient-to-br from-white via-emerald-50/50 to-amber-50/40 pb-24 text-on-surface dark:border-emerald-950 dark:from-stone-950 dark:via-emerald-950/30 dark:to-stone-950 md:pb-0">
      <div className="pointer-events-none absolute -left-20 -top-24 h-52 w-52 rounded-full bg-emerald-200/25 blur-3xl dark:bg-emerald-700/10" />
      <div className="relative mx-auto grid max-w-screen-2xl gap-6 px-5 py-7 sm:px-8 md:grid-cols-[minmax(260px,1fr)_auto] md:items-center lg:px-10">
        <div className="flex items-center justify-center gap-4 text-center md:justify-start md:text-left">
          <a href="https://iracambi.org" target="_blank" rel="noopener noreferrer" className="group flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-white p-2 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-emerald-900 dark:bg-white/10" title="Visitar o site Iracambi">
            <img src="/logo.webp" alt="Iracambi" className="h-full w-full object-contain transition-transform group-hover:scale-105" />
          </a>
          <div className="min-w-0"><strong className="block text-base font-black tracking-tight text-primary dark:text-white">AGENDA IRACAMBI</strong><p className="mt-0.5 text-sm text-on-surface-variant dark:text-gray-300">Sistema de gestão institucional</p><div className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${isOnline ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`} role="status"><span className={`h-2 w-2 rounded-full ${isOnline ? "bg-emerald-500" : "bg-red-500"}`} />{isOnline ? "Sistema conectado" : "Sem conexão"}</div></div>
        </div>

        <div className="flex flex-col items-center gap-4 md:items-end">
          <nav className="flex flex-wrap items-center justify-center gap-2" aria-label="Links do rodapé">
            <FooterLink to="/about" icon="menu_book" tone="admin">Manual</FooterLink>
            <FooterLink to="/settings" icon="settings" tone="management">Configurações</FooterLink>
            <a href="https://iracambi.org" target="_blank" rel="noopener noreferrer" className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${footerTones.operations}`}><span className="material-symbols-outlined icon-plain rounded-lg p-1.5 icon-tone-operations text-[19px]">language</span>Site Iracambi<span className="material-symbols-outlined icon-plain text-[14px] opacity-60">open_in_new</span></a>
            {showBackToTop && <button type="button" onClick={backToTop} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md" aria-label="Voltar ao topo"><span className="material-symbols-outlined text-[19px]">arrow_upward</span><span className="hidden sm:inline">Voltar ao topo</span></button>}
          </nav>
          <div className="flex items-center gap-2" aria-label="Redes sociais da Iracambi">
            {socialLinks.map((social) => <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" title={social.label} aria-label={`Iracambi no ${social.label} (abre em nova guia)`} className={`flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white/80 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5 ${social.color} ${social.hover}`}><SocialIcon name={social.icon} /></a>)}
          </div>
        </div>
      </div>

      <div className="relative border-t border-emerald-100/80 bg-white/40 dark:border-white/10 dark:bg-black/10">
        <div className="mx-auto flex max-w-screen-2xl flex-col items-center justify-between gap-1 px-5 py-3 text-center text-[11px] text-outline sm:flex-row sm:px-8 lg:px-10"><span>© {new Date().getFullYear()} Colegiado IRACAMBI®</span><span>Agenda Iracambi · versão institucional 2026</span></div>
      </div>
    </footer>
  );
}

function FooterLink({ to, icon, tone, children }) {
  return <Link to={to} className={`inline-flex min-h-11 items-center gap-2 rounded-xl border px-3.5 py-2 text-sm font-bold shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${footerTones[tone]}`}><span className={`material-symbols-outlined icon-plain rounded-lg p-1.5 text-[19px] icon-tone-${tone}`}>{icon}</span>{children}</Link>;
}

function SocialIcon({ name }) {
  if (name === "instagram") return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-none stroke-current" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" className="fill-current stroke-none" /></svg>;
  if (name === "facebook") return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M13.7 22v-8h2.7l.4-3.1h-3.1V9c0-.9.3-1.5 1.6-1.5H17V4.7c-.3 0-1.3-.1-2.5-.1-2.5 0-4.2 1.5-4.2 4.3v2H7.5V14h2.8v8h3.4Z" /></svg>;
  if (name === "youtube") return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M22 12c0-2.1-.2-4.1-.5-5.1a2.7 2.7 0 0 0-1.9-1.9C17.9 4.5 12 4.5 12 4.5S6.1 4.5 4.4 5a2.7 2.7 0 0 0-1.9 1.9C2.2 7.9 2 9.9 2 12s.2 4.1.5 5.1A2.7 2.7 0 0 0 4.4 19c1.7.5 7.6.5 7.6.5s5.9 0 7.6-.5a2.7 2.7 0 0 0 1.9-1.9c.3-1 .5-3 .5-5.1Zm-12 3.3V8.7l5.7 3.3-5.7 3.3Z" /></svg>;
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 fill-current"><path d="M6.5 8.3H3.2V21h3.3V8.3ZM4.9 3A1.9 1.9 0 1 0 5 6.8 1.9 1.9 0 0 0 4.9 3ZM21 13.7c0-3.8-2-5.6-4.7-5.6-2.2 0-3.1 1.2-3.7 2V8.3H9.3V21h3.3v-6.3c0-1.7.3-3.3 2.4-3.3 2 0 2.1 1.9 2.1 3.4V21H21v-7.3Z" /></svg>;
}

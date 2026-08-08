import { useMemo, useState } from "react";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getUserColor } from "../../lib/colors";

const typeMeta = {
  create: { label: "Criação", icon: "add_circle", tone: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", group: "changes" },
  update: { label: "Edição", icon: "edit", tone: "bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", group: "changes" },
  status_change: { label: "Status", icon: "published_with_changes", tone: "bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", group: "status" },
  involvement: { label: "Envolvimento", icon: "group_add", tone: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", group: "people" },
  mention: { label: "Menção", icon: "alternate_email", tone: "bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300", group: "people" },
};
const fallbackMeta = { label: "Movimento", icon: "history", tone: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300", group: "changes" };

export default function ActivityTimeline({ logs }) {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState(false);
  const movements = useMemo(() => logs.filter((log) => log.type !== "comment").filter((log) => {
    const meta = typeMeta[log.type] || fallbackMeta;
    return (filter === "all" || meta.group === filter) && (!search.trim() || `${log.content} ${log.person?.name || ""} ${meta.label}`.toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR")));
  }), [logs, filter, search]);
  const visible = expanded ? movements : movements.slice(0, 8);
  const grouped = visible.reduce((result, log) => {
    const key = format(new Date(log.created_at), "yyyy-MM-dd");
    if (!result[key]) result[key] = [];
    result[key].push(log);
    return result;
  }, {});

  return <section aria-labelledby="timeline-title">
    <div className="mb-4"><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-light dark:text-green-300">Rastreabilidade</p><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 id="timeline-title" className="text-xl font-black text-primary dark:text-white">Linha do tempo</h3><p className="text-xs text-outline">{movements.length} movimento{movements.length === 1 ? "" : "s"} encontrado{movements.length === 1 ? "" : "s"}</p></div><div className="relative w-full sm:w-56"><span className="material-symbols-outlined icon-plain absolute left-3 top-2.5 text-[18px] text-outline">search</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no histórico" className="w-full rounded-xl border border-surface-variant bg-white py-2 pl-9 pr-3 text-xs dark:border-white/10 dark:bg-white/5 dark:text-white" /></div></div></div>
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filtrar linha do tempo">{[["all", "Tudo", "history"], ["status", "Status", "published_with_changes"], ["changes", "Alterações", "edit_note"], ["people", "Pessoas", "group"]].map(([value, label, icon]) => <button key={value} type="button" onClick={() => setFilter(value)} aria-pressed={filter === value} className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-bold transition ${filter === value ? "border-primary bg-primary text-white" : "border-surface-variant bg-white text-on-surface-variant hover:bg-surface dark:border-white/10 dark:bg-white/5 dark:text-gray-300"}`}><span className="material-symbols-outlined icon-plain text-[16px]">{icon}</span>{label}</button>)}</div>

    {!movements.length ? <div className="rounded-3xl border border-dashed border-surface-variant px-5 py-10 text-center dark:border-white/10"><span className="material-symbols-outlined text-4xl text-slate-300">manage_history</span><h4 className="mt-2 font-bold text-primary dark:text-white">Nenhum movimento encontrado</h4><p className="mt-1 text-sm text-outline">Altere os filtros ou aguarde uma atualização da atividade.</p></div> : <div className="space-y-6">{Object.entries(grouped).map(([date, entries]) => <div key={date}><div className="mb-3 flex items-center gap-3"><span className="shrink-0 rounded-full bg-surface px-3 py-1 text-[10px] font-bold uppercase text-outline dark:bg-white/5">{dayLabel(date)}</span><div className="h-px flex-1 bg-surface-variant dark:bg-white/10" /></div><div className="relative ml-5 border-l-2 border-slate-200 pl-7 dark:border-slate-800">{entries.map((log, index) => <TimelineEntry key={log.id} log={log} last={index === entries.length - 1} />)}</div></div>)}</div>}
    {movements.length > 8 && <button type="button" onClick={() => setExpanded((value) => !value)} className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-primary/20 bg-green-50 text-sm font-bold text-primary transition hover:bg-green-100 dark:bg-emerald-950/20 dark:text-green-300"><span className="material-symbols-outlined icon-plain text-[18px]">{expanded ? "expand_less" : "expand_more"}</span>{expanded ? "Mostrar menos" : `Mostrar mais ${movements.length - 8}`}</button>}
  </section>;
}

function TimelineEntry({ log, last }) {
  const meta = typeMeta[log.type] || fallbackMeta;
  const color = getUserColor(log.person?.id);
  return <article className={`relative ${last ? "pb-1" : "pb-6"}`}><span className={`absolute -left-[42px] top-0 flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-background dark:ring-dark-background ${meta.tone}`}><span className="material-symbols-outlined icon-plain text-[16px]">{meta.icon}</span></span><div className="rounded-2xl border border-surface-variant bg-white p-4 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5"><header className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${meta.tone}`}>{meta.label}</span><strong className={`text-sm ${color.text}`}>{log.person?.name || "Sistema"}</strong></div><time dateTime={log.created_at} title={format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss")} className="text-[10px] text-outline">{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}</time></header><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-on-surface dark:text-gray-200">{log.content}</p>{log.metadata?.old_status && log.metadata?.new_status && <div className="mt-3 flex flex-wrap items-center gap-2 text-xs"><span className="rounded-lg bg-slate-100 px-2 py-1 dark:bg-slate-800">{log.metadata.old_status}</span><span className="material-symbols-outlined icon-plain text-[16px] text-outline">arrow_forward</span><span className="rounded-lg bg-emerald-100 px-2 py-1 font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{log.metadata.new_status}</span></div>}</div></article>;
}
function dayLabel(value) { const date = new Date(`${value}T12:00:00`); if (isToday(date)) return "Hoje"; if (isYesterday(date)) return "Ontem"; return format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); }

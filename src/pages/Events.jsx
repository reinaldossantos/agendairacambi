import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../lib/supabaseClient";
import { EVENT_STATUSES, eventPeriod, normalizeEventData } from "../lib/events";
import { generateEventsPdf } from "../lib/eventsPdf";

const today = format(new Date(), "yyyy-MM-dd");

export default function Events() {
  const [events, setEvents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ start: today.slice(0, 8) + "01", end: "", program: "", status: "", search: "" });

  const load = useCallback(async () => {
    setLoading(true); setError("");
    const [{ data, error: queryError }, { data: programData }] = await Promise.all([
      supabase.from("activities").select("id, title, description, due_date, images, files, involved_ids, is_event, event_data, programs:program_id(id, name), persons:responsible_id(id, name)").eq("is_event", true).order("due_date", { ascending: true }),
      supabase.from("programs").select("id, name").order("name"),
    ]);
    if (queryError) setError(queryError.message.includes("is_event") ? "O módulo de eventos ainda precisa da migração activity_events.sql no Supabase." : queryError.message);
    setEvents(data || []); setPrograms(programData || []); setLoading(false);
  }, []);

  useEffect(() => {
    // Consulta remota necessária ao abrir o módulo.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = useMemo(() => events.filter((event) => {
    const data = normalizeEventData(event.event_data);
    const period = eventPeriod(event);
    const haystack = `${event.title} ${event.description || ""} ${data.theme} ${data.partners} ${data.location}`.toLowerCase();
    return (!filters.start || period.end.slice(0, 10) >= filters.start)
      && (!filters.end || period.start.slice(0, 10) <= filters.end)
      && (!filters.program || event.programs?.id === filters.program)
      && (!filters.status || data.status === filters.status)
      && (!filters.search || haystack.includes(filters.search.toLowerCase()));
  }), [events, filters]);

  const summary = useMemo(() => ({
    total: filtered.length,
    planned: filtered.filter((event) => !["Realizado", "Cancelado"].includes(normalizeEventData(event.event_data).status)).length,
    completed: filtered.filter((event) => normalizeEventData(event.event_data).status === "Realizado").length,
  }), [filtered]);

  return <main className="mx-auto max-w-7xl px-2 sm:px-4">
    <header className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-primary-light dark:text-green-300">Agenda institucional</p><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Eventos</h2><p className="text-sm text-outline">Programação consolidada das atividades marcadas como evento.</p></div><div className="flex flex-wrap gap-2"><Link to="/new" state={{ createEvent: true }} className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 font-bold text-primary"><span className="material-symbols-outlined">add</span>Novo evento</Link><button disabled={!filtered.length} onClick={() => generateEventsPdf(filtered, filters)} className="inline-flex items-center gap-2 rounded-full bg-red-700 px-5 py-2.5 font-bold text-white disabled:opacity-50"><span className="material-symbols-outlined">picture_as_pdf</span>Gerar programação</button></div></header>

    {error && <div role="alert" className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
    <section className="mb-5 grid gap-3 rounded-2xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface sm:grid-cols-2 lg:grid-cols-5">
      <Filter label="Início"><input type="date" value={filters.start} onChange={(e) => setFilters({ ...filters, start: e.target.value })} /></Filter>
      <Filter label="Término"><input type="date" value={filters.end} onChange={(e) => setFilters({ ...filters, end: e.target.value })} /></Filter>
      <Filter label="Programa"><select value={filters.program} onChange={(e) => setFilters({ ...filters, program: e.target.value })}><option value="">Todos</option>{programs.map((program) => <option key={program.id} value={program.id}>{program.name}</option>)}</select></Filter>
      <Filter label="Situação"><select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todas</option>{EVENT_STATUSES.map((status) => <option key={status}>{status}</option>)}</select></Filter>
      <Filter label="Buscar"><input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Evento, tema ou parceiro" /></Filter>
    </section>

    <section className="mb-5 grid gap-3 sm:grid-cols-3">{[["Total", summary.total, "festival"], ["Programados", summary.planned, "event_upcoming"], ["Realizados", summary.completed, "task_alt"]].map(([label, value, icon]) => <div key={label} className="rounded-2xl border border-surface-variant bg-white p-4 dark:border-white/10 dark:bg-dark-surface"><span className="material-symbols-outlined text-primary">{icon}</span><strong className="ml-2 text-2xl text-primary dark:text-white">{value}</strong><p className="text-xs text-outline">{label}</p></div>)}</section>

    {loading ? <p className="py-16 text-center text-outline">Carregando eventos…</p> : !filtered.length ? <div className="rounded-2xl border border-dashed border-surface-variant py-16 text-center"><span className="material-symbols-outlined text-5xl text-outline">event_busy</span><p className="mt-2 text-outline">Nenhum evento encontrado para os filtros selecionados.</p></div> : <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((event) => <EventCard key={event.id} event={event} />)}</section>}
  </main>;
}

function EventCard({ event }) {
  const data = normalizeEventData(event.event_data); const period = eventPeriod(event);
  const label = (value) => value ? format(parseISO(value), "dd MMM yyyy · HH:mm", { locale: ptBR }) : "Data não informada";
  return <article className="overflow-hidden rounded-2xl border border-surface-variant bg-white shadow-sm dark:border-white/10 dark:bg-dark-surface"><div className="border-l-4 border-primary p-5"><div className="mb-3 flex items-start justify-between gap-3"><div><span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800">{data.type || "Evento"}</span><h3 className="mt-2 text-lg font-bold text-primary dark:text-white">{event.title}</h3><p className="text-sm text-outline">{data.theme || "Temática não informada"}</p></div><span className="rounded-full bg-surface px-2.5 py-1 text-xs font-bold dark:bg-gray-700">{data.status}</span></div><dl className="space-y-2 text-sm"><Info icon="schedule" text={`${label(period.start)} — ${label(period.end)}`} /><Info icon="location_on" text={`${data.location || "Local a definir"} · ${data.format}`} /><Info icon="account_tree" text={event.programs?.name || "Programa não informado"} /><Info icon="person" text={event.persons?.name || "Responsável não informado"} />{data.partners && <Info icon="handshake" text={data.partners} />}</dl><div className="mt-4 flex items-center justify-between border-t border-surface-variant pt-3 dark:border-white/10"><span className="text-xs text-outline">{(event.images?.length || 0) + (event.files?.length || 0)} evidência(s)</span><Link to={`/activity/${event.id}`} className="inline-flex items-center gap-1 font-bold text-primary hover:underline dark:text-green-300">Abrir evento<span className="material-symbols-outlined text-[18px]">arrow_forward</span></Link></div></div></article>;
}

function Info({ icon, text }) { return <div className="flex gap-2"><dt><span className="material-symbols-outlined text-[18px] text-primary">{icon}</span></dt><dd className="min-w-0 break-words text-on-surface-variant dark:text-gray-300">{text}</dd></div>; }
function Filter({ label, children }) { return <label className="text-xs font-bold text-outline"><span className="mb-1 block">{label}</span><div className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border [&>*]:border-surface-variant [&>*]:bg-surface [&>*]:px-3 [&>*]:py-2.5 [&>*]:text-sm [&>*]:font-normal dark:[&>*]:border-white/10 dark:[&>*]:bg-gray-800 dark:[&>*]:text-white">{children}</div></label>; }

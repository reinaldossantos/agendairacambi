import { EVENT_FORMATS, EVENT_STATUSES, EVENT_TYPES, normalizeEventData } from "../../lib/events";

const inputClass = "w-full rounded-xl border border-surface-variant bg-white px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 dark:border-white/10 dark:bg-dark-background dark:text-white";

export default function EventFields({ value, onChange, compact = false }) {
  const data = normalizeEventData(value);
  const update = (field, fieldValue) => onChange({ ...data, [field]: fieldValue });
  return (
    <section className="space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-900/10">
      <div className="flex items-start gap-3"><span className="material-symbols-outlined rounded-xl bg-primary p-2 text-white">festival</span><div><h4 className="font-bold text-primary dark:text-white">Informações do evento</h4><p className="text-xs text-outline">Estes dados alimentarão a programação e os relatórios de eventos.</p></div></div>
      <div className={`grid gap-3 ${compact ? "md:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3"}`}>
        <Field label="Tipo de evento"><select className={inputClass} value={data.type} onChange={(e) => update("type", e.target.value)}><option value="">Selecione</option>{EVENT_TYPES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Situação do evento"><select className={inputClass} value={data.status} onChange={(e) => update("status", e.target.value)}>{EVENT_STATUSES.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Formato"><select className={inputClass} value={data.format} onChange={(e) => update("format", e.target.value)}>{EVENT_FORMATS.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Início"><input required type="datetime-local" className={inputClass} value={data.start_at} onChange={(e) => update("start_at", e.target.value)} /></Field>
        <Field label="Término"><input required type="datetime-local" className={inputClass} value={data.end_at} min={data.start_at || undefined} onChange={(e) => update("end_at", e.target.value)} /></Field>
        <Field label="Local ou plataforma"><input className={inputClass} value={data.location} onChange={(e) => update("location", e.target.value)} placeholder="Local, cidade ou link" /></Field>
        <Field label="Temática ambiental" wide><input required className={inputClass} value={data.theme} onChange={(e) => update("theme", e.target.value)} placeholder="Tema principal do evento" /></Field>
        <Field label="Público previsto"><input type="number" min="0" className={inputClass} value={data.audience_expected} onChange={(e) => update("audience_expected", e.target.value)} /></Field>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Parceiros envolvidos"><textarea rows="3" className={inputClass} value={data.partners} onChange={(e) => update("partners", e.target.value)} placeholder="Organizações e instituições parceiras" /></Field>
        <Field label="Contrapartidas necessárias"><textarea rows="3" className={inputClass} value={data.counterparts} onChange={(e) => update("counterparts", e.target.value)} placeholder="Recursos, materiais, serviços ou compromissos" /></Field>
        <Field label="Resultados esperados"><textarea rows="3" className={inputClass} value={data.expected_results} onChange={(e) => update("expected_results", e.target.value)} /></Field>
        <Field label="Observações"><textarea rows="3" className={inputClass} value={data.notes} onChange={(e) => update("notes", e.target.value)} /></Field>
      </div>
      {(data.status === "Realizado" || data.audience_reached || data.results) && <div className="grid gap-3 border-t border-emerald-200 pt-4 md:grid-cols-2 dark:border-emerald-900">
        <Field label="Público alcançado"><input type="number" min="0" className={inputClass} value={data.audience_reached} onChange={(e) => update("audience_reached", e.target.value)} /></Field>
        <Field label="Contrapartidas cumpridas"><textarea rows="3" className={inputClass} value={data.counterparts_completed} onChange={(e) => update("counterparts_completed", e.target.value)} /></Field>
        <Field label="Resultados obtidos" wide><textarea rows="4" className={inputClass} value={data.results} onChange={(e) => update("results", e.target.value)} placeholder="Resultados, alcance e legado do evento" /></Field>
      </div>}
    </section>
  );
}

function Field({ label, wide, children }) {
  return <label className={`block text-xs font-semibold text-on-surface-variant dark:text-gray-300 ${wide ? "md:col-span-2" : ""}`}><span className="mb-1 block">{label}</span>{children}</label>;
}

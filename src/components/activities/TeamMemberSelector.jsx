import { useMemo, useState } from "react";
import { getUserColor } from "../../lib/colors";

export default function TeamMemberSelector({ people, selectedIds, onChange, label = "Envolver nesta atividade", maxSelected = null }) {
  const [query, setQuery] = useState("");
  const [limitWarning, setLimitWarning] = useState("");
  const selected = selectedIds || [];
  const visiblePeople = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    return term ? people.filter((person) => person.name.toLocaleLowerCase("pt-BR").includes(term)) : people;
  }, [people, query]);

  const toggle = (id) => {
    if (selected.includes(id)) {
      setLimitWarning("");
      onChange(selected.filter((item) => item !== id));
      return;
    }
    if (maxSelected && selected.length >= maxSelected) {
      setLimitWarning(`Não é possível selecionar mais de ${maxSelected} pessoa(s), que é a capacidade do veículo.`);
      return;
    }
    setLimitWarning("");
    onChange([...selected, id]);
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm dark:border-emerald-900/60 dark:from-dark-background dark:to-emerald-950/20">
      <div className="flex flex-col gap-3 border-b border-emerald-100 p-4 dark:border-emerald-900/60 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined rounded-lg bg-emerald-100 p-1.5 text-[20px] text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">group_add</span>
            <h3 className="text-sm font-black text-primary dark:text-white">{label}</h3>
            <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">{selected.length}</span>
          </div>
          <p className="mt-1 text-xs text-outline">Selecione os colegas que participarão ou acompanharão a atividade.</p>
        </div>
        <div className="flex gap-2 text-xs font-bold">
          <button type="button" onClick={() => { const ids = people.map((person) => person.id); onChange(maxSelected ? ids.slice(0, maxSelected) : ids); setLimitWarning(maxSelected && ids.length > maxSelected ? `Foram selecionadas somente ${maxSelected} pessoa(s), respeitando a capacidade do veículo.` : ""); }} className="rounded-lg px-2.5 py-1.5 text-primary transition hover:bg-emerald-100 dark:text-emerald-300 dark:hover:bg-emerald-950">Selecionar todos</button>
          {selected.length > 0 && <button type="button" onClick={() => onChange([])} className="rounded-lg px-2.5 py-1.5 text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/30">Limpar</button>}
        </div>
      </div>
      <div className="p-4">
        {limitWarning && <div role="alert" className="mb-3 flex items-start gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><span className="material-symbols-outlined text-[18px]">warning</span><span>{limitWarning}</span></div>}
        {people.length > 6 && <label className="mb-3 flex items-center gap-2 rounded-xl border border-surface-variant bg-white px-3 py-2 dark:bg-gray-800"><span className="material-symbols-outlined text-[19px] text-outline">search</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar colega" className="min-w-0 flex-1 bg-transparent text-sm outline-none dark:text-white" /></label>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visiblePeople.map((person) => {
            const active = selected.includes(person.id);
            const capacityReached = Boolean(maxSelected && selected.length >= maxSelected && !active);
            const color = getUserColor(person.id);
            return <button type="button" key={person.id} onClick={() => toggle(person.id)} aria-pressed={active} aria-disabled={capacityReached} className={`group flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left transition ${active ? "border-emerald-500 bg-emerald-50 shadow-sm ring-1 ring-emerald-500 dark:bg-emerald-950/40" : capacityReached ? "cursor-not-allowed border-surface-variant bg-gray-50 opacity-50 dark:border-white/10 dark:bg-gray-800" : "border-surface-variant bg-white hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-sm dark:border-white/10 dark:bg-gray-800"}`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${color.bg} ${color.text}`}>{person.initials || person.name.slice(0, 2).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-sm font-bold text-on-surface dark:text-white">{person.name}</span><span className={`material-symbols-outlined text-[21px] transition ${active ? "text-emerald-600" : "text-outline/40 group-hover:text-emerald-500"}`}>{active ? "check_circle" : capacityReached ? "block" : "add_circle"}</span></button>;
          })}
        </div>
        {!visiblePeople.length && <div className="py-5 text-center text-sm text-outline">Nenhum colega encontrado.</div>}
      </div>
    </section>
  );
}

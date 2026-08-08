import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getProgramColor } from "../../lib/colors";

const normalize = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

export default function ProgramSwitcher({ programs, value, onChange, allValue = "Todos", className = "" }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchRef = useRef(null);
  const selectedColor = value === allValue ? null : getProgramColor(value);
  const filtered = programs.filter((program) => normalize(program.name).includes(normalize(search.trim())));

  useEffect(() => {
    if (!open) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = window.setTimeout(() => searchRef.current?.focus(), 80);
    const closeOnEscape = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function choose(programName) {
    onChange(programName);
    setSearch("");
    setOpen(false);
  }

  return <div className={className}>
    <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-expanded={open} className={`group flex min-h-[56px] w-full items-center gap-3 rounded-2xl border bg-white px-4 py-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:bg-dark-surface ${selectedColor ? `${selectedColor.border}` : "border-accent"}`}>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selectedColor ? `${selectedColor.bg} ${selectedColor.text}` : "bg-accent/30 text-primary"}`}><span className="material-symbols-outlined">{value === allValue ? "apps" : "account_tree"}</span></span>
      <span className="min-w-0 flex-1"><span className="block text-[11px] font-bold uppercase tracking-wider text-outline">Programa selecionado</span><strong className="block truncate text-sm text-primary dark:text-white sm:text-base">{value === allValue ? "Todos os programas" : value}</strong></span>
      <span className="material-symbols-outlined text-outline transition-transform group-hover:translate-y-0.5">expand_more</span>
    </button>
    {open && createPortal(<div className="fixed inset-0 z-[1200] flex items-end justify-center sm:items-center sm:p-5" role="presentation">
      <button type="button" className="absolute inset-0 bg-stone-950/35 backdrop-blur-sm" onClick={() => setOpen(false)} aria-label="Fechar seletor de programas" />
      <section role="dialog" aria-modal="true" aria-labelledby="program-switcher-title" className="relative max-h-[88dvh] w-full overflow-hidden rounded-t-3xl border border-surface-variant bg-white shadow-2xl dark:border-gray-700 dark:bg-dark-surface sm:max-w-3xl sm:rounded-3xl">
        <div className="flex items-start justify-between border-b border-surface-variant p-5 dark:border-gray-700 sm:p-6"><div><p className="text-xs font-bold uppercase tracking-wider text-primary-light">Navegação inteligente</p><h2 id="program-switcher-title" className="text-xl font-bold text-primary dark:text-white">Escolha um programa</h2><p className="mt-1 text-sm text-outline">Pesquise ou selecione uma das áreas abaixo.</p></div><button type="button" onClick={() => setOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-surface dark:hover:bg-white/10" aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div>
        <div className="border-b border-surface-variant p-4 dark:border-gray-700 sm:px-6"><label className="relative block"><span className="material-symbols-outlined absolute inset-y-0 left-3 flex items-center text-outline">search</span><input ref={searchRef} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Pesquisar programa..." className="w-full rounded-2xl border border-surface-variant bg-surface py-3.5 pl-11 pr-4 text-base focus:border-primary focus:ring-primary dark:border-gray-700 dark:bg-gray-800 dark:text-white" /></label></div>
        <div className="max-h-[58dvh] overflow-y-auto p-4 sm:p-6"><div className="grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => choose(allValue)} aria-pressed={value === allValue} className={`flex min-h-[72px] items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary ${value === allValue ? "border-accent bg-accent/20 shadow-sm" : "border-surface-variant bg-white dark:border-gray-700 dark:bg-gray-800"}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent/30 text-primary"><span className="material-symbols-outlined">apps</span></span><span><strong className="block text-primary dark:text-white">Todos os programas</strong><span className="text-xs text-outline">Visão completa das atividades</span></span>{value === allValue && <span className="material-symbols-outlined ml-auto text-primary">check_circle</span>}</button>{filtered.map((program) => { const color = getProgramColor(program.name); const selected = value === program.name; return <button key={program.id || program.name} type="button" onClick={() => choose(program.name)} aria-pressed={selected} className={`flex min-h-[72px] items-center gap-3 rounded-2xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary ${selected ? `${color.bg} ${color.border} shadow-sm` : `border-surface-variant bg-white dark:border-gray-700 dark:bg-gray-800 ${color.hover}`}`}><span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${color.bg} ${color.text}`}><span className="material-symbols-outlined">account_tree</span></span><strong className={`min-w-0 flex-1 text-sm ${selected ? color.text : "text-primary dark:text-white"}`}>{program.name}</strong>{selected && <span className={`material-symbols-outlined ${color.text}`}>check_circle</span>}</button>; })}</div>{filtered.length === 0 && <div className="py-12 text-center"><span className="material-symbols-outlined text-4xl text-outline">search_off</span><p className="mt-2 font-bold text-primary dark:text-white">Nenhum programa encontrado</p><p className="text-sm text-outline">Tente pesquisar usando outro termo.</p></div>}</div>
      </section>
    </div>, document.body)}
  </div>;
}

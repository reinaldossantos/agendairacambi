import { useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";

const options = [
  { id: "activities", label: "Atividades e eventos", description: "Atividades da agenda e seus relacionamentos dependentes.", icon: "event_busy" },
  { id: "expense_reports", label: "Relatórios de despesas", description: "Prestações de contas, aprovações e notificações vinculadas.", icon: "receipt_long" },
  { id: "monthly_reports", label: "Relatórios mensais", description: "Rascunhos e relatórios mensais consolidados.", icon: "summarize" },
  { id: "vehicle_bookings", label: "Reservas de veículos", description: "Agendamentos e históricos operacionais dos veículos.", icon: "directions_car" },
  { id: "announcements", label: "Avisos do mural", description: "Publicações e avisos institucionais.", icon: "campaign" },
  { id: "program_files", label: "Arquivos de programas", description: "Registros do repositório; os objetos serão reconciliados no Storage.", icon: "folder_delete" },
  { id: "projects", label: "Projetos de gestão", description: "Projetos, tarefas, riscos, anexos, histórico e notificações.", icon: "inventory_2" },
  { id: "notifications", label: "Notificações e colaboração", description: "Notificações, comentários e registros colaborativos avulsos.", icon: "notifications_off" },
  { id: "audit_logs", label: "Logs de acesso e auditoria", description: "Histórico técnico de acessos e alterações. Use somente para retenção.", icon: "manage_history" },
];

export default function AdminMaintenance() {
  const [cutoffDate, setCutoffDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [direction, setDirection] = useState("on_or_after");
  const [selected, setSelected] = useState([]);
  const [preview, setPreview] = useState(null);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [orphanConfirmation, setOrphanConfirmation] = useState("");

  const total = useMemo(() => preview?.total || 0, [preview]);
  const invalidatePreview = () => { setPreview(null); setConfirmation(""); setMessage(null); };
  const toggle = (id) => { invalidatePreview(); setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); };
  const cutoff = () => `${cutoffDate}T${direction === "on_or_after" ? "00:00:00" : "23:59:59"}-03:00`;

  async function run(mode) {
    if (!cutoffDate || !selected.length) return setMessage({ type: "error", text: "Escolha a data e pelo menos uma categoria." });
    setLoading(true); setMessage(null);
    const { data, error } = await supabase.functions.invoke("admin-data-maintenance", { body: { mode, cutoff: cutoff(), direction, scopes: selected, confirmation } });
    setLoading(false);
    if (error || data?.error) return setMessage({ type: "error", text: data?.error || error.message });
    if (mode === "preview") { setPreview(data); return setMessage({ type: "info", text: `${data.total} registro(s) encontrado(s). Revise antes de excluir.` }); }
    setPreview(null); setSelected([]); setConfirmation("");
    setMessage({ type: "success", text: `${data.total} registro(s) excluído(s). A operação foi registrada na auditoria.` });
  }

  async function cleanOrphans() {
    if (orphanConfirmation !== "LIMPAR ARQUIVOS") return;
    setLoading(true); setMessage(null);
    const { data, error } = await supabase.functions.invoke("cleanup-old-files");
    setLoading(false);
    if (error || data?.error) return setMessage({ type: "error", text: data?.error || error.message });
    setOrphanConfirmation("");
    setMessage({ type: "success", text: `${data.total || 0} arquivo(s) órfão(s) removido(s).` });
  }

  return <div className="mx-auto max-w-6xl px-2 sm:px-4">
    <header className="mb-6"><p className="text-sm font-bold text-red-700 dark:text-red-300">Administração restrita</p><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Manutenção e limpeza de dados</h2><p className="mt-2 max-w-3xl text-sm text-outline">Consulte a quantidade antes de excluir registros de teste ou aplicar uma política de retenção. Cadastros estruturais, usuários, programas, veículos e configurações não são disponibilizados para limpeza em massa.</p></header>
    {message && <div role="status" className={`mb-5 rounded-xl border p-4 text-sm ${message.type === "error" ? "border-red-300 bg-red-50 text-red-800" : message.type === "success" ? "border-green-300 bg-green-50 text-green-800" : "border-blue-300 bg-blue-50 text-blue-800"}`}>{message.text}</div>}

    <section className="rounded-2xl border border-surface-variant bg-white p-5 dark:border-white/10 dark:bg-dark-surface sm:p-6">
      <h3 className="font-bold text-primary dark:text-white">1. Defina o período</h3>
      <div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="mb-1 block text-sm font-medium">Direção da limpeza</span><select value={direction} onChange={(event) => { setDirection(event.target.value); invalidatePreview(); }} className="w-full rounded-xl border border-surface-variant bg-surface px-3 py-3 dark:bg-gray-800"><option value="on_or_after">A partir da data — indicado para apagar testes recentes</option><option value="on_or_before">Até a data — indicado para política de retenção</option></select></label><label><span className="mb-1 block text-sm font-medium">Data de corte</span><input type="date" value={cutoffDate} onChange={(event) => { setCutoffDate(event.target.value); invalidatePreview(); }} className="w-full rounded-xl border border-surface-variant bg-surface px-3 py-3 dark:bg-gray-800" /></label></div>
    </section>

    <section className="mt-5 rounded-2xl border border-surface-variant bg-white p-5 dark:border-white/10 dark:bg-dark-surface sm:p-6"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-primary dark:text-white">2. Escolha o que será limpo</h3><div className="flex gap-2"><button type="button" onClick={() => { setSelected(options.map((item) => item.id)); invalidatePreview(); }} className="text-xs font-bold text-primary underline">Selecionar tudo</button><button type="button" onClick={() => { setSelected([]); invalidatePreview(); }} className="text-xs font-bold text-outline underline">Limpar seleção</button></div></div><div className="mt-4 grid gap-3 md:grid-cols-2">{options.map((option) => <label key={option.id} className={`flex cursor-pointer gap-3 rounded-xl border p-4 ${selected.includes(option.id) ? "border-red-400 bg-red-50 dark:bg-red-950/20" : "border-surface-variant dark:border-white/10"}`}><input type="checkbox" checked={selected.includes(option.id)} onChange={() => toggle(option.id)} className="mt-1 rounded text-red-700" /><span className="material-symbols-outlined text-red-700">{option.icon}</span><span><strong className="block text-sm text-primary dark:text-white">{option.label}</strong><span className="text-xs text-outline">{option.description}</span>{preview?.results?.[option.id] && <span className="mt-2 block text-xs font-black text-red-700">{preview.results[option.id].count} registro(s)</span>}</span></label>)}</div></section>

    <section className="mt-5 rounded-2xl border border-red-200 bg-red-50/60 p-5 dark:border-red-900 dark:bg-red-950/20 sm:p-6"><h3 className="font-bold text-red-900 dark:text-red-200">3. Visualize e confirme</h3><p className="mt-1 text-sm text-red-800/80 dark:text-red-300">A exclusão é permanente. Gere uma prévia sempre que alterar data, direção ou categorias.</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" disabled={loading || !selected.length || !cutoffDate} onClick={() => run("preview")} className="rounded-full border border-primary px-5 py-3 font-bold text-primary disabled:opacity-50">{loading ? "Processando…" : "Visualizar registros"}</button>{preview && <><label className="min-w-[240px] flex-1"><span className="mb-1 block text-xs font-bold text-red-800">Digite EXCLUIR para confirmar {total} registro(s)</span><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border border-red-300 bg-white px-3 py-3" placeholder="EXCLUIR" /></label><button type="button" disabled={loading || confirmation !== "EXCLUIR"} onClick={() => run("execute")} className="rounded-full bg-red-700 px-5 py-3 font-bold text-white disabled:opacity-40">Excluir definitivamente</button></>}</div></section>

    <section className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/20 sm:p-6"><h3 className="font-bold text-amber-950 dark:text-amber-200">Reconciliação do armazenamento</h3><p className="mt-1 text-sm text-amber-900/80 dark:text-amber-300">Compara todos os arquivos com as referências do banco e remove somente objetos órfãos com mais de 24 horas.</p><div className="mt-4 flex flex-col gap-3 sm:flex-row"><input value={orphanConfirmation} onChange={(event) => setOrphanConfirmation(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-amber-400 bg-white px-3 py-3" placeholder="Digite LIMPAR ARQUIVOS" /><button type="button" disabled={loading || orphanConfirmation !== "LIMPAR ARQUIVOS"} onClick={cleanOrphans} className="rounded-full bg-amber-700 px-5 py-3 font-bold text-white disabled:opacity-40">Remover arquivos órfãos</button></div></section>
  </div>;
}

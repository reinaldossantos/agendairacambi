import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { supabase } from "../lib/supabaseClient";

const actionLabels = { INSERT: "Inclusão", UPDATE: "Edição", DELETE: "Exclusão" };
const tableLabels = {
  activities: "Atividades", activity_logs: "Registros de atividades", persons: "Pessoas", programs: "Programas",
  announcements: "Avisos", program_files: "Arquivos", vehicles: "Veículos", vehicle_bookings: "Agendamentos de veículos",
  expense_reports: "Relatórios de despesas", expense_report_notifications: "Notificações de despesas", mileage_rates: "Tarifas de KM",
  monthly_activity_reports: "Relatórios mensais", app_settings: "Configurações",
  expense_report_approvals: "Aprovações de despesas", expense_approval_config: "Configuração de aprovadores",
  management_projects: "Projetos", management_project_tasks: "Tarefas de projetos", management_project_risks: "Riscos de projetos",
  management_project_logs: "Histórico de projetos", management_project_notifications: "Notificações de projetos",
  purchase_requests: "Solicitações de compras", purchase_request_approvals: "Aprovações de compras",
  purchase_request_history: "Histórico de compras", purchase_request_steps: "Etapas de compras", purchase_request_notifications: "Notificações de compras",
  security_notifications: "Notificações de segurança", notification_read_audit: "Leituras de notificações", audit_control: "Controle da auditoria",
};

export default function AuditLog() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ search: "", table: "", action: "", start: "", end: "" });

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase.from("system_audit_logs").select("*").order("occurred_at", { ascending: false }).limit(1000);
    if (queryError) setError(queryError.message);
    setLogs(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { const timer = window.setTimeout(loadLogs, 0); return () => window.clearTimeout(timer); }, [loadLogs]);

  const filtered = useMemo(() => logs.filter((log) => {
    const term = filters.search.trim().toLowerCase();
    const matchesTerm = !term || [log.actor_name, log.record_id, tableLabels[log.table_name], ...(log.changed_fields || [])].some((value) => String(value || "").toLowerCase().includes(term));
    const day = log.occurred_at?.slice(0, 10);
    return matchesTerm && (!filters.table || log.table_name === filters.table) && (!filters.action || log.action === filters.action) && (!filters.start || day >= filters.start) && (!filters.end || day <= filters.end);
  }), [logs, filters]);

  const tables = [...new Set(logs.map((log) => log.table_name))].sort();
  return <div className="mx-auto max-w-7xl px-2 sm:px-4">
    <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-sm font-medium text-primary-light dark:text-green-300">Governança e segurança</p><h2 className="text-headline-lg font-semibold text-primary dark:text-white">Auditoria do sistema</h2><p className="text-sm text-outline">Histórico imutável de inclusões, edições e exclusões.</p><span className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800 dark:bg-green-900/30 dark:text-green-300"><span className="material-symbols-outlined text-[16px]">verified_user</span>Auditoria permanente ativa</span></div><button onClick={loadLogs} className="rounded-full border border-primary px-4 py-2.5 text-sm font-bold text-primary dark:text-white"><span className="material-symbols-outlined align-middle text-[18px]">refresh</span> Atualizar</button></div>
    {error && <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700">Não foi possível consultar a auditoria: {error}</div>}
    <section className="mb-5 grid gap-3 rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface md:grid-cols-5">
      <Filter label="Buscar"><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Usuário, registro ou campo" /></Filter>
      <Filter label="Módulo"><select value={filters.table} onChange={(event) => setFilters({ ...filters, table: event.target.value })}><option value="">Todos</option>{tables.map((table) => <option key={table} value={table}>{tableLabels[table] || table}</option>)}</select></Filter>
      <Filter label="Movimento"><select value={filters.action} onChange={(event) => setFilters({ ...filters, action: event.target.value })}><option value="">Todos</option>{Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Filter>
      <Filter label="Data inicial"><input type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></Filter>
      <Filter label="Data final"><input type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></Filter>
    </section>
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-white dark:border-gray-700 dark:bg-dark-surface">
      <div className="border-b border-surface-variant px-4 py-3 text-sm text-outline dark:border-gray-700">{filtered.length} movimento(s) encontrado(s)</div>
      <div className="grid gap-3 md:hidden">{filtered.map((log) => <article key={log.id} className="rounded-xl border border-surface-variant p-4 dark:border-white/10"><div className="flex items-start justify-between gap-2"><div><p className="text-xs text-outline">{format(new Date(log.occurred_at), "dd/MM/yyyy HH:mm:ss")}</p><h3 className="font-bold text-primary dark:text-white">{log.actor_name || "Não identificado"}</h3><p className="text-xs text-outline">{tableLabels[log.table_name] || log.table_name}</p></div><span className={`rounded-full px-2 py-1 text-[10px] font-bold ${log.action === "DELETE" ? "bg-red-100 text-red-700" : log.action === "UPDATE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{actionLabels[log.action]}</span></div><p className="mt-3 truncate text-xs"><span className="text-outline">Campos:</span> {(log.changed_fields || []).join(", ") || "—"}</p><button onClick={() => setSelected(log)} className="mt-3 min-h-11 w-full rounded-xl border border-primary px-3 text-xs font-bold text-primary dark:text-white">Ver detalhes</button></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-[900px] w-full text-sm"><thead><tr className="bg-surface text-left text-xs uppercase text-outline dark:bg-gray-800"><th className="p-3">Data e hora</th><th className="p-3">Usuário</th><th className="p-3">Módulo</th><th className="p-3">Ação</th><th className="p-3">Registro</th><th className="p-3">Campos alterados</th><th className="p-3" /></tr></thead><tbody>{filtered.map((log) => <tr key={log.id} className="border-t border-surface-variant dark:border-gray-700"><td className="p-3 whitespace-nowrap">{format(new Date(log.occurred_at), "dd/MM/yyyy HH:mm:ss")}</td><td className="p-3 font-medium">{log.actor_name || "Não identificado"}</td><td className="p-3">{tableLabels[log.table_name] || log.table_name}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs font-bold ${log.action === "DELETE" ? "bg-red-100 text-red-700" : log.action === "UPDATE" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{actionLabels[log.action]}</span></td><td className="max-w-40 truncate p-3 font-mono text-xs" title={log.record_id}>{log.record_id || "—"}</td><td className="max-w-72 truncate p-3" title={(log.changed_fields || []).join(", ")}>{(log.changed_fields || []).join(", ") || "—"}</td><td className="p-3"><button onClick={() => setSelected(log)} className="rounded-full border border-primary px-3 py-1.5 text-xs font-bold text-primary dark:text-white">Detalhes</button></td></tr>)}</tbody></table></div>{loading && <p className="py-12 text-center text-outline">Carregando auditoria...</p>}{!loading && !filtered.length && <p className="py-12 text-center text-outline">Nenhum movimento encontrado.</p>}
    </section>
    {selected && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && setSelected(null)}><div role="dialog" aria-modal="true" className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-dark-surface"><div className="mb-4 flex items-center justify-between"><div><h3 className="font-bold text-primary dark:text-white">Detalhes da auditoria</h3><p className="text-xs text-outline">Evento #{selected.id} · {format(new Date(selected.occurred_at), "dd/MM/yyyy HH:mm:ss")}</p></div><button onClick={() => setSelected(null)} aria-label="Fechar"><span className="material-symbols-outlined">close</span></button></div><div className="grid gap-4 md:grid-cols-2"><DataBlock title="Dados anteriores" data={selected.old_data} /><DataBlock title="Dados posteriores" data={selected.new_data} /></div></div></div>}
  </div>;
}

function Filter({ label, children }) { return <label><span className="mb-1 block text-xs font-bold uppercase text-outline">{label}</span><div className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border-surface-variant [&>*]:bg-surface [&>*]:px-3 [&>*]:py-2.5 dark:[&>*]:bg-gray-800">{children}</div></label>; }
function DataBlock({ title, data }) { return <div><h4 className="mb-2 text-sm font-bold text-primary dark:text-white">{title}</h4><pre className="max-h-[55vh] overflow-auto whitespace-pre-wrap break-all rounded-xl bg-gray-950 p-4 text-xs text-green-200">{data ? JSON.stringify(data, null, 2) : "Sem dados"}</pre></div>; }

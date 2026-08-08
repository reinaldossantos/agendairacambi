import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { supabase } from "../lib/supabaseClient";

const money = (value) => Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const statusLabels = {
  draft: "Rascunho",
  pending_approval: "Aguardando aprovação",
  approved: "Aprovado",
  provisioned: "Em provisionamento",
  payment_scheduled: "Pagamento agendado",
  paid: "Pago",
};
const dateLabel = (value) => value ? format(parseISO(value), "dd/MM/yyyy") : "—";
const reportTotal = (report) => (report.expense_items || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
const escapeCsv = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;

export default function ExpenseReportSummary() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({ start: "", end: "", program: "", status: "" });

  const loadReports = useCallback(async () => {
    setLoading(true);
    const { data, error: queryError } = await supabase
      .from("expense_reports")
      .select("*, person:person_id(is_active)")
      .order("created_at", { ascending: false });
    if (queryError) setError(queryError.message);
    setReports(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadReports, 0);
    return () => window.clearTimeout(timer);
  }, [loadReports]);

  const programs = useMemo(() => [...new Set(reports.map((report) => report.project_name).filter(Boolean))].sort(), [reports]);
  const filtered = useMemo(() => reports.filter((report) =>
    (!filters.start || report.period_end >= filters.start)
    && (!filters.end || report.period_start <= filters.end)
    && (!filters.program || report.project_name === filters.program)
    && (!filters.status || report.status === filters.status)
  ), [reports, filters]);

  const summary = useMemo(() => {
    const byProgram = new Map();
    const byCategory = new Map();
    const byStatus = new Map();
    let advances = 0;
    let expenses = 0;
    let receipts = 0;
    let scheduledPayments = 0;
    filtered.forEach((report) => {
      const reportExpenses = reportTotal(report);
      const advance = Number(report.advance_amount || 0);
      advances += advance;
      expenses += reportExpenses;
      receipts += (report.expense_items || []).reduce((sum, item) => sum + (item.attachments?.length || 0), 0);
      if (report.payment_due_date) scheduledPayments += 1;
      const program = report.project_name || "Sem programa";
      const programEntry = byProgram.get(program) || { reports: 0, advance: 0, expense: 0, receipts: 0 };
      programEntry.reports += 1;
      programEntry.advance += advance;
      programEntry.expense += reportExpenses;
      programEntry.receipts += (report.expense_items || []).reduce((sum, item) => sum + (item.attachments?.length || 0), 0);
      byProgram.set(program, programEntry);
      byStatus.set(report.status, (byStatus.get(report.status) || 0) + 1);
      (report.expense_items || []).forEach((item) => {
        const amount = Number(item.amount || 0);
        if (!amount) return;
        const category = item.suggested_description || item.description || "Outras despesas";
        const entry = byCategory.get(category) || { occurrences: 0, amount: 0, receipts: 0 };
        entry.occurrences += 1;
        entry.amount += amount;
        entry.receipts += item.attachments?.length || 0;
        byCategory.set(category, entry);
      });
    });
    return {
      advances, expenses, receipts, scheduledPayments,
      balance: advances - expenses,
      byProgram: [...byProgram.entries()].sort((a, b) => b[1].expense - a[1].expense),
      byCategory: [...byCategory.entries()].sort((a, b) => b[1].amount - a[1].amount),
      byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [filtered]);

  function exportCsv() {
    const header = ["Relatório", "Status", "Usuário", "Programa", "Início", "Fim", "Adiantamento", "Despesa", "Saldo", "Comprovantes", "Previsão de pagamento"];
    const rows = filtered.map((report) => {
      const expense = reportTotal(report);
      const advance = Number(report.advance_amount || 0);
      const receipts = (report.expense_items || []).reduce((sum, item) => sum + (item.attachments?.length || 0), 0);
      return [report.report_number, statusLabels[report.status] || report.status, report.user_name, report.project_name, report.period_start, report.period_end, advance.toFixed(2), expense.toFixed(2), (advance - expense).toFixed(2), receipts, report.payment_due_date || ""];
    });
    const csv = [header, ...rows].map((row) => row.map(escapeCsv).join(";")).join("\n");
    const url = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumo_financeiro_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="mx-auto max-w-7xl px-2 sm:px-4">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-primary-light dark:text-green-300">Rastreabilidade financeira</p>
          <h2 className="text-headline-lg font-semibold text-primary dark:text-white">Resumo dos relatórios de despesas</h2>
          <p className="text-sm text-outline">Acompanhe valores, categorias, programas, comprovantes e pagamentos.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/expense-reports" className="rounded-full border border-primary px-4 py-2.5 text-sm font-bold text-primary dark:text-white">Abrir relatórios</Link>
          <button onClick={exportCsv} disabled={!filtered.length} className="flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-primary disabled:opacity-50"><span className="material-symbols-outlined text-[19px]">download</span>Exportar CSV</button>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</div>}
      <div className="mb-6 grid gap-3 rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface sm:grid-cols-2 lg:grid-cols-4">
        <Filter label="Período inicial"><input type="date" value={filters.start} onChange={(event) => setFilters({ ...filters, start: event.target.value })} /></Filter>
        <Filter label="Período final"><input type="date" value={filters.end} onChange={(event) => setFilters({ ...filters, end: event.target.value })} /></Filter>
        <Filter label="Programa"><select value={filters.program} onChange={(event) => setFilters({ ...filters, program: event.target.value })}><option value="">Todos</option>{programs.map((program) => <option key={program}>{program}</option>)}</select></Filter>
        <Filter label="Status"><select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Todos</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Filter>
      </div>

      {loading ? <div className="py-16 text-center text-outline">Carregando informações financeiras...</div> : <>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <Metric icon="receipt_long" label="Relatórios" value={filtered.length} />
          <Metric icon="payments" label="Adiantamentos" value={money(summary.advances)} />
          <Metric icon="shopping_cart" label="Despesas realizadas" value={money(summary.expenses)} />
          <Metric icon="account_balance_wallet" label={summary.balance >= 0 ? "Saldo a devolver" : "Saldo a resgatar"} value={money(Math.abs(summary.balance))} highlight />
          <Metric icon="attachment" label="Comprovantes" value={summary.receipts} />
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-2">
          <SummaryTable title="Totalização por programa" headers={["Programa", "Relatórios", "Adiantamento", "Despesa", "Saldo"]} rows={summary.byProgram.map(([name, data]) => [name, data.reports, money(data.advance), money(data.expense), money(data.advance - data.expense)])} />
          <SummaryTable title="Totalização por descrição" headers={["Descrição", "Lançamentos", "Comprovantes", "Total"]} rows={summary.byCategory.map(([name, data]) => [name, data.occurrences, data.receipts, money(data.amount)])} />
        </div>

        <section className="mb-6 rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface">
          <h3 className="mb-3 font-bold text-primary dark:text-white">Situação do fluxo financeiro</h3>
          <div className="flex flex-wrap gap-2">{summary.byStatus.map(([status, count]) => <span key={status} className="rounded-full bg-surface px-3 py-2 text-sm dark:bg-gray-700"><strong>{count}</strong> · {statusLabels[status] || status}</span>)}</div>
        </section>

        <section className="rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface">
          <h3 className="mb-4 font-bold text-primary dark:text-white">Rastreabilidade dos relatórios</h3>
          <div className="grid gap-3 md:hidden">{filtered.map((report) => { const expense = reportTotal(report); const advance = Number(report.advance_amount || 0); return <article key={report.id} className="rounded-xl border border-surface-variant p-4 dark:border-white/10"><div className="flex items-start justify-between gap-2"><div><p className="text-xs font-bold text-outline">RELATÓRIO Nº {String(report.report_number).padStart(5, "0")}</p><h4 className="font-bold text-primary dark:text-white">{report.user_name}</h4><p className="text-xs text-outline">{report.project_name}</p></div><span className="rounded-full bg-surface px-2 py-1 text-[10px] font-bold dark:bg-gray-700">{statusLabels[report.status] || report.status}</span></div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-outline">Período</dt><dd className="font-bold">{dateLabel(report.period_start)}–{dateLabel(report.period_end)}</dd></div><div><dt className="text-outline">Pagamento</dt><dd className="font-bold">{dateLabel(report.payment_due_date)}</dd></div><div><dt className="text-outline">Adiantamento</dt><dd className="font-bold">{money(advance)}</dd></div><div><dt className="text-outline">Despesa</dt><dd className="font-bold">{money(expense)}</dd></div><div className="col-span-2 rounded-lg bg-surface p-2 dark:bg-gray-800"><dt className="text-outline">Saldo</dt><dd className="font-bold text-primary dark:text-white">{money(advance - expense)}</dd></div></dl></article>; })}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-[1000px] w-full text-sm"><thead><tr className="border-b text-left text-xs uppercase text-outline"><th className="p-2">Nº</th><th className="p-2">Usuário</th><th className="p-2">Programa</th><th className="p-2">Período</th><th className="p-2">Status</th><th className="p-2 text-right">Adiantamento</th><th className="p-2 text-right">Despesa</th><th className="p-2 text-right">Saldo</th><th className="p-2">Pagamento</th></tr></thead><tbody>{filtered.map((report) => { const expense = reportTotal(report); const advance = Number(report.advance_amount || 0); return <tr key={report.id} className="border-b border-surface-variant/60"><td className="p-2 font-bold">{String(report.report_number).padStart(5, "0")}</td><td className="p-2">{report.user_name}</td><td className="p-2">{report.project_name}</td><td className="p-2">{dateLabel(report.period_start)}–{dateLabel(report.period_end)}</td><td className="p-2">{statusLabels[report.status] || report.status}</td><td className="p-2 text-right">{money(advance)}</td><td className="p-2 text-right">{money(expense)}</td><td className="p-2 text-right">{money(advance - expense)}</td><td className="p-2">{dateLabel(report.payment_due_date)}</td></tr>; })}</tbody></table></div>{!filtered.length && <p className="py-10 text-center text-outline">Nenhum relatório encontrado.</p>}
        </section>
      </>}
    </div>
  );
}

function Filter({ label, children }) { return <label><span className="mb-1 block text-xs font-bold uppercase text-outline">{label}</span><div className="[&>*]:w-full [&>*]:rounded-xl [&>*]:border-surface-variant [&>*]:bg-surface [&>*]:px-3 [&>*]:py-2.5 dark:[&>*]:bg-gray-800">{children}</div></label>; }
function Metric({ icon, label, value, highlight }) { return <div className={`rounded-xl border p-4 ${highlight ? "border-accent bg-accent/20" : "border-surface-variant bg-white dark:border-gray-700 dark:bg-dark-surface"}`}><span className="material-symbols-outlined text-primary dark:text-green-300">{icon}</span><p className="mt-2 text-xs font-bold uppercase text-outline">{label}</p><p className="mt-1 text-xl font-bold text-primary dark:text-white">{value}</p></div>; }
function SummaryTable({ title, headers, rows }) { return <section className="rounded-xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-dark-surface"><h3 className="mb-3 font-bold text-primary dark:text-white">{title}</h3><div className="grid gap-2 md:hidden">{rows.map((row, index) => <article key={`${row[0]}-${index}`} className="rounded-xl bg-surface p-3 dark:bg-gray-800"><strong className="text-sm text-primary dark:text-white">{row[0]}</strong><dl className="mt-2 grid grid-cols-2 gap-2">{row.slice(1).map((cell, cellIndex) => <div key={headers[cellIndex + 1]}><dt className="text-[10px] uppercase text-outline">{headers[cellIndex + 1]}</dt><dd className="text-xs font-bold">{cell}</dd></div>)}</dl></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[560px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-outline">{headers.map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-b border-surface-variant/60">{row.map((cell, cellIndex) => <td key={cellIndex} className={`p-2 ${cellIndex > 0 ? "text-right" : "font-medium"}`}>{cell}</td>)}</tr>)}</tbody></table></div>{!rows.length && <p className="py-8 text-center text-outline">Sem dados para o filtro.</p>}</section>; }

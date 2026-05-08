import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { format, parseISO } from "date-fns";

export default function History() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState("");
  const [filterPerson, setFilterPerson] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [programs, setPrograms] = useState([]);
  const [persons, setPersons] = useState([]);

  useEffect(() => {
    fetchMeta();
    fetchHistory();
  }, []);

  async function fetchMeta() {
    const [progRes, persRes] = await Promise.all([
      supabase.from("programs").select("name").order("name"),
      supabase.from("persons").select("id, name").order("name"),
    ]);
    setPrograms(progRes.data || []);
    setPersons(persRes.data || []);
  }

  async function fetchHistory() {
    setLoading(true);
    let query = supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name)")
      .order("due_date", { ascending: false });

    if (filterProgram) query = query.eq("programs.name", filterProgram);
    if (filterPerson) query = query.eq("responsible_id", filterPerson);
    if (filterStatus) query = query.eq("status", filterStatus);
    if (startDate) query = query.gte("due_date", startDate);
    if (endDate) query = query.lte("due_date", endDate);

    const { data, error } = await query.limit(50);
    if (!error) setActivities(data || []);
    setLoading(false);
  }

  function handleFilter(e) {
    e.preventDefault();
    fetchHistory();
  }

  function clearFilters() {
    setFilterProgram("");
    setFilterPerson("");
    setFilterStatus("");
    setStartDate("");
    setEndDate("");
    fetchHistory();
  }

  function exportCSV() {
    let csv = "Título,Programa,Responsável,Data,Status,Descrição\n";
    activities.forEach((a) => {
      csv += `"${a.title}","${a.programs?.name || ""}","${a.persons?.name || ""}","${a.due_date}","${a.status}","${(a.description || "").replace(/"/g, '""')}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `iracambi_historico_${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">Histórico e Relatórios</h2>
          <p className="text-on-surface-variant dark:text-gray-400 text-sm md:text-base">Consulte e exporte o histórico de atividades.</p>
        </div>
        <button onClick={exportCSV} className="mt-4 md:mt-0 bg-accent text-primary font-bold py-3 px-6 rounded-full font-roboto text-label-md flex items-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px]">
          <span className="material-symbols-outlined">download</span>
          Exportar CSV
        </button>
      </div>

      <form onSubmit={handleFilter} className="bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 rounded-xl p-4 md:p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">Programa</label>
          <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg">
            <option value="">Todos</option>
            {programs.map((p) => (<option key={p.name} value={p.name}>{p.name}</option>))}
          </select>
        </div>
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">Responsável</label>
          <select value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg">
            <option value="">Todos</option>
            {persons.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
          </select>
        </div>
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg">
            <option value="">Todos</option>
            <option value="Planejado">Planejado</option>
            <option value="Em andamento">Em andamento</option>
            <option value="Realizado">Realizado</option>
            <option value="Pendente">Pendente</option>
          </select>
        </div>
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">De</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg" />
        </div>
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">Até</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg" />
        </div>
        <div className="sm:col-span-2 md:col-span-5 flex gap-3 justify-end mt-2">
          <button type="button" onClick={clearFilters} className="px-4 py-2 rounded-full border border-outline text-on-surface dark:text-gray-300 font-roboto text-label-sm hover:bg-gray-100 dark:hover:bg-gray-800 transition-all active:scale-95 min-h-[44px]">
            Limpar
          </button>
          <button type="submit" className="px-6 py-2 rounded-full bg-accent text-primary font-roboto text-label-sm hover:bg-yellow-400 transition-all active:scale-95 min-h-[44px] flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">filter_list</span>
            Filtrar
          </button>
        </div>
      </form>

      <div className="bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs md:text-sm">
            <thead>
              <tr className="bg-surface dark:bg-gray-800 border-b border-surface-variant dark:border-gray-700">
                <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase">Atividade</th>
                <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase">Programa</th>
                <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase">Data</th>
                <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase">Status</th>
                <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase">Resp.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={5} className="text-center py-10 text-on-surface-variant dark:text-gray-400">Carregando...</td></tr>
              ) : activities.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-on-surface-variant dark:text-gray-400">Nenhuma atividade encontrada.</td></tr>
              ) : (
                activities.map((a) => (
                  <tr key={a.id} className="hover:bg-surface dark:hover:bg-gray-800/50 transition-colors">
                    <td className="px-2 md:px-4 py-3">
                      <Link to={`/activity/${a.id}`} className="font-roboto font-semibold text-primary dark:text-white hover:underline block text-xs md:text-sm">
                        {a.title}
                      </Link>
                      <p className="text-[10px] md:text-xs text-outline dark:text-gray-500 line-clamp-1">{a.description}</p>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300">{a.programs?.name}</td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300">{format(parseISO(a.due_date || a.week_start), "dd/MM/yyyy")}</td>
                    <td className="px-2 md:px-4 py-3">
                      <span className={`text-[10px] md:text-xs font-roboto px-2 py-1 rounded-full border ${
                        a.status === "Planejado" ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" :
                        a.status === "Em andamento" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200" :
                        a.status === "Realizado" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200" :
                        "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200"
                      }`}>{a.status}</span>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300">{a.persons?.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
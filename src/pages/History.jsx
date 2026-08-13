/* eslint-disable react-hooks/immutability, react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
import { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { format, parseISO, startOfWeek, addDays } from "date-fns";
import { generateWeeklyPDF } from "../lib/pdfGenerator";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function History() {
  const { currentUser } = useCurrentUser();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterProgram, setFilterProgram] = useState(() => searchParams.get("program") || "");
  const [filterPerson, setFilterPerson] = useState(() => searchParams.get("person") || "");
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get("status") || "");
  const [startDate, setStartDate] = useState(() => searchParams.get("start") || "");
  const [endDate, setEndDate] = useState(() => searchParams.get("end") || "");
  const [programs, setPrograms] = useState([]);
  const [persons, setPersons] = useState([]);
  const [programNameToId, setProgramNameToId] = useState({});

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportStart, setReportStart] = useState("");
  const [reportEnd, setReportEnd] = useState("");

  // Carrega metadados uma vez
  useEffect(() => {
    fetchMeta();
  }, []);

  // Lê os parâmetros da URL e atualiza os estados (sem disparar fetch ainda)
  useEffect(() => {
    const statusParam = searchParams.get("status");
    const startParam = searchParams.get("start");
    const endParam = searchParams.get("end");
    const programParam = searchParams.get("program");
    const personParam = searchParams.get("person");
    if (statusParam !== null) setFilterStatus(statusParam);
    if (startParam !== null) setStartDate(startParam);
    if (endParam !== null) setEndDate(endParam);
    if (programParam !== null) setFilterProgram(programParam);
    if (personParam !== null) setFilterPerson(personParam);
  }, [searchParams]);

  // Dispara a busca sempre que os filtros mudarem (incluindo após a atualização acima)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 100);
    return () => clearTimeout(timer);
  }, [filterProgram, filterPerson, filterStatus, startDate, endDate]);

  async function fetchMeta() {
    const [progRes, persRes] = await Promise.all([
      supabase.from("programs").select("id, name, leader_id").order("name"),
      supabase.from("persons").select("id, name, is_active").order("name"),
    ]);
    const progList = progRes.data || [];
    setPrograms(progList);
    const mapping = {};
    progList.forEach(p => { mapping[p.name] = p.id; });
    setProgramNameToId(mapping);
    setPersons(persRes.data || []);

    if (!searchParams.has("program") && currentUser?.id) {
      let defaultProgram = progList.find((program) => program.leader_id === currentUser.id);
      if (!defaultProgram) {
        const { data: recentActivity } = await supabase.from("activities").select("program_id").eq("responsible_id", currentUser.id).not("program_id", "is", null).order("due_date", { ascending: false }).limit(1).maybeSingle();
        defaultProgram = progList.find((program) => program.id === recentActivity?.program_id);
      }
      if (defaultProgram) setFilterProgram(defaultProgram.name);
    }
  }

  async function fetchHistory() {
    setLoading(true);
    console.log("Filtrando com:", { filterStatus, startDate, endDate });

    let query = supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name, is_active)")
      .order("due_date", { ascending: false });

    if (filterProgram && programNameToId[filterProgram]) {
      query = query.eq("program_id", programNameToId[filterProgram]);
    }
    if (filterPerson) {
      query = query.eq("responsible_id", filterPerson);
    }
    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }
    if (startDate) {
      query = query.gte("due_date", startDate);
    }
    if (endDate) {
      query = query.lte("due_date", endDate);
    }

    const { data, error } = await query.limit(500);
    if (!error) setActivities(data || []);
    else console.error("Erro ao buscar histórico:", error);
    setLoading(false);
  }

  function handleFilter(e) {
    e.preventDefault();
    const params = {};
    if (filterStatus) params.status = filterStatus;
    if (startDate) params.start = startDate;
    if (endDate) params.end = endDate;
    if (filterProgram) params.program = filterProgram;
    if (filterPerson) params.person = filterPerson;
    setSearchParams(params);
  }

  function clearFilters() {
    setFilterProgram("");
    setFilterPerson("");
    setFilterStatus("");
    setStartDate("");
    setEndDate("");
    setSearchParams({});
  }

  function currentSearchUrl() {
    const params = new URLSearchParams();
    if (filterStatus) params.set("status", filterStatus);
    if (startDate) params.set("start", startDate);
    if (endDate) params.set("end", endDate);
    if (filterProgram) params.set("program", filterProgram);
    if (filterPerson) params.set("person", filterPerson);
    const query = params.toString();
    return query ? `/history?${query}` : "/history";
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

  const handleExportPDF = async () => {
    if (activities.length === 0) {
      alert("Nenhuma atividade para exportar.");
      return;
    }
    const start = startDate || format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
    const end = endDate || format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd");
    await generateWeeklyPDF({ weekStart: start, weekEnd: end, activities });
  };

  const openReportModal = () => {
    setReportStart(startDate || format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    setReportEnd(endDate || format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd"));
    setShowReportModal(true);
  };

  const generateReport = async (formatType) => {
    if (!reportStart || !reportEnd) {
      alert("Selecione o período.");
      return;
    }
    let query = supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name, is_active)")
      .gte("due_date", reportStart)
      .lte("due_date", reportEnd)
      .order("due_date", { ascending: true });

    if (filterProgram && programNameToId[filterProgram]) {
      query = query.eq("program_id", programNameToId[filterProgram]);
    }
    if (filterPerson) {
      query = query.eq("responsible_id", filterPerson);
    }
    if (filterStatus) {
      query = query.eq("status", filterStatus);
    }

    const { data } = await query;
    if (!data || data.length === 0) {
      alert("Nenhuma atividade no período selecionado.");
      return;
    }

    if (formatType === "pdf") {
      await generateWeeklyPDF({ weekStart: reportStart, weekEnd: reportEnd, activities: data });
    } else {
      let csv = "Título,Programa,Responsável,Data,Status,Descrição\n";
      data.forEach((a) => {
        csv += `"${a.title}","${a.programs?.name || ""}","${a.persons?.name || ""}","${a.due_date}","${a.status}","${(a.description || "").replace(/"/g, '""')}"\n`;
      });
      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `iracambi_relatorio_${reportStart}_${reportEnd}.csv`;
      link.click();
    }
    setShowReportModal(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8">
        <div>
          <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">Histórico e Relatórios</h2>
          <p className="text-on-surface-variant dark:text-gray-400 text-sm md:text-base">Consulte e exporte o histórico de atividades.</p>
        </div>
        <div className="flex flex-wrap gap-2 mt-4 md:mt-0">
          <button onClick={exportCSV} className="bg-accent text-primary font-bold py-3 px-6 rounded-full font-roboto text-label-md flex items-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px]">
            <span className="material-symbols-outlined">download</span> CSV
          </button>
          <button onClick={handleExportPDF} className="bg-red-100 text-red-700 font-bold py-3 px-6 rounded-full font-roboto text-label-md flex items-center gap-2 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 transition-all active:scale-95 min-h-[48px]">
            <span className="material-symbols-outlined">picture_as_pdf</span> PDF
          </button>
          <button onClick={openReportModal} className="bg-blue-100 text-blue-700 font-bold py-3 px-6 rounded-full font-roboto text-label-md flex items-center gap-2 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 transition-all active:scale-95 min-h-[48px]">
            <span className="material-symbols-outlined">summarize</span> Relatório
          </button>
        </div>
      </div>

      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-4">Gerar Relatório</h3>
            <div className="space-y-4">
              <div>
                <label className="font-roboto text-label-sm text-outline dark:text-gray-400 block mb-1">Data inicial</label>
                <input type="date" value={reportStart} onChange={(e) => setReportStart(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-sm text-on-surface dark:text-white" />
              </div>
              <div>
                <label className="font-roboto text-label-sm text-outline dark:text-gray-400 block mb-1">Data final</label>
                <input type="date" value={reportEnd} onChange={(e) => setReportEnd(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-sm text-on-surface dark:text-white" />
              </div>
              <p className="text-xs text-outline dark:text-gray-400">Os filtros atuais (programa, responsável, status) serão aplicados.</p>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowReportModal(false)} className="px-5 py-2.5 rounded-full border border-outline text-on-surface-variant font-roboto hover:bg-gray-100 dark:hover:bg-white/10">Cancelar</button>
              <button onClick={() => generateReport("csv")} className="px-5 py-2.5 rounded-full bg-accent/10 text-primary font-roboto hover:bg-accent/20 transition-colors">CSV</button>
              <button onClick={() => generateReport("pdf")} className="px-5 py-2.5 rounded-full bg-red-100 text-red-700 font-roboto hover:bg-red-200 transition-colors">PDF</button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleFilter} className="bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 rounded-xl p-4 md:p-6 mb-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="font-roboto text-[10px] uppercase text-outline dark:text-gray-400 block mb-1">Programa</label>
          <select value={filterProgram} onChange={(e) => setFilterProgram(e.target.value)} className="w-full bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-sm text-on-surface dark:text-white rounded-t-lg">
            <option value="">Todos</option>
            {programs.map((p) => (<option key={p.id} value={p.name}>{p.name}</option>))}
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
            <option value="Cancelado">Cancelado</option>
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
        <div className="overflow-x-auto -mx-4 md:mx-0 scrollbar-thin">
          <div className="inline-block min-w-full align-middle px-4 md:px-0">
            <table className="min-w-[600px] w-full text-left text-xs md:text-sm">
              <thead>
                <tr className="bg-surface dark:bg-gray-800 border-b border-surface-variant dark:border-gray-700">
                  <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase whitespace-nowrap">Atividade</th>
                  <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase whitespace-nowrap">Programa</th>
                  <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase whitespace-nowrap">Data</th>
                  <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase whitespace-nowrap">Status</th>
                  <th className="px-2 md:px-4 py-3 font-roboto text-label-sm text-outline dark:text-gray-400 uppercase whitespace-nowrap">Resp.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="text-center py-10 text-on-surface-variant dark:text-gray-400">Carregando...</td></tr>
                ) : activities.length === 0 ? (
                  <tr><td colSpan={5} className="text-center py-10 text-on-surface-variant dark:text-gray-400">Nenhuma atividade encontrada.</td></tr>
                ) : (
                  activities.map((a, index) => (
                    <tr key={a.id} className={`transition-colors ${index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-stone-50 dark:bg-gray-800/50"} hover:bg-surface dark:hover:bg-gray-800`}>
                      <td className="px-2 md:px-4 py-3">
                        <Link to={`/activity/${a.id}`} state={{ returnTo: currentSearchUrl(), returnLabel: "Voltar para a pesquisa" }} className="font-roboto font-semibold text-primary dark:text-white hover:underline block text-xs md:text-sm">
                          {a.title}
                        </Link>
                        <p className="text-[10px] md:text-xs text-outline dark:text-gray-500 line-clamp-1">{a.description}</p>
                       </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300 whitespace-nowrap">{a.programs?.name}</td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300 whitespace-nowrap">{format(parseISO(a.due_date || a.week_start), "dd/MM/yyyy")}</td>
                      <td className="px-2 md:px-4 py-3">
                        <span className={`text-[10px] md:text-xs font-roboto px-2 py-1 rounded-full border whitespace-nowrap ${
                          a.status === "Planejado" ? "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300" :
                          a.status === "Em andamento" ? "bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 border-amber-200" :
                          a.status === "Realizado" ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200" :
                          a.status === "Cancelado" ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-200" :
                          "bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200"
                        }`}>{a.status}</span>
                       </td>
                      <td className="px-2 md:px-4 py-3 text-xs md:text-sm text-on-surface dark:text-gray-300 whitespace-nowrap">{a.persons?.name}{a.persons?.is_active === false && <span className="ml-2 rounded-full bg-gray-200 px-2 py-1 text-[10px] font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">Desativado</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

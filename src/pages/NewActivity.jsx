import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { startOfWeek, addDays, format, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { shareViaWhatsApp, formatAgendaForWhatsApp } from "../lib/whatsapp";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function NewActivity() {
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();
  const [programs, setPrograms] = useState([]);
  const [persons, setPersons] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedPerson, setSelectedPerson] = useState("");
  const [selectedPriority, setSelectedPriority] = useState("Média");
  const [mode, setMode] = useState("wpp");
  const [weekText, setWeekText] = useState("");
  const rawWeekDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const [quickActivities, setQuickActivities] = useState([
    { date: format(new Date(), "yyyy-MM-dd"), title: "", description: "", involvedIds: [], priority: "Média" },
  ]);
  const [involvedIdsGlobal, setInvolvedIdsGlobal] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [lastInserted, setLastInserted] = useState(null);

  useEffect(() => {
    supabase.from("programs").select("id, name").order("name").then(({ data }) => setPrograms(data || []));
    supabase.from("persons").select("id, name").order("name").then(({ data }) => setPersons(data || []));
  }, []);

  const weekStartDate = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEndDate = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 5), "yyyy-MM-dd");
  const weekDisplay = `${format(parseISO(weekStartDate), "dd 'de' MMM", { locale: ptBR })} – ${format(parseISO(weekEndDate), "dd 'de' MMM", { locale: ptBR })}`;

  function parseWeekText(text, mondayDate) {
    const dayMap = {
      'segunda': 0, 'segunda-feira': 0, 'segunda feira': 0,
      'terça': 1, 'terca': 1, 'terça-feira': 1, 'terca-feira': 1, 'terça feira': 1,
      'quarta': 2, 'quarta-feira': 2, 'quarta feira': 2,
      'quinta': 3, 'quinta-feira': 3, 'quinta feira': 3,
      'sexta': 4, 'sexta-feira': 4, 'sexta feira': 4,
      'sábado': 5, 'sabado': 5,
    };
    const activities = [];
    const lines = text.split('\n');
    let currentDay = null, currentLines = [], explicitDate = null;
    const dayPattern = /^(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado)(\s*(-feira| feira))?\s*[:.\-]?\s*/i;
    const datePattern = /^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s*[:.\-]?\s*/;

    for (let line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const dayMatch = trimmed.match(dayPattern);
      if (dayMatch) {
        if (currentDay !== null && currentLines.length > 0) {
          const { title, description } = buildTitleAndDescription(currentLines);
          activities.push({ dayOfWeek: currentDay, title, description, explicitDate });
        }
        let dayKey = dayMatch[1].toLowerCase();
        if (dayKey === 'terca') dayKey = 'terça';
        if (dayKey === 'sabado') dayKey = 'sábado';
        if (dayMatch[2]) dayKey += '-feira';
        currentDay = dayMap[dayKey] ?? null;
        let remaining = trimmed.replace(dayPattern, '').trim();
        explicitDate = null;
        const dateMatch = remaining.match(datePattern);
        if (dateMatch) {
          const dateStr = dateMatch[1];
          const parsed = parseDateFlexible(dateStr);
          if (parsed) explicitDate = format(parsed, "yyyy-MM-dd");
          remaining = remaining.replace(datePattern, '').trim();
        }
        currentLines = remaining ? [remaining] : [];
      } else if (currentDay !== null) {
        currentLines.push(trimmed);
      }
    }
    if (currentDay !== null && currentLines.length > 0) {
      const { title, description } = buildTitleAndDescription(currentLines);
      activities.push({ dayOfWeek: currentDay, title, description, explicitDate });
    }

    return activities.map(item => {
      let finalDate = item.explicitDate || format(addDays(mondayDate, item.dayOfWeek), "yyyy-MM-dd");
      return { title: item.title, description: item.description, due_date: finalDate, week_start: format(mondayDate, "yyyy-MM-dd") };
    });
  }

  function parseDateFlexible(dateStr) {
    const parts = dateStr.split('/');
    if (parts.length < 2 || parts.length > 3) return null;
    const day = parseInt(parts[0], 10), month = parseInt(parts[1], 10) - 1;
    let year = new Date().getFullYear();
    if (parts.length === 3) year = parseInt(parts[2], 10) + (parts[2] < 100 ? 2000 : 0);
    const date = new Date(year, month, day);
    return isValid(date) ? date : null;
  }

  function buildTitleAndDescription(lines) {
    const cleaned = lines.filter(l => l.trim() && !/^\d{1,2}\/\d{1,2}(\/\d{2,4})?\s*$/.test(l.trim()));
    if (cleaned.length === 0) return { title: "Atividade", description: "" };
    return { title: cleaned[0], description: cleaned.join('; ') };
  }

  const addQuickActivity = () => setQuickActivities([...quickActivities, { date: format(new Date(), "yyyy-MM-dd"), title: "", description: "", involvedIds: [], priority: "Média" }]);
  const removeQuickActivity = (i) => { if (quickActivities.length > 1) setQuickActivities(quickActivities.filter((_, idx) => idx !== i)); };
  const updateQuickActivity = (i, f, v) => { const u = [...quickActivities]; u[i][f] = v; setQuickActivities(u); };
  const toggleInvolved = (i, id) => { const u = [...quickActivities]; u[i].involvedIds = u[i].involvedIds.includes(id) ? u[i].involvedIds.filter(x => x !== id) : [...u[i].involvedIds, id]; setQuickActivities(u); };
  const toggleInvolvedGlobal = (id) => setInvolvedIdsGlobal(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const switchToQuickWithText = () => {
    setQuickActivities([{ date: rawWeekDate, title: weekText.split('\n')[0] || "Atividade", description: weekText, involvedIds: involvedIdsGlobal, priority: selectedPriority }]);
    setMode("quick");
    setMessage({ type: "", text: "" });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!selectedProgram || !selectedPerson) { setMessage({ type: "error", text: "Selecione programa e responsável." }); return; }
    setLoading(true);
    const programId = programs.find(p => p.name === selectedProgram)?.id || null;
    const personId = persons.find(p => p.name === selectedPerson)?.id || null;
    let list = [];
    if (mode === "wpp") {
      const parsed = parseWeekText(weekText, parseISO(weekStartDate));
      if (parsed.length === 0) { setMessage({ type: "error", text: "Não foram encontrados dias da semana no texto.", action: "switch" }); setLoading(false); return; }
      list = parsed.map(item => ({ program_id: programId, responsible_id: personId, created_by: personId, title: item.title, description: item.description, week_start: item.week_start, due_date: item.due_date, status: "Planejado", priority: selectedPriority, involved_ids: involvedIdsGlobal }));
    } else {
      for (let q of quickActivities) { if (!q.title.trim() || !q.date) { setMessage({ type: "error", text: "Preencha título e data." }); setLoading(false); return; } }
      list = quickActivities.map(q => ({ program_id: programId, responsible_id: personId, created_by: personId, title: q.title, description: q.description, week_start: format(startOfWeek(parseISO(q.date), { weekStartsOn: 1 }), "yyyy-MM-dd"), due_date: q.date, status: "Planejado", priority: q.priority || "Média", involved_ids: q.involvedIds || [] }));
    }

    const { data: inserted, error } = await supabase.from("activities").insert(list).select();
    if (error) { setMessage({ type: "error", text: "Erro: " + error.message }); setLoading(false); return; }

    // GERA LOGS DE ENVOLVIMENTO – cada envolvido recebe seu próprio log
    if (inserted && inserted.length > 0) {
      const involvementLogs = [];
      for (const activity of inserted) {
        if (activity.involved_ids && activity.involved_ids.length > 0) {
          for (const pid of activity.involved_ids) {
            const person = persons.find(p => p.id === pid);
            if (person) {
              involvementLogs.push({
                activity_id: activity.id,
                person_id: pid,
                type: "involvement",
                content: `${currentUser?.name || "Alguém"} envolveu você na atividade "${activity.title}".`,
                metadata: { involved_person_id: pid, action: "added" },
              });
            }
          }
        }
      }
      if (involvementLogs.length > 0) {
        await supabase.from("activity_logs").insert(involvementLogs);
      }
    }

    setMessage({ type: "success", text: `${list.length} atividade(s) lançada(s)!` });
    setLastInserted({ program: selectedProgram, responsible: selectedPerson, weekStart: list[0].week_start, activities: list });
    setWeekText(""); setQuickActivities([{ date: format(new Date(), "yyyy-MM-dd"), title: "", description: "", involvedIds: [], priority: "Média" }]); setInvolvedIdsGlobal([]); setSelectedPriority("Média"); setMode("wpp"); setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <header className="mb-lg">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">Lançar Atividades</h2>
        <p className="font-roboto text-body-lg text-on-surface-variant dark:text-gray-400">Compartilhe o planejamento da semana.</p>
      </header>

      <div className="flex mb-6 bg-surface dark:bg-dark-surface rounded-xl p-1.5 border border-surface-variant dark:border-dark-surface-variant">
        <button onClick={() => setMode("wpp")} className={`flex-1 py-2 rounded-lg font-roboto text-label-sm flex items-center justify-center gap-2 transition-all ${mode === "wpp" ? "bg-[#075E54] text-white shadow-sm" : "text-on-surface-variant dark:text-gray-400 hover:bg-[#075E54]/10 dark:hover:bg-[#075E54]/30 hover:text-[#075E54] dark:hover:text-green-400"}`}>
          <span className="material-symbols-outlined text-[18px]">chat</span> WhatsApp
        </button>
        <button onClick={() => setMode("quick")} className={`flex-1 py-2 rounded-lg font-roboto text-label-sm flex items-center justify-center gap-2 transition-all ${mode === "quick" ? "bg-[#F59E0B] text-white shadow-sm" : "text-on-surface-variant dark:text-gray-400 hover:bg-[#F59E0B]/10 dark:hover:bg-[#F59E0B]/30 hover:text-[#D97706] dark:hover:text-amber-400"}`}>
          <span className="material-symbols-outlined text-[18px]">bolt</span> Rápido
        </button>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-dark-surface-variant rounded-xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Programa</label>
            <select value={selectedProgram} onChange={e => setSelectedProgram(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="">Selecione o Programa</option>
              {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Responsável</label>
            <select value={selectedPerson} onChange={e => setSelectedPerson(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="">Selecione o Responsável</option>
              {persons.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Prioridade</label>
            <select value={selectedPriority} onChange={e => setSelectedPriority(e.target.value)} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto">
              <option value="Baixa">🟢 Baixa</option>
              <option value="Média">🟡 Média</option>
              <option value="Alta">🟠 Alta</option>
              <option value="Urgente">🔴 Urgente</option>
            </select>
          </div>
        </div>

        {mode === "wpp" ? (
          <>
            <div className="text-on-surface dark:text-gray-200 font-roboto text-sm flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-accent">event_note</span>
              Semana atual: {weekDisplay}
            </div>
            <div>
              <label className="font-roboto text-label-md uppercase text-outline dark:text-gray-400">Descritivo da Semana</label>
              <textarea value={weekText} onChange={e => setWeekText(e.target.value)} className="w-full min-h-[300px] bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none p-4 rounded-t-xl resize-none text-on-surface dark:text-white font-roboto" placeholder="Segunda: Coleta de sementes..." />
              <p className="text-label-sm text-outline mt-2">Dica: cole o texto do chat. Use cabeçalhos como "Segunda:" ou "Terça-feira:".</p>
            </div>
            <div>
              <label className="font-roboto text-[10px] uppercase text-outline">Envolver outras pessoas (opcional)</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {persons.filter(p => p.name !== selectedPerson).map(p => (
                  <button type="button" key={p.id} onClick={() => toggleInvolvedGlobal(p.id)} className={`text-xs font-roboto px-4 py-1.5 rounded-full border transition-colors ${involvedIdsGlobal.includes(p.id) ? "bg-accent/20 border-accent text-primary dark:text-white" : "bg-white dark:bg-dark-background border-outline text-on-surface dark:text-gray-300"}`}>{p.name}</button>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase">Atividades Rápidas</h3>
            {quickActivities.map((qa, idx) => (
              <div key={idx} className="p-4 bg-surface dark:bg-dark-background rounded-xl border border-surface-variant dark:border-dark-surface-variant space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Data</label>
                    <input type="date" value={qa.date} onChange={e => updateQuickActivity(idx, "date", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="font-roboto text-[10px] uppercase text-outline">Título</label>
                    <input type="text" placeholder="Título" value={qa.title} onChange={e => updateQuickActivity(idx, "title", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto" />
                  </div>
                  <div>
                    <label className="font-roboto text-[10px] uppercase text-outline">Prioridade</label>
                    <select value={qa.priority || "Média"} onChange={e => updateQuickActivity(idx, "priority", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm text-on-surface dark:text-white font-roboto">
                      <option value="Baixa">🟢 Baixa</option>
                      <option value="Média">🟡 Média</option>
                      <option value="Alta">🟠 Alta</option>
                      <option value="Urgente">🔴 Urgente</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="font-roboto text-[10px] uppercase text-outline">Descrição / Ocorrências</label>
                  <textarea rows={3} placeholder="Detalhes..." value={qa.description} onChange={e => updateQuickActivity(idx, "description", e.target.value)} className="w-full bg-transparent border-b border-primary/20 focus:border-accent outline-none py-1 text-sm resize-none text-on-surface dark:text-white font-roboto" />
                </div>
                <div>
                  <label className="font-roboto text-[10px] uppercase text-outline">Envolver nesta atividade</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {persons.filter(p => p.name !== selectedPerson).map(p => (
                      <button type="button" key={p.id} onClick={() => toggleInvolved(idx, p.id)} className={`text-xs font-roboto px-4 py-1.5 rounded-full border transition-colors ${(qa.involvedIds || []).includes(p.id) ? "bg-accent/20 border-accent text-primary dark:text-white" : "bg-white dark:bg-dark-background border-outline text-on-surface dark:text-gray-300"}`}>{p.name}</button>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => removeQuickActivity(idx)} disabled={quickActivities.length === 1} className="text-error/70 hover:text-error p-1 disabled:opacity-30"><span className="material-symbols-outlined">delete</span></button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addQuickActivity}
              className="bg-accent/10 text-primary dark:text-white font-roboto text-label-sm px-4 py-2 rounded-full flex items-center gap-2 hover:bg-accent/20 transition-all active:scale-95 min-h-[44px] shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Adicionar atividade
            </button>
          </div>
        )}

        {message.text && (
          <div className={`p-4 rounded-xl ${message.type === "success" ? "bg-primary/10 text-primary dark:text-white" : "bg-error-container/20 text-error"}`}>
            <span className="font-roboto text-label-md">{message.text}</span>
            {message.action === "switch" && (
              <button
                type="button"
                onClick={switchToQuickWithText}
                className="ml-4 px-4 py-2 rounded-full bg-accent text-primary font-roboto text-label-sm inline-block hover:bg-yellow-400 transition-all"
              >
                Usar modo Rápido
              </button>
            )}
            {message.type === "success" && (
              <Link to="/" className="ml-4 px-4 py-2 rounded-full bg-accent text-primary font-roboto text-label-sm inline-block hover:bg-yellow-400 transition-all">
                Ir para Dashboard
              </Link>
            )}
          </div>
        )}

        {message.type === "success" && lastInserted && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                const text = formatAgendaForWhatsApp(lastInserted);
                shareViaWhatsApp(text);
              }}
              className="bg-[#25D366] text-white font-roboto text-label-sm px-5 py-2 rounded-full flex items-center gap-2 hover:bg-[#128C7E] transition-all active:scale-95 min-h-[44px]"
            >
              <span className="material-symbols-outlined text-[18px]">send</span>
              Enviar via WhatsApp
            </button>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <button type="submit" disabled={loading} className="bg-accent text-primary font-bold font-roboto py-4 px-12 rounded-full flex items-center gap-3 hover:bg-yellow-400 transition-all active:scale-95 disabled:opacity-50 min-h-[48px]">
            {loading ? "Publicando..." : "Publicar Agenda"}
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </form>
    </div>
  );
}
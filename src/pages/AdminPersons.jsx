import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { format } from "date-fns";
import { useCurrentUser } from "../context/CurrentUserContext";
import { storagePath } from "../lib/privateStorage";

export default function AdminPersons() {
  const { currentUser } = useCurrentUser();
  const canViewAccessHistory = currentUser?.email?.toLowerCase() === "reinaldo@iracambi.com";
  const [persons, setPersons] = useState([]);
  const [form, setForm] = useState({ name: "", initials: "", email: "" });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmAction, setConfirmAction] = useState("deactivate");
  const [message, setMessage] = useState({ type: "", text: "" });
  const formRef = useRef(null);
  const nameInputRef = useRef(null);

  const fetchPersons = useCallback(async () => {
    const { data, error } = await supabase
      .from("persons")
      .select("*")
      .order("name");
    if (error) {
      setMessage({ type: "error", text: `Não foi possível carregar as pessoas: ${error.message}` });
      return;
    }
    setPersons(data || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(fetchPersons, 0);
    return () => window.clearTimeout(timer);
  }, [fetchPersons]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.initials.trim()) return;
    const payload = { name: form.name, initials: form.initials.toUpperCase(), email: form.email.trim().toLowerCase() || null, ...(editingId ? {} : { is_active: true }) };
    const { error } = editingId
      ? await supabase.from("persons").update(payload).eq("id", editingId)
      : await supabase.from("persons").insert(payload);
    if (error) {
      setMessage({ type: "error", text: `Não foi possível salvar a pessoa: ${error.message}` });
      return;
    }
    setMessage({ type: "success", text: editingId ? "Pessoa atualizada com sucesso." : "Pessoa adicionada com sucesso." });
    setForm({ name: "", initials: "", email: "" });
    setEditingId(null);
    fetchPersons();
  }

  function handleEdit(person) {
    setForm({ name: person.name, initials: person.initials, email: person.email || "" });
    setEditingId(person.id);
    setMessage({ type: "info", text: `Editando ${person.name}. Altere os dados e clique em Atualizar.` });
    window.setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      nameInputRef.current?.focus({ preventScroll: true });
    }, 0);
  }

  function requestDeactivate(person) {
    setConfirmAction("deactivate");
    setDeleteTarget(person);
    setShowDeleteConfirm(true);
  }

  function requestDelete(person) {
    setConfirmAction("delete");
    setDeleteTarget(person);
    setShowDeleteConfirm(true);
  }

  async function hasRelatedRecords(personId) {
    const checks = await Promise.all([
      supabase.from("activities").select("id", { count: "exact", head: true }).or(`responsible_id.eq.${personId},created_by.eq.${personId}`),
      supabase.from("vehicle_bookings").select("id", { count: "exact", head: true }).eq("person_id", personId),
      supabase.from("expense_reports").select("id", { count: "exact", head: true }).or(`person_id.eq.${personId},approved_by.eq.${personId},provisioned_by.eq.${personId}`),
      supabase.from("programs").select("id", { count: "exact", head: true }).eq("leader_id", personId),
      supabase.from("activity_logs").select("id", { count: "exact", head: true }).eq("person_id", personId),
    ]);
    return checks.some(({ count, error }) => error || Number(count || 0) > 0);
  }

  async function handleDeleteConfirm() {
    if (deleteTarget) {
      const personName = deleteTarget.name;
      if (confirmAction === "delete" && await hasRelatedRecords(deleteTarget.id)) {
        setDeleteTarget(null);
        setShowDeleteConfirm(false);
        setMessage({ type: "error", text: `“${personName}” possui atividades ou processos relacionados e não pode ser excluído. Utilize o botão Desativar para preservar o histórico.` });
        return;
      }
      const result = confirmAction === "delete"
        ? await supabase.from("persons").delete().eq("id", deleteTarget.id).select("id")
        : await supabase.from("persons").update({ is_active: false, deactivated_at: new Date().toISOString() }).eq("id", deleteTarget.id).select("id");
      const { data, error } = result;
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
      if (error) {
        const missingColumns = error.message.includes("schema cache") || error.message.includes("is_active") || error.message.includes("deactivated_at");
        setMessage({
          type: "error",
          text: confirmAction === "delete"
            ? `“${personName}” não foi excluído porque possui registros relacionados ou a operação não foi autorizada. Recomendação: utilize Desativar para preservar o histórico. Detalhe: ${error.message}`
            : missingColumns
              ? `Não foi possível desativar “${personName}”. Execute o script SQL de desativação e recarregue o cache do Supabase. Detalhe: ${error.message}`
              : `Não foi possível desativar “${personName}”. Detalhe: ${error.message}`,
        });
        return;
      }
      if (!data?.length) {
        setMessage({ type: "error", text: confirmAction === "delete" ? `“${personName}” não foi excluído. Recomendação: utilize Desativar.` : `“${personName}” não foi desativado. O banco não autorizou a operação.` });
        return;
      }
      if (confirmAction === "delete" && deleteTarget.avatar_url) {
        const avatarPath = storagePath(deleteTarget.avatar_url, "profile-photos");
        if (avatarPath) await supabase.storage.from("profile-photos").remove([avatarPath]);
      }
      setMessage({ type: "success", text: confirmAction === "delete" ? `“${personName}” foi excluído definitivamente.` : `“${personName}” foi desativado. Os registros históricos foram preservados.` });
      window.dispatchEvent(new Event("persons-changed"));
      fetchPersons();
    }
  }

  async function reactivatePerson(person) {
    const { data, error } = await supabase.from("persons").update({ is_active: true, deactivated_at: null }).eq("id", person.id).select("id");
    if (error || !data?.length) {
      setMessage({ type: "error", text: `Não foi possível reativar “${person.name}”. ${error?.message || "O banco não autorizou a operação."}` });
      return;
    }
    setMessage({ type: "success", text: `“${person.name}” foi reativado com sucesso.` });
    window.dispatchEvent(new Event("persons-changed"));
    fetchPersons();
  }

  async function resetPassword(person) {
    const { data, error } = await supabase.functions.invoke("admin-reset-password", { body: { personId: person.id } });
    if (error || data?.error) return setMessage({ type: "error", text: data?.error || error.message });
    setMessage({ type: "success", text: `Senha temporária de ${person.name}: ${data.temporaryPassword} — copie agora; a troca será exigida no próximo acesso.` });
    fetchPersons();
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-epilogue text-headline-lg text-primary dark:text-white mb-6">
        Pessoas
      </h2>

      {message.text && (
        <div role="status" className={`mb-5 rounded-xl border p-4 text-sm font-medium ${message.type === "error" ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300" : message.type === "success" ? "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300" : "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"}`}>
          {message.text}
        </div>
      )}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-surface-variant dark:border-gray-700 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            ref={nameInputRef}
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
          <input type="email" placeholder="E-mail de acesso" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg" />
          <input
            placeholder="Iniciais (ex: AR)"
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-accent text-primary font-bold py-3 px-8 rounded-full hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px] flex items-center gap-2"
          >
            {editingId ? "Atualizar" : "Adicionar"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {persons.map((person) => (
          <div
            key={person.id}
            className="flex justify-between items-center bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 p-4 rounded-xl"
          >
            <div>
              <span className="font-space text-primary dark:text-white font-bold">
                {person.name}
              </span>
              <span className="text-sm text-outline ml-2">
                ({person.initials})
              </span>
              {person.email && <p className="text-xs text-outline">{person.email}</p>}
              <span className={`ml-2 rounded-full px-2 py-1 text-xs font-bold ${person.is_active !== false ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" : "bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-200"}`}>
                {person.is_active !== false ? "Ativo" : "Desativado"}
              </span>
            </div>
            <div className="flex gap-2">
              {person.auth_user_id && <button onClick={() => resetPassword(person)} title="Resetar senha" className="p-2 text-blue-700 hover:bg-blue-50 dark:text-blue-300 rounded-full min-h-[44px] min-w-[44px]"><span className="material-symbols-outlined">lock_reset</span></button>}
              <button
                onClick={() => handleEdit(person)}
                className="p-2 text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              {person.is_active !== false ? <button
                onClick={() => requestDeactivate(person)}
                title="Desativar usuário"
                className="p-2 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-900/30 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">person_off</span>
              </button> : <button
                onClick={() => reactivatePerson(person)}
                title="Reativar usuário"
                className="p-2 text-green-700 hover:bg-green-50 dark:text-green-300 dark:hover:bg-green-900/30 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">person_check</span>
              </button>}
              <button
                onClick={() => requestDelete(person)}
                title="Excluir definitivamente"
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={canViewAccessHistory ? "" : "hidden"} aria-hidden={!canViewAccessHistory}>
      <AccessHistory persons={persons} />
      </div>

      {/* Modal de confirmação para exclusão */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title={confirmAction === "delete" ? "Excluir pessoa definitivamente" : "Desativar pessoa"}
        message={
          deleteTarget
            ? confirmAction === "delete"
              ? `Deseja excluir “${deleteTarget.name}” definitivamente? Se houver atividades, reservas, relatórios ou outros vínculos, o banco poderá bloquear a exclusão e o sistema recomendará a desativação.`
              : `Deseja desativar “${deleteTarget.name}”? O usuário deixará de aparecer em novos lançamentos, mas todo o histórico será preservado.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        confirmText={confirmAction === "delete" ? "Sim, excluir" : "Sim, desativar"}
        variant="danger"
      />
    </div>
  );
}

const accessLabels = { login_success: "Entrada", login_failure: "Tentativa sem sucesso", account_locked: "Conta bloqueada", logout: "Saída", password_changed: "Senha alterada", password_reset: "Senha redefinida" };
const dateTime = (value) => value ? format(new Date(value), "dd/MM/yyyy HH:mm:ss") : "—";
const sessionSeconds = (log) => Number(log.duration_seconds || (log.last_seen_at ? Math.max(0, Math.floor((new Date(log.ended_at || log.last_seen_at) - new Date(log.occurred_at)) / 1000)) : 0));
const durationLabel = (seconds) => { const hours = Math.floor(seconds / 3600); const minutes = Math.floor((seconds % 3600) / 60); return hours ? `${hours}h ${minutes}min` : `${minutes}min`; };
const activeSession = (log) => log.event_type === "login_success" && !log.ended_at && log.last_seen_at && Date.now() - new Date(log.last_seen_at).getTime() < 130000;
const deviceLabel = (agent = "") => `${/mobile|android|iphone|ipad/i.test(agent) ? "Mobile" : "Computador"} · ${/edg/i.test(agent) ? "Edge" : /chrome/i.test(agent) ? "Chrome" : /firefox/i.test(agent) ? "Firefox" : /safari/i.test(agent) ? "Safari" : "Navegador"}`;

function AccessHistory({ persons }) {
  const today = format(new Date(), "yyyy-MM-dd");
  const [logs, setLogs] = useState([]);
  const [personFilter, setPersonFilter] = useState("");
  const [eventFilter, setEventFilter] = useState("");
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const sessions = logs.filter((log) => log.event_type === "login_success");
  const totalTime = sessions.reduce((total, log) => total + sessionSeconds(log), 0);

  async function searchAccesses(event) {
    event.preventDefault();
    setSearchError("");
    if (!startDate || !endDate) return setSearchError("Informe as datas inicial e final.");
    if (endDate < startDate) return setSearchError("A data final não pode ser anterior à data inicial.");
    setLoading(true);
    let query = supabase.from("user_access_logs").select("*, person:person_id(name)")
      .gte("occurred_at", new Date(`${startDate}T00:00:00-03:00`).toISOString())
      .lte("occurred_at", new Date(`${endDate}T23:59:59.999-03:00`).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(500);
    if (personFilter) query = query.eq("person_id", personFilter);
    if (eventFilter) query = query.eq("event_type", eventFilter);
    const { data, error } = await query;
    setLoading(false);
    setSearched(true);
    if (error) {
      setLogs([]);
      setSearchError(`Não foi possível consultar os acessos: ${error.message}`);
      return;
    }
    setLogs(data || []);
  }

  return <section className="mt-8 rounded-2xl border border-surface-variant bg-white p-4 dark:border-gray-700 dark:bg-gray-900 sm:p-5"><header className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-wider text-primary-light">Acesso exclusivo de Reinaldo</p><h3 className="text-xl font-bold text-primary dark:text-white">Rastreabilidade de acessos</h3><p className="text-sm text-outline">Escolha o período e os filtros. Os acessos somente serão carregados ao pesquisar.</p></div><span className="w-fit rounded-full bg-emerald-100 px-3 py-1.5 text-xs font-bold text-emerald-800">Consulta restrita</span></header><form onSubmit={searchAccesses} className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"><AccessDate label="Data inicial" value={startDate} onChange={setStartDate} max={endDate} /><AccessDate label="Data final" value={endDate} onChange={setEndDate} min={startDate} /><AccessFilter label="Usuário" value={personFilter} onChange={setPersonFilter}><option value="">Todos</option>{persons.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</AccessFilter><AccessFilter label="Evento" value={eventFilter} onChange={setEventFilter}><option value="">Todos</option>{Object.entries(accessLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</AccessFilter><button disabled={loading} className="min-h-11 self-end rounded-xl bg-primary px-5 py-2.5 font-bold text-white disabled:opacity-60"><span className={`material-symbols-outlined mr-1 align-middle text-[18px] ${loading ? "animate-spin" : ""}`}>{loading ? "progress_activity" : "search"}</span>{loading ? "Pesquisando…" : "Pesquisar acessos"}</button></form>{searchError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchError}</p>}{searched && !searchError && <><div className="mb-5 grid grid-cols-3 gap-3"><AccessMetric label="Sessões" value={sessions.length} /><AccessMetric label="Tempo registrado" value={durationLabel(totalTime)} /><AccessMetric label="Ativas agora" value={sessions.filter(activeSession).length} /></div><div className="grid gap-3 md:hidden">{logs.map((log) => <AccessCard key={log.id} log={log} />)}</div><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-sm"><thead><tr className="border-b bg-surface text-left text-xs uppercase text-outline dark:bg-gray-800"><th className="p-3">Usuário</th><th className="p-3">Entrada / evento</th><th className="p-3">Última atividade</th><th className="p-3">Saída</th><th className="p-3">Duração</th><th className="p-3">Situação</th><th className="p-3">Dispositivo</th><th className="p-3">IP</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-surface-variant/70"><td className="p-3"><strong className="block text-primary dark:text-white">{log.person?.name || "—"}</strong><span className="text-xs text-outline">{log.email}</span></td><td className="p-3">{dateTime(log.occurred_at)}<span className="block text-xs text-outline">{accessLabels[log.event_type] || log.event_type}</span></td><td className="p-3">{dateTime(log.last_seen_at)}</td><td className="p-3">{dateTime(log.ended_at)}</td><td className="p-3 font-bold">{log.event_type === "login_success" ? durationLabel(sessionSeconds(log)) : "—"}</td><td className="p-3"><Status log={log} /></td><td className="max-w-52 truncate p-3" title={log.user_agent}>{deviceLabel(log.user_agent)}</td><td className="p-3 font-mono text-xs">{log.ip_address || "—"}</td></tr>)}</tbody></table></div>{!logs.length && <p className="py-10 text-center text-outline">Nenhum acesso encontrado para os filtros informados.</p>}<p className="mt-4 rounded-xl bg-blue-50 p-3 text-xs text-blue-800 dark:bg-blue-950/30 dark:text-blue-300">A duração é atualizada a cada minuto. Se o navegador for fechado sem usar “Sair”, a última atividade indica o término aproximado. A consulta retorna no máximo 500 movimentos por pesquisa.</p></>}</section>;
}

function AccessFilter({ label, value, onChange, children }) { return <label className="text-xs font-bold uppercase text-outline">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-variant bg-surface px-3 text-sm normal-case dark:bg-gray-800">{children}</select></label>; }
function AccessDate({ label, value, onChange, min, max }) { return <label className="text-xs font-bold uppercase text-outline">{label}<input required type="date" value={value} min={min} max={max} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border border-surface-variant bg-surface px-3 text-sm normal-case dark:bg-gray-800" /></label>; }
function AccessMetric({ label, value }) { return <div className="rounded-xl border border-surface-variant bg-surface p-3 dark:bg-gray-800"><span className="text-[10px] font-bold uppercase text-outline">{label}</span><strong className="block text-lg text-primary dark:text-white">{value}</strong></div>; }
function Status({ log }) { if (activeSession(log)) return <span className="rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800">Ativa</span>; return <span className="rounded-full bg-surface px-2 py-1 text-[10px] font-bold text-outline dark:bg-gray-700">{log.event_type === "login_success" ? "Encerrada" : accessLabels[log.event_type]}</span>; }
function AccessCard({ log }) { return <article className="rounded-xl border border-surface-variant p-4"><div className="flex justify-between gap-2"><div><strong className="text-primary dark:text-white">{log.person?.name || "—"}</strong><p className="text-xs text-outline">{log.email}</p></div><Status log={log} /></div><dl className="mt-3 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-outline">Entrada / evento</dt><dd className="font-bold">{dateTime(log.occurred_at)}</dd></div><div><dt className="text-outline">Duração</dt><dd className="font-bold">{log.event_type === "login_success" ? durationLabel(sessionSeconds(log)) : "—"}</dd></div><div><dt className="text-outline">Última atividade</dt><dd>{dateTime(log.last_seen_at)}</dd></div><div><dt className="text-outline">Saída</dt><dd>{dateTime(log.ended_at)}</dd></div><div className="col-span-2"><dt className="text-outline">Dispositivo</dt><dd>{deviceLabel(log.user_agent)} · {log.ip_address || "IP não informado"}</dd></div></dl></article>; }

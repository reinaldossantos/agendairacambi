import { useEffect, useMemo, useRef, useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "../../lib/supabaseClient";
import { useCurrentUser } from "../../context/CurrentUserContext";
import { getUserColor } from "../../lib/colors";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function CommentSection({ activityId, logs, onNewComment }) {
  const { currentUser } = useCurrentUser();
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [persons, setPersons] = useState([]);
  const [mentionList, setMentionList] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [message, setMessage] = useState("");
  const [removalTarget, setRemovalTarget] = useState(null);
  const [removing, setRemoving] = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    supabase.from("persons").select("id,name,initials,color").eq("is_active", true).order("name").then(({ data }) => setPersons(data || []));
  }, []);

  const activeLogs = useMemo(() => logs.filter((log) => !log.metadata?.deleted), [logs]);
  const roots = activeLogs.filter((log) => !log.metadata?.parent_id);
  const repliesFor = (id) => activeLogs.filter((log) => String(log.metadata?.parent_id || "") === String(id));

  const handleTextChange = (event) => {
    const value = event.target.value;
    setText(value);
    const beforeCursor = value.slice(0, event.target.selectionStart);
    const match = beforeCursor.match(/@([^@\n]*)$/u);
    if (!match) return setShowMentions(false);
    const query = match[1].trim().toLocaleLowerCase("pt-BR");
    setMentionList(persons.filter((person) => `${person.name} ${person.initials || ""}`.toLocaleLowerCase("pt-BR").includes(query)).slice(0, 6));
    setShowMentions(true);
  };

  const insertMention = (person) => {
    const cursor = textareaRef.current?.selectionStart ?? text.length;
    const before = text.slice(0, cursor);
    const after = text.slice(cursor);
    const at = before.lastIndexOf("@");
    const next = `${before.slice(0, at)}@${person.name} ${after}`;
    setText(next);
    setShowMentions(false);
    window.setTimeout(() => { textareaRef.current?.focus(); textareaRef.current?.setSelectionRange(at + person.name.length + 2, at + person.name.length + 2); }, 0);
  };

  const send = async () => {
    if (!currentUser) return setMessage("Entre novamente para comentar.");
    if (!text.trim() || sending) return;
    setSending(true); setMessage("");
    const metadata = replyingTo ? { parent_id: replyingTo.id } : {};
    const { error } = await supabase.from("activity_logs").insert({ activity_id: activityId, person_id: currentUser.id, type: "comment", content: text.trim(), metadata });
    if (error) { setMessage(`Não foi possível enviar: ${error.message}`); setSending(false); return; }
    const mentioned = persons.filter((person) => text.toLocaleLowerCase("pt-BR").includes(`@${person.name}`.toLocaleLowerCase("pt-BR")) && person.id !== currentUser.id);
    if (mentioned.length) await supabase.from("activity_logs").insert(mentioned.map((person) => ({ activity_id: activityId, person_id: person.id, type: "mention", content: `${currentUser.name} mencionou você em um comentário.`, metadata: { mentioned_by: currentUser.id } })));
    setText(""); setReplyingTo(null); setSending(false); onNewComment();
  };

  const startReply = (log) => { setReplyingTo(log); setText(`@${log.person?.name || ""} `); window.setTimeout(() => textareaRef.current?.focus(), 0); };
  const saveEdit = async (log) => {
    if (!editText.trim()) return;
    const { error } = await supabase.from("activity_logs").update({ content: editText.trim(), metadata: { ...(log.metadata || {}), edited: true, edited_at: new Date().toISOString() } }).eq("id", log.id).eq("person_id", currentUser.id);
    if (error) setMessage(`Não foi possível editar: ${error.message}`); else { setEditingId(null); setEditText(""); onNewComment(); }
  };
  const remove = async (log) => {
    if (!log || removing) return;
    setRemoving(true);
    setMessage("");
    const { error } = await supabase.from("activity_logs").update({ metadata: { ...(log.metadata || {}), deleted: true, deleted_at: new Date().toISOString() } }).eq("id", log.id).eq("person_id", currentUser.id);
    setRemoving(false);
    setRemovalTarget(null);
    if (error) setMessage(`Não foi possível remover: ${error.message}`); else onNewComment();
  };

  return <section aria-labelledby="comments-title">
    <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.15em] text-primary-light dark:text-green-300">Colaboração</p><h3 id="comments-title" className="text-xl font-black text-primary dark:text-white">Conversa</h3></div><span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{activeLogs.length} mensage{activeLogs.length === 1 ? "m" : "ns"}</span></div>

    <div className="mb-5 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/50 p-4 shadow-sm dark:border-blue-950 dark:from-dark-surface dark:to-blue-950/20 sm:p-5">
      {replyingTo && <div className="mb-3 flex items-center justify-between rounded-xl border-l-4 border-violet-500 bg-violet-50 px-3 py-2 text-xs text-violet-800 dark:bg-violet-950/30 dark:text-violet-300"><span>Respondendo a <strong>{replyingTo.person?.name}</strong></span><button type="button" onClick={() => { setReplyingTo(null); setText(""); }} aria-label="Cancelar resposta"><span className="material-symbols-outlined icon-plain text-[18px]">close</span></button></div>}
      <div className="flex gap-3"><Avatar person={currentUser} size="lg" /><div className="relative min-w-0 flex-1"><textarea ref={textareaRef} value={text} onChange={handleTextChange} onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); send(); } if (event.key === "Escape") setShowMentions(false); }} rows="3" placeholder="Compartilhe uma atualização ou use @nome para mencionar alguém…" className="w-full resize-none rounded-2xl border border-surface-variant bg-white p-4 text-sm text-on-surface shadow-inner outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-white/10 dark:bg-gray-900 dark:text-white dark:focus:ring-blue-950" />{showMentions && mentionList.length > 0 && <div className="absolute bottom-full left-0 z-20 mb-2 w-72 overflow-hidden rounded-2xl border border-surface-variant bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-gray-800">{mentionList.map((person) => <button key={person.id} type="button" onClick={() => insertMention(person)} className="flex min-h-11 w-full items-center gap-2 rounded-xl px-2 text-left hover:bg-blue-50 dark:hover:bg-white/10"><Avatar person={person} /><span><strong className="block text-sm dark:text-white">{person.name}</strong><span className="text-[10px] text-outline">@{person.name}</span></span></button>)}</div>}</div></div>
      {message && <p role="alert" className="mt-3 rounded-xl bg-red-50 p-2 text-xs text-red-700 dark:bg-red-950/30 dark:text-red-300">{message}</p>}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pl-0 sm:pl-14"><span className="text-[10px] text-outline">Ctrl + Enter para enviar · use @ para mencionar</span><button type="button" onClick={send} disabled={sending || !text.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-full bg-gradient-to-r from-[#ffd84d] to-[#f7bd21] px-5 text-sm font-black text-primary shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"><span className={`material-symbols-outlined icon-plain text-[19px] ${sending ? "animate-spin" : ""}`}>{sending ? "progress_activity" : "send"}</span>{sending ? "Enviando…" : "Enviar"}</button></div>
    </div>

    {!roots.length ? <div className="rounded-3xl border border-dashed border-surface-variant px-5 py-10 text-center dark:border-white/10"><span className="material-symbols-outlined text-4xl text-blue-300">forum</span><h4 className="mt-2 font-bold text-primary dark:text-white">Comece a conversa</h4><p className="mt-1 text-sm text-outline">Registre uma atualização, pergunta ou decisão sobre esta atividade.</p></div> : <div className="space-y-3">{roots.map((log) => <div key={log.id}><CommentCard log={log} currentUser={currentUser} persons={persons} editingId={editingId} editText={editText} setEditText={setEditText} onEdit={() => { setEditingId(log.id); setEditText(log.content); }} onCancelEdit={() => setEditingId(null)} onSaveEdit={() => saveEdit(log)} onRemove={() => setRemovalTarget(log)} onReply={() => startReply(log)} />{repliesFor(log.id).length > 0 && <div className="ml-6 mt-2 space-y-2 border-l-2 border-blue-100 pl-4 dark:border-blue-950 sm:ml-12">{repliesFor(log.id).map((reply) => <CommentCard key={reply.id} log={reply} currentUser={currentUser} persons={persons} editingId={editingId} editText={editText} setEditText={setEditText} onEdit={() => { setEditingId(reply.id); setEditText(reply.content); }} onCancelEdit={() => setEditingId(null)} onSaveEdit={() => saveEdit(reply)} onRemove={() => setRemovalTarget(reply)} onReply={() => startReply(log)} compact />)}</div>}</div>)}</div>}
    <ConfirmDialog
      isOpen={!!removalTarget}
      title="Remover comentário"
      message="Este comentário deixará de aparecer na conversa, mas o registro da remoção será preservado para fins de auditoria. Deseja continuar?"
      confirmText={removing ? "Removendo..." : "Sim, remover"}
      cancelText="Manter comentário"
      onConfirm={() => remove(removalTarget)}
      onCancel={() => { if (!removing) setRemovalTarget(null); }}
    />
  </section>;
}

function CommentCard({ log, currentUser, persons, editingId, editText, setEditText, onEdit, onCancelEdit, onSaveEdit, onRemove, onReply, compact }) {
  const color = getUserColor(log.person?.id);
  const own = currentUser?.id === log.person_id;
  return <article className={`group flex gap-3 rounded-2xl border border-surface-variant bg-white p-4 shadow-sm transition hover:shadow-md dark:border-white/10 dark:bg-white/5 ${compact ? "py-3" : ""}`}><Avatar person={log.person} /><div className="min-w-0 flex-1"><header className="flex flex-wrap items-center gap-x-2"><strong className={color.text}>{log.person?.name || "Usuário"}</strong><time className="text-[10px] text-outline" dateTime={log.created_at} title={format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm:ss")}>{formatDistanceToNow(new Date(log.created_at), { addSuffix: true, locale: ptBR })}</time>{log.metadata?.edited && <span className="text-[9px] italic text-outline">editado</span>}</header>{editingId === log.id ? <div className="mt-2"><textarea value={editText} onChange={(event) => setEditText(event.target.value)} rows="3" className="w-full rounded-xl border border-blue-200 p-3 text-sm dark:border-blue-900 dark:bg-gray-900 dark:text-white" /><div className="mt-2 flex gap-2"><button type="button" onClick={onSaveEdit} className="rounded-full bg-primary px-3 py-1.5 text-xs font-bold text-white">Salvar</button><button type="button" onClick={onCancelEdit} className="rounded-full bg-surface px-3 py-1.5 text-xs font-bold dark:bg-gray-700">Cancelar</button></div></div> : <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-on-surface dark:text-gray-200"><MentionText text={log.content} persons={persons} /></p>}<footer className="mt-2 flex items-center gap-3 text-[11px]"><button type="button" onClick={onReply} className="font-bold text-blue-700 hover:underline dark:text-blue-300">Responder</button>{own && editingId !== log.id && <><button type="button" onClick={onEdit} className="font-bold text-outline hover:text-primary">Editar</button><button type="button" onClick={onRemove} className="font-bold text-red-600 hover:underline dark:text-red-400">Remover</button></>}</footer></div></article>;
}

function Avatar({ person, size = "sm" }) { const color = getUserColor(person?.id); return person?.avatar_url ? <img src={person.avatar_url} alt="" className={`${size === "lg" ? "h-11 w-11" : "h-9 w-9"} shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-gray-800`} /> : <span className={`${size === "lg" ? "h-11 w-11" : "h-9 w-9"} ${color.bg} ${color.text} ${color.ring} flex shrink-0 items-center justify-center rounded-full text-xs font-black ring-1`}>{person?.initials || "?"}</span>; }
function MentionText({ text, persons }) { const names = persons.map((person) => person.name).sort((a, b) => b.length - a.length); if (!names.length) return text; const escaped = names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")); const regex = new RegExp(`(@(?:${escaped.join("|")}))`, "giu"); return String(text || "").split(regex).map((part, index) => part.startsWith("@") ? <span key={index} className="rounded bg-blue-50 px-1 font-bold text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{part}</span> : part); }

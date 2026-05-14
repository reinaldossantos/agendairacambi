import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { format, parseISO, startOfWeek, addDays, subWeeks, addWeeks, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Announcements() {
  const { currentUser } = useCurrentUser();
  const [announcements, setAnnouncements] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Controle da semana
  const [currentMonday, setCurrentMonday] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5);

  useEffect(() => {
    fetchAnnouncements();
    fetchPrograms();
  }, []);

  async function fetchAnnouncements() {
    const { data } = await supabase
      .from("announcements")
      .select("*, author:author_id(name), program:program_id(name)")
      .order("created_at", { ascending: false });
    setAnnouncements(data || []);
  }

  async function fetchPrograms() {
    const { data } = await supabase.from("programs").select("id, name").order("name");
    setPrograms(data || []);
  }

  const filteredAnnouncements = announcements.filter((a) => {
    const created = parseISO(a.created_at);
    return isWithinInterval(created, { start: weekStart, end: weekEnd });
  });

  const goToPreviousWeek = () => setCurrentMonday(subWeeks(currentMonday, 1));
  const goToNextWeek = () => setCurrentMonday(addWeeks(currentMonday, 1));
  const goToCurrentWeek = () => setCurrentMonday(startOfWeek(new Date(), { weekStartsOn: 1 }));

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    const payload = {
      title,
      content,
      program_id: selectedProgram || null,
      author_id: currentUser?.id || null, // se não houver usuário, fica null
    };

    let error = null;
    if (editingId) {
      const res = await supabase.from("announcements").update(payload).eq("id", editingId);
      error = res.error;
    } else {
      const res = await supabase.from("announcements").insert(payload);
      error = res.error;
    }

    if (error) {
      setMessage({ type: "error", text: "Erro ao salvar aviso." });
    } else {
      setMessage({ type: "success", text: editingId ? "Aviso atualizado!" : "Aviso publicado!" });
      setTitle("");
      setContent("");
      setSelectedProgram("");
      setEditingId(null);
      fetchAnnouncements();
    }
    setLoading(false);
    setTimeout(() => setMessage(null), 3000);
  }

  function startEdit(announcement) {
    setTitle(announcement.title);
    setContent(announcement.content || "");
    setSelectedProgram(announcement.program_id || "");
    setEditingId(announcement.id);
  }

  function cancelEdit() {
    setTitle("");
    setContent("");
    setSelectedProgram("");
    setEditingId(null);
  }

  function requestDelete(announcement) {
    setDeleteTarget(announcement);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    await supabase.from("announcements").delete().eq("id", deleteTarget.id);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    fetchAnnouncements();
    setMessage({ type: "success", text: "Aviso removido." });
    setTimeout(() => setMessage(null), 3000);
  }

  // Determina se o usuário atual pode gerenciar o aviso
  const canManage = (announcement) => {
    if (!currentUser) return false; // sem usuário, não pode
    if (announcement.author_id === null) return true; // aviso anônimo: qualquer um logado pode
    return announcement.author_id === currentUser.id; // próprio autor
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">Mural de Avisos</h2>

      {/* Navegação da semana */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <button onClick={goToPreviousWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_left</span>
          </button>
          <button onClick={goToCurrentWeek} className="px-4 py-2 rounded-full bg-green-200 text-green-800 hover:bg-green-300 dark:bg-green-700/40 dark:text-green-200 dark:hover:bg-green-700/60 font-roboto text-label-sm min-h-[44px] flex items-center active:scale-95 transition-all">
            Hoje
          </button>
          <button onClick={goToNextWeek} className="p-2 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-800/30 dark:hover:bg-green-800/50 min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95">
            <span className="material-symbols-outlined text-green-700 dark:text-green-300">chevron_right</span>
          </button>
        </div>
        <span className="text-on-surface-variant dark:text-gray-300 text-sm md:text-base">
          {format(weekStart, "dd 'de' MMM", { locale: ptBR })} – {format(weekEnd, "dd 'de' MMM", { locale: ptBR })}
        </span>
      </div>

      {/* Formulário de novo aviso / edição */}
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 mb-8">
        <h3 className="font-roboto text-headline-md text-primary dark:text-white mb-4">
          {editingId ? "Editar Aviso" : "Novo Aviso"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Título do aviso"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto"
          />
          <textarea
            rows={4}
            placeholder="Conteúdo do aviso"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg resize-none text-on-surface dark:text-white font-roboto"
          />
          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto"
          >
            <option value="">Todos os programas</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <div className="flex justify-end gap-3">
            {editingId && (
              <button type="button" onClick={cancelEdit} className="px-4 py-2 rounded-full border border-outline text-on-surface-variant font-roboto text-label-sm hover:bg-gray-100 dark:hover:bg-white/10 min-h-[44px]">
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="bg-accent text-primary font-roboto font-bold py-3 px-8 rounded-full hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px]"
            >
              {editingId ? "Atualizar" : "Publicar Aviso"}
            </button>
          </div>
        </form>
        {message && (
          <div className={`mt-4 p-3 rounded-xl ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-4">Excluir aviso</h3>
            <p className="text-on-surface-variant dark:text-gray-300 mb-6">Tem certeza que deseja excluir o aviso "{deleteTarget?.title}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 rounded-full border border-outline text-on-surface-variant font-roboto hover:bg-gray-100 dark:hover:bg-white/10">Cancelar</button>
              <button onClick={handleDeleteConfirm} className="px-5 py-2.5 rounded-full bg-red-100 text-red-800 font-roboto hover:bg-red-200">Excluir</button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de avisos filtrados */}
      <div className="space-y-4">
        {filteredAnnouncements.length === 0 ? (
          <p className="text-on-surface-variant dark:text-gray-400">Nenhum aviso nesta semana.</p>
        ) : (
          filteredAnnouncements.map((a) => (
            <div key={a.id} className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-roboto text-headline-md text-primary dark:text-white">{a.title}</h3>
                <span className="text-xs text-outline dark:text-gray-400">
                  {format(parseISO(a.created_at), "dd/MM/yyyy 'às' HH:mm")}
                </span>
              </div>
              <p className="text-on-surface dark:text-gray-200 mb-3 whitespace-pre-wrap">{a.content}</p>
              <div className="flex items-center gap-2 text-sm text-outline dark:text-gray-400">
                {a.program && <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary">{a.program.name}</span>}
                <span>por {a.author?.name || "Anônimo"}</span>
                {canManage(a) && (
                  <div className="ml-auto flex gap-2">
                    <button onClick={() => startEdit(a)} className="text-primary hover:underline text-xs">Editar</button>
                    <button onClick={() => requestDelete(a)} className="text-red-500 hover:underline text-xs">Excluir</button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
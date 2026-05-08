import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { format, parseISO, isValid as isDateValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import CommentSection from "../components/activities/CommentSection";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PhotoUpload from "../components/activities/PhotoUpload";
import { getUserColor } from "../lib/colors";
import { shareViaWhatsApp, formatAgendaForWhatsApp } from "../lib/whatsapp";

const priorityColors = {
  Baixa: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  Média: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  Alta: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  Urgente: "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
};

export default function ActivityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useCurrentUser();

  const [activity, setActivity] = useState(null);
  const [involvedPersons, setInvolvedPersons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "",
    priority: "Média",
    due_date: "",
    program_id: "",
    responsible_id: "",
    involved_ids: [],
    images: [],
  });
  const [logs, setLogs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);

  const [programs, setPrograms] = useState([]);
  const [allPersons, setAllPersons] = useState([]);

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name, initials, color), creator:created_by(name, id)")
      .eq("id", id)
      .single();
    if (data) {
      setActivity(data);
      setFormData({
        title: data.title,
        description: data.description || "",
        status: data.status,
        priority: data.priority || "Média",
        due_date: data.due_date || data.week_start,
        program_id: data.program_id || "",
        responsible_id: data.responsible_id || "",
        involved_ids: data.involved_ids || [],
        images: data.images || [],
      });
      if (data.involved_ids?.length) {
        const { data: personsData } = await supabase
          .from("persons")
          .select("id, name, initials")
          .in("id", data.involved_ids);
        setInvolvedPersons(personsData || []);
      }
    }
    setLoading(false);
  }, [id]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*, person:person_id(name, initials, color, id)")
      .eq("activity_id", id)
      .order("created_at", { ascending: true });
    setLogs(data || []);
  }, [id]);

  const fetchMeta = useCallback(async () => {
    const [progRes, persRes] = await Promise.all([
      supabase.from("programs").select("id, name").order("name"),
      supabase.from("persons").select("id, name, initials").order("name"),
    ]);
    setPrograms(progRes.data || []);
    setAllPersons(persRes.data || []);
  }, []);

  useEffect(() => {
    fetchActivity();
    fetchLogs();
    fetchMeta();
  }, [fetchActivity, fetchLogs, fetchMeta]);

  const isAuthor = currentUser && activity && currentUser.id === activity.created_by;
  const isResponsible = currentUser && activity && currentUser.id === activity.responsible_id;
  const canEdit = isResponsible || isAuthor;

  const handleEditToggle = () => {
    if (!canEdit) return;
    setEditMode(!editMode);
    if (!editMode) {
      setFormData({
        title: activity.title,
        description: activity.description || "",
        status: activity.status,
        priority: activity.priority || "Média",
        due_date: activity.due_date || activity.week_start,
        program_id: activity.program_id || "",
        responsible_id: activity.responsible_id || "",
        involved_ids: activity.involved_ids || [],
        images: activity.images || [],
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleInvolved = (personId) => {
    setFormData((prev) => ({
      ...prev,
      involved_ids: prev.involved_ids.includes(personId)
        ? prev.involved_ids.filter((id) => id !== personId)
        : [...prev.involved_ids, personId],
    }));
  };

  const handlePhotosChange = (newPhotos) => {
    setFormData((prev) => ({ ...prev, images: newPhotos }));
  };

  async function handleSave() {
    if (!canEdit || !activity) return;
    setSaving(true);
    const updates = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date,
      program_id: formData.program_id || null,
      responsible_id: formData.responsible_id || null,
      involved_ids: formData.involved_ids,
      images: formData.images,
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("activities").update(updates).eq("id", activity.id);
    if (!error) {
      if (updates.status !== activity.status) {
        await supabase.from("activity_logs").insert({
          activity_id: activity.id,
          person_id: currentUser.id,
          type: "status_change",
          content: `Status alterado de "${activity.status}" para "${updates.status}"`,
          metadata: { old_status: activity.status, new_status: updates.status },
        });
      }
      if (
        updates.description !== activity.description ||
        updates.title !== activity.title ||
        updates.priority !== activity.priority
      ) {
        await supabase.from("activity_logs").insert({
          activity_id: activity.id,
          person_id: currentUser.id,
          type: "update",
          content: "Atividade editada.",
        });
      }

      const oldInvolved = activity.involved_ids || [];
      const newInvolved = formData.involved_ids || [];
      const added = newInvolved.filter((pid) => !oldInvolved.includes(pid));
      const removed = oldInvolved.filter((pid) => !newInvolved.includes(pid));

      const involvementLogs = [];
      for (const pid of added) {
        const person = allPersons.find((p) => p.id === pid);
        if (person) {
          involvementLogs.push({
            activity_id: activity.id,
            person_id: currentUser.id,
            type: "involvement",
            content: `${person.name} foi envolvido(a).`,
            metadata: { involved_person_id: pid, action: "added" },
          });
        }
      }
      for (const pid of removed) {
        const person = allPersons.find((p) => p.id === pid);
        if (person) {
          involvementLogs.push({
            activity_id: activity.id,
            person_id: currentUser.id,
            type: "involvement",
            content: `${person.name} foi removido(a) dos envolvidos.`,
            metadata: { involved_person_id: pid, action: "removed" },
          });
        }
      }
      if (involvementLogs.length > 0) {
        await supabase.from("activity_logs").insert(involvementLogs);
      }

      setShowUpdateSuccess(true);
      setEditMode(false);
      fetchActivity();
      fetchLogs();
    } else {
      alert("Erro ao salvar: " + error.message);
    }
    setSaving(false);
  }

  const handleDeleteRequest = () => {
    if (canEdit) setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);
    const { error } = await supabase.from("activities").delete().eq("id", activity.id);
    setDeleting(false);
    if (error) alert("Erro ao excluir: " + error.message);
    else setShowDeleteSuccess(true);
  };

  const handleWhatsAppShare = () => {
    if (!activity) return;
    const text = formatAgendaForWhatsApp({
      program: activity.programs?.name || "N/D",
      responsible: activity.persons?.name || "N/D",
      weekStart: activity.week_start,
      activities: [
        {
          title: activity.title,
          description: activity.description,
          due_date: activity.due_date,
        },
      ],
    });
    shareViaWhatsApp(text);
  };

  if (loading) return <div className="text-center py-20 font-roboto">Carregando...</div>;
  if (!activity) return <div className="text-center py-20 font-roboto">Atividade não encontrada.</div>;

  const priority = activity.priority || "Média";

  return (
    <div className="max-w-4xl mx-auto mb-24 px-4 md:px-0 font-roboto">
      {/* Modais */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir atividade"
        message="Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita e os comentários serão perdidos."
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteConfirm(false)}
        confirmText="Sim, excluir"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={showDeleteSuccess}
        title="Atividade excluída"
        message="A atividade foi removida com sucesso."
        onConfirm={() => { setShowDeleteSuccess(false); navigate("/", { replace: true }); }}
        onCancel={() => {}}
        confirmText="OK"
        variant="success"
      />
      <ConfirmDialog
        isOpen={showUpdateSuccess}
        title="Atividade atualizada"
        message="As alterações foram salvas com sucesso."
        onConfirm={() => setShowUpdateSuccess(false)}
        onCancel={() => {}}
        confirmText="OK"
        variant="success"
      />

      <section className="mb-10">
        <div className="flex items-center gap-2 mb-3">
          <span className="px-3 py-1 bg-primary/10 text-primary dark:bg-white/10 dark:text-white text-label-sm font-roboto rounded-full border border-primary/30 dark:border-white/20">
            {activity.programs?.name}
          </span>
          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-roboto font-medium border ${priorityColors[priority]}`}>
            {priority}
          </span>
          <span className="text-outline dark:text-gray-400">• ID: #{activity.id.slice(0, 8)}</span>
        </div>

        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-4">
          {activity.title}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <span className="material-symbols-outlined text-accent">calendar_today</span>
            <div>
              <p className="text-label-sm font-roboto text-outline dark:text-gray-400">Data</p>
              <p className="font-roboto font-semibold text-on-surface dark:text-white">
                {isDateValid(parseISO(activity.due_date))
                  ? format(parseISO(activity.due_date), "dd 'de' MMMM, yyyy", { locale: ptBR })
                  : activity.due_date}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <span className="material-symbols-outlined text-accent">person</span>
            <div>
              <p className="text-label-sm font-roboto text-outline dark:text-gray-400">Responsável</p>
              <p className="font-roboto font-semibold text-on-surface dark:text-white">
                {activity.persons?.name}
              </p>
            </div>
          </div>
        </div>

        {/* Pessoas envolvidas (visualização) */}
        {involvedPersons.length > 0 && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Pessoas envolvidas</p>
            <div className="flex flex-wrap gap-2">
              {involvedPersons.map((p) => (
                <span key={p.id} className="px-4 py-1.5 rounded-full bg-accent/20 text-primary dark:text-white text-sm font-roboto">
                  {p.name} ({p.initials})
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Modo edição: título */}
        {canEdit && editMode && (
          <div className="mt-4">
            <label className="font-roboto text-label-md text-outline dark:text-gray-400 block mb-2">Título</label>
            <input
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto text-lg"
            />
          </div>
        )}

        {/* Modo edição: gerenciar envolvidos */}
        {canEdit && editMode && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Gerenciar envolvidos</p>
            <div className="flex flex-wrap gap-2">
              {allPersons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleInvolved(p.id)}
                  className={`text-sm font-roboto px-4 py-1.5 rounded-full border transition-colors ${
                    formData.involved_ids.includes(p.id)
                      ? "bg-accent/20 border-accent text-primary dark:text-white"
                      : "bg-white dark:bg-dark-background border-outline text-on-surface dark:text-gray-300"
                  }`}
                >
                  {p.name} ({p.initials})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modo edição: prioridade */}
        {canEdit && editMode && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <label className="font-roboto text-label-sm text-outline dark:text-gray-400 mb-2 block">Prioridade</label>
            <select
              name="priority"
              value={formData.priority}
              onChange={handleChange}
              className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-sm font-roboto text-on-surface dark:text-white"
            >
              <option value="Baixa">🟢 Baixa</option>
              <option value="Média">🟡 Média</option>
              <option value="Alta">🟠 Alta</option>
              <option value="Urgente">🔴 Urgente</option>
            </select>
          </div>
        )}

        {/* Modo edição: upload de fotos */}
        {canEdit && editMode && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Registro Fotográfico</p>
            <PhotoUpload onUploadComplete={handlePhotosChange} existingPhotos={formData.images} />
          </div>
        )}

        {/* Imagens atuais (visualização) */}
        {!editMode && activity.images?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {activity.images.map((url, idx) => (
              <img key={idx} src={url} alt="Anexo" className="w-full h-32 object-cover rounded-lg border border-surface-variant dark:border-white/10" />
            ))}
          </div>
        )}

        {/* Botões de ação */}
        <div className="mt-4 flex flex-wrap gap-3">
          {canEdit && (
            <>
              <button onClick={handleEditToggle} className="px-4 py-2 rounded-full bg-accent/20 text-primary dark:text-white font-roboto text-label-sm flex items-center gap-2 hover:bg-accent/40 transition-all active:scale-95 min-h-[44px]">
                <span className="material-symbols-outlined text-[18px]">{editMode ? "close" : "edit"}</span>
                {editMode ? "Cancelar" : "Editar"}
              </button>
              {!editMode && (
                <button onClick={handleDeleteRequest} disabled={deleting} className="px-4 py-2 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 font-roboto text-label-sm flex items-center gap-2 hover:bg-red-200 dark:hover:bg-red-900/50 transition-all active:scale-95 min-h-[44px]">
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                  Excluir
                </button>
              )}
            </>
          )}
          <button onClick={handleWhatsAppShare} className="px-4 py-2 rounded-full bg-[#25D366] text-white font-roboto text-label-sm flex items-center gap-2 hover:bg-[#128C7E] transition-all active:scale-95 min-h-[44px]">
            <span className="material-symbols-outlined text-[18px]">send</span>
            WhatsApp
          </button>
        </div>

        {!currentUser && <p className="text-sm text-outline mt-2">Selecione seu nome no topo para editar/excluir se for o responsável.</p>}
        {currentUser && !canEdit && <p className="text-sm text-outline mt-2">Apenas o responsável pode editar/excluir esta atividade.</p>}
      </section>

      {/* Status */}
      {canEdit && (
        <section className="mb-10">
          <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-4">Status</h3>
          <div className="flex flex-wrap gap-3">
            {["Planejado", "Em andamento", "Realizado", "Pendente"].map((st) => (
              <button
                key={st}
                onClick={() => setFormData((prev) => ({ ...prev, status: st }))}
                disabled={!editMode}
                className={`px-5 py-2 rounded-full font-roboto text-label-sm transition-all active:scale-95 min-h-[44px] border ${
                  formData.status === st ? "bg-accent/20 border-accent text-primary dark:text-white" : "bg-surface dark:bg-white/5 border-outline text-on-surface dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10"
                } ${!editMode ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                {st}
              </button>
            ))}
          </div>
          {!editMode && <p className="text-label-sm text-outline mt-2">Clique em "Editar" para alterar o status.</p>}
        </section>
      )}

      {/* Descrição editável */}
      {canEdit && editMode && (
        <section className="mb-10 space-y-4">
          <div>
            <label className="font-roboto text-label-md text-outline dark:text-gray-400 block mb-2">Desdobramentos / Ocorrências</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={6}
              className="w-full bg-transparent border-0 border-b-2 border-surface-variant dark:border-white/20 focus:border-accent focus:ring-0 px-0 py-3 font-roboto text-body-lg resize-none text-on-surface dark:text-white"
              placeholder="Descreva o progresso real, anexe fotos ou documentos..."
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="w-full py-3 rounded-full bg-accent text-primary font-bold font-roboto flex items-center justify-center gap-2 hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px]">
            <span className="material-symbols-outlined">save</span>
            {saving ? "Salvando..." : "Salvar Alterações"}
          </button>
        </section>
      )}

      {(!editMode || !canEdit) && (
        <section className="mb-10">
          <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-4">Descrição</h3>
          <p className="text-body-md text-on-surface dark:text-gray-200 whitespace-pre-wrap">{activity.description || "Nenhuma descrição."}</p>
        </section>
      )}

      <CommentSection activityId={activity.id} logs={logs.filter((l) => l.type === "comment")} onNewComment={fetchLogs} />

      <section className="mt-12">
        <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-6">Histórico de Atualizações</h3>
        <div className="space-y-4">
          {logs.filter((l) => l.type !== "comment").length === 0 ? (
            <p className="text-on-surface-variant dark:text-gray-400 text-body-md">Nenhum histórico registrado.</p>
          ) : (
            logs.filter((l) => l.type !== "comment").map((log) => {
              const color = getUserColor(log.person?.id);
              return (
                <div key={log.id} className={`flex gap-4 p-4 rounded-2xl ${color.bg} bg-opacity-10 dark:bg-opacity-20 border border-surface-variant dark:border-white/10`}>
                  <div className={`w-8 h-8 rounded-full ${color.bg} flex items-center justify-center ${color.ring} ring-1 text-xs font-bold ${color.text}`}>
                    {log.person?.initials || "?"}
                  </div>
                  <div>
                    <span className={`font-roboto font-bold ${color.text}`}>{log.person?.name}</span>
                    <span className="text-[10px] text-outline ml-2">{format(new Date(log.created_at), "dd/MM 'às' HH:mm")}</span>
                    <p className="text-body-md text-on-surface dark:text-gray-200 mt-1">{log.content}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
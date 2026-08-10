import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { format, parseISO, isValid as isDateValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import CommentSection from "../components/activities/CommentSection";
import ActivityTimeline from "../components/activities/ActivityTimeline";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import PhotoUpload from "../components/activities/PhotoUpload";
import FileUpload from "../components/activities/FileUpload";
import EventFields from "../components/activities/EventFields";
import { emptyEventData, normalizeEventData } from "../lib/events";
import { shareViaWhatsApp, formatSingleActivityForWhatsAppSimple } from "../lib/whatsapp";
import { signFiles, signImages, storagePath } from "../lib/privateStorage";

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
    start_datetime: "",
    end_datetime: "",
    program_id: "",
    responsible_id: "",
    involved_ids: [],
    images: [],
    files: [],
    is_event: false,
    event_data: emptyEventData(),
  });
  const [logs, setLogs] = useState([]);
  const [collaborationTab, setCollaborationTab] = useState("comments");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showUpdateSuccess, setShowUpdateSuccess] = useState(false);
  const [showCancelReason, setShowCancelReason] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const [programs, setPrograms] = useState([]);
  const [allPersons, setAllPersons] = useState([]);

  const fetchActivity = useCallback(async () => {
    const { data } = await supabase
      .from("activities")
      .select("*, programs:program_id(name), persons:responsible_id(name, initials, color, is_active), creator:created_by(name, id, is_active)")
      .eq("id", id)
      .single();
    if (data) {
      data.images = await signImages(data.images || []);
      data.files = await signFiles(data.files || []);
      setActivity(data);
      setFormData({
        title: data.title,
        description: data.description || "",
        status: data.status,
        priority: data.priority || "Média",
        due_date: data.due_date || data.week_start,
        start_datetime: data.start_datetime || "",
        end_datetime: data.end_datetime || "",
        program_id: data.program_id || "",
        responsible_id: data.responsible_id || "",
        involved_ids: data.involved_ids || [],
        images: data.images || [],
        files: data.files || [],
        is_event: data.is_event || false,
        event_data: normalizeEventData(data.event_data),
      });
      if (data.involved_ids?.length) {
        const { data: personsData } = await supabase
          .from("persons")
          .select("id, name, initials, is_active")
          .in("id", data.involved_ids);
        setInvolvedPersons(personsData || []);
      }
    }
    setLoading(false);
  }, [id]);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("activity_logs")
      .select("*, person:person_id(name, initials, color, avatar_url, id)")
      .eq("activity_id", id)
      .order("created_at", { ascending: true });
    setLogs(data || []);
  }, [id]);

  const fetchMeta = useCallback(async () => {
    const [progRes, persRes] = await Promise.all([
      supabase.from("programs").select("id, name").order("name"),
      supabase.from("persons").select("id, name, initials").eq("is_active", true).order("name"),
    ]);
    setPrograms(progRes.data || []);
    setAllPersons(persRes.data || []);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => Promise.all([fetchActivity(), fetchLogs(), fetchMeta()]), 0);
    return () => window.clearTimeout(timer);
  }, [fetchActivity, fetchLogs, fetchMeta]);

  useEffect(() => {
    const channel = supabase.channel(`activity-collaboration-${id}`).on("postgres_changes", { event: "*", schema: "public", table: "activity_logs", filter: `activity_id=eq.${id}` }, () => fetchLogs()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, fetchLogs]);

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
        start_datetime: activity.start_datetime || "",
        end_datetime: activity.end_datetime || "",
        program_id: activity.program_id || "",
        responsible_id: activity.responsible_id || "",
        involved_ids: activity.involved_ids || [],
        images: activity.images || [],
        files: activity.files || [],
        is_event: activity.is_event || false,
        event_data: normalizeEventData(activity.event_data),
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

  const handleFilesChange = (newFiles) => {
    setFormData((prev) => ({ ...prev, files: newFiles }));
  };

  const handleStatusClick = (newStatus) => {
    if (!editMode) return;
    if (newStatus === "Cancelado") {
      setShowCancelReason(true);
      return;
    }
    setFormData((prev) => ({ ...prev, status: newStatus }));
  };

  const confirmCancel = async () => {
    if (!cancelReason.trim()) {
      setNotice({ type: "warning", text: "Informe uma justificativa para o cancelamento." });
      return;
    }
    setShowCancelReason(false);

    if (canEdit && activity) {
      setSaving(true);
      const updates = {
        title: formData.title,
        description: formData.description,
        status: "Cancelado",
        priority: formData.priority,
        due_date: formData.due_date,
        start_datetime: formData.start_datetime || null,
        end_datetime: formData.end_datetime || null,
        program_id: formData.program_id || null,
        responsible_id: formData.responsible_id || null,
        involved_ids: formData.involved_ids,
        images: formData.images,
        files: formData.files,
        is_event: formData.is_event,
        event_data: formData.is_event ? formData.event_data : {},
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("activities").update(updates).eq("id", activity.id);
      if (!error) {
        await supabase.from("activity_logs").insert({
          activity_id: activity.id,
          person_id: currentUser.id,
          type: "status_change",
          content: `Status alterado de "${activity.status}" para "Cancelado". Justificativa: ${cancelReason}`,
          metadata: { old_status: activity.status, new_status: "Cancelado", reason: cancelReason },
        });

        setShowUpdateSuccess(true);
        setEditMode(false);
        fetchActivity();
        fetchLogs();
      } else {
        setNotice({ type: "error", text: `Não foi possível salvar: ${error.message}` });
      }
      setSaving(false);
      setCancelReason("");
    }
  };

  // Função auxiliar para prorrogação da finalização
  const postponeEndDate = (days = 0, weeks = 0, months = 0) => {
    if (!formData.end_datetime) return;
    const current = new Date(formData.end_datetime);
    if (days) current.setDate(current.getDate() + days);
    if (weeks) current.setDate(current.getDate() + weeks * 7);
    if (months) current.setMonth(current.getMonth() + months);
    setFormData(prev => ({ ...prev, end_datetime: current.toISOString() }));
  };

  async function handleSave() {
    if (!canEdit || !activity) return;
    if (!formData.description.trim() || !formData.start_datetime || !formData.end_datetime) {
      setNotice({ type: "warning", text: "Preencha a descrição, o início e a finalização da atividade." });
      return;
    }
    if (formData.end_datetime <= formData.start_datetime) {
      setNotice({ type: "warning", text: "A finalização deve ser posterior ao início da atividade." });
      return;
    }
    if (formData.is_event && (!formData.event_data?.theme?.trim() || !formData.event_data?.start_at || !formData.event_data?.end_at)) {
      setNotice({ type: "warning", text: "Informe a temática, o início e o término do evento." });
      return;
    }
    if (formData.is_event && formData.event_data.start_at > formData.event_data.end_at) {
      setNotice({ type: "warning", text: "O término do evento deve ser posterior ao início." });
      return;
    }
    setSaving(true);
    const oldActivity = { ...activity };

    const updates = {
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      due_date: formData.due_date,
      start_datetime: formData.start_datetime || null,
      end_datetime: formData.end_datetime || null,
      program_id: formData.program_id || null,
      responsible_id: formData.responsible_id || null,
      involved_ids: formData.involved_ids,
      images: formData.images,
      files: formData.files,
      is_event: formData.is_event,
      event_data: formData.is_event ? formData.event_data : {},
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from("activities").update(updates).eq("id", activity.id);
    if (!error) {
      // Log de alteração de status
      if (updates.status !== oldActivity.status) {
        await supabase.from("activity_logs").insert({
          activity_id: activity.id,
          person_id: currentUser.id,
          type: "status_change",
          content: `Status alterado de "${oldActivity.status}" para "${updates.status}".`,
          metadata: { old_status: oldActivity.status, new_status: updates.status },
        });
      }

      const changes = [];

      if (formData.title !== oldActivity.title) {
        changes.push(`Título alterado de "${oldActivity.title}" para "${formData.title}"`);
      }
      if (formData.description !== oldActivity.description) {
        changes.push(`Descrição atualizada`);
      }
      if (formData.priority !== oldActivity.priority) {
        changes.push(`Prioridade alterada de "${oldActivity.priority}" para "${formData.priority}"`);
      }
      if (formData.due_date !== oldActivity.due_date) {
        const oldDate = isDateValid(parseISO(oldActivity.due_date))
          ? format(parseISO(oldActivity.due_date), "dd/MM/yyyy")
          : oldActivity.due_date;
        const newDate = isDateValid(parseISO(formData.due_date))
          ? format(parseISO(formData.due_date), "dd/MM/yyyy")
          : formData.due_date;
        changes.push(`Data alterada de ${oldDate} para ${newDate}`);
      }
      if (formData.end_datetime !== oldActivity.end_datetime) {
        const oldEnd = oldActivity.end_datetime ? format(parseISO(oldActivity.end_datetime), "dd/MM/yyyy HH:mm") : "não definida";
        const newEnd = formData.end_datetime ? format(parseISO(formData.end_datetime), "dd/MM/yyyy HH:mm") : "não definida";
        changes.push(`Finalização prevista alterada de ${oldEnd} para ${newEnd}`);
      }
      if (formData.program_id !== oldActivity.program_id) {
        const oldProg = programs.find(p => p.id === oldActivity.program_id)?.name || "não definido";
        const newProg = programs.find(p => p.id === formData.program_id)?.name || "não definido";
        changes.push(`Programa alterado de "${oldProg}" para "${newProg}"`);
      }
      if (formData.responsible_id !== oldActivity.responsible_id) {
        const oldResp = allPersons.find(p => p.id === oldActivity.responsible_id)?.name || "não definido";
        const newResp = allPersons.find(p => p.id === formData.responsible_id)?.name || "não definido";
        changes.push(`Responsável alterado de "${oldResp}" para "${newResp}"`);
      }
      if (JSON.stringify(formData.images) !== JSON.stringify(oldActivity.images)) {
        changes.push(`Fotos anexadas atualizadas`);
      }
      if (JSON.stringify(formData.files) !== JSON.stringify(oldActivity.files)) {
        changes.push(`Arquivos anexados atualizados`);
      }

      if (changes.length > 0) {
        await supabase.from("activity_logs").insert({
          activity_id: activity.id,
          person_id: currentUser.id,
          type: "update",
          content: changes.join(". ") + ".",
          metadata: { changes },
        });
      }

      // Log de envolvidos adicionados/removidos
      const oldInvolved = oldActivity.involved_ids || [];
      const newInvolved = formData.involved_ids || [];
      const added = newInvolved.filter((pid) => !oldInvolved.includes(pid));
      const removed = oldInvolved.filter((pid) => !newInvolved.includes(pid));

      const involvementLogs = [];
      for (const pid of added) {
        const person = allPersons.find((p) => p.id === pid);
        if (person) {
          involvementLogs.push({
            activity_id: activity.id,
            person_id: pid,
            type: "involvement",
            content: `${currentUser.name} envolveu você na atividade.`,
            metadata: { involved_person_id: pid, action: "added" },
          });
        }
      }
      for (const pid of removed) {
        const person = allPersons.find((p) => p.id === pid);
        if (person) {
          involvementLogs.push({
            activity_id: activity.id,
            person_id: pid,
            type: "involvement",
            content: `${currentUser.name} removeu você dos envolvidos.`,
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
      setNotice({ type: "error", text: `Não foi possível salvar: ${error.message}` });
    }
    setSaving(false);
  }

  const handleDeleteRequest = () => {
    if (canEdit) setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    setDeleting(true);

    // Remove fotos do storage
    if (activity.images && activity.images.length > 0) {
      const paths = activity.images.map((url) => storagePath(url, "activity-attachments")).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("activity-attachments").remove(paths);
      }
    }

    // Remove arquivos do storage
    if (activity.files && activity.files.length > 0) {
      const paths = activity.files.map((file) => storagePath(file, "activity-files")).filter(Boolean);
      if (paths.length > 0) {
        await supabase.storage.from("activity-files").remove(paths);
      }
    }

    const { error } = await supabase.from("activities").delete().eq("id", activity.id);
    setDeleting(false);
    if (error) {
      setNotice({ type: "error", text: `Não foi possível excluir: ${error.message}` });
    } else {
      setShowDeleteSuccess(true);
    }
  };

  const handleWhatsAppShare = () => {
    if (!activity) return;
    const text = formatSingleActivityForWhatsAppSimple({
      title: activity.title,
      description: activity.description || "Sem descrição",
      dueDate: activity.due_date || activity.week_start,
      program: activity.programs?.name || "N/D",
      responsible: activity.persons?.name || "N/D"
    });
    shareViaWhatsApp(text);
  };

  // Função para duplicar atividade
  const handleDuplicate = () => {
    const cloneData = {
      title: activity.title,
      description: activity.description,
      program: activity.programs?.name,
      responsible: activity.persons?.name,
      priority: activity.priority,
      involvedIds: activity.involved_ids,
      is_event: activity.is_event,
      event_data: activity.event_data,
    };
    navigate("/new", { state: { clone: cloneData } });
  };

  if (loading) return <div className="text-center py-20 font-roboto">Carregando...</div>;
  if (!activity) return <div className="text-center py-20 font-roboto">Atividade não encontrada.</div>;

  const priority = activity.priority || "Média";

  return (
    <div className="max-w-4xl mx-auto mb-24 px-4 md:px-0 font-roboto">
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

      {notice && (
        <div
          role="alert"
          className={`mb-5 flex items-start gap-3 rounded-2xl border p-4 shadow-sm ${notice.type === "error" ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200"}`}
        >
          <span className="material-symbols-outlined mt-0.5 text-xl">{notice.type === "error" ? "error" : "warning"}</span>
          <p className="min-w-0 flex-1 text-sm font-medium">{notice.text}</p>
          <button type="button" onClick={() => setNotice(null)} aria-label="Fechar mensagem" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"><span className="material-symbols-outlined text-lg">close</span></button>
        </div>
      )}

      {showCancelReason && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-4">
              Justificativa de Cancelamento
            </h3>
            <textarea
              rows={4}
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Descreva o motivo do cancelamento..."
              className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg resize-none text-sm font-roboto text-on-surface dark:text-white mb-4"
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setShowCancelReason(false); setCancelReason(""); }}
                className="px-5 py-2.5 rounded-full border border-outline text-on-surface-variant font-roboto hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Voltar
              </button>
              <button
                onClick={confirmCancel}
                className="px-5 py-2.5 rounded-full bg-red-100 text-red-800 font-roboto hover:bg-red-200"
              >
                Confirmar Cancelamento
              </button>
            </div>
          </div>
        </div>
      )}

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
                {activity.persons?.is_active === false && <span className="ml-2 rounded-full bg-gray-200 px-2 py-1 text-xs font-bold text-gray-700 dark:bg-gray-700 dark:text-gray-200">Usuário desativado</span>}
              </p>
            </div>
          </div>
          {activity.end_datetime && (
            <div className="flex items-center gap-3 p-4 bg-surface dark:bg-white/5 rounded-xl md:col-span-2">
              <span className="material-symbols-outlined text-accent">schedule</span>
              <div>
                <p className="text-label-sm font-roboto text-outline dark:text-gray-400">Finalização prevista</p>
                <p className="font-roboto font-semibold text-on-surface dark:text-white">
                  {format(parseISO(activity.end_datetime), "dd 'de' MMMM, yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}
        </div>

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

        {canEdit && editMode && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="font-roboto text-label-md text-outline dark:text-gray-400">Data da atividade</label>
              <input
                type="date"
                name="due_date"
                value={formData.due_date}
                onChange={handleChange}
                className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white"
              />
            </div>
            <div>
              <label className="font-roboto text-label-md text-outline dark:text-gray-400">Início (data/hora)</label>
              <input required type="datetime-local" name="start_datetime" value={formData.start_datetime?.slice(0, 16) || ""} onChange={handleChange} className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white" />
            </div>
            <div>
              <label className="font-roboto text-label-md text-outline dark:text-gray-400">Finalização prevista (data/hora)</label>
              <input
                required
                type="datetime-local"
                name="end_datetime"
                value={formData.end_datetime?.slice(0, 16) || ""}
                onChange={handleChange}
                className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white"
              />
            </div>
          </div>
        )}

        {canEdit && editMode && formData.end_datetime && (
          <div className="mt-2 flex flex-wrap gap-2 items-center">
            <span className="font-roboto text-sm font-semibold text-primary dark:text-white">PRORROGAR FINALIZAÇÃO:</span>
            <button
              type="button"
              onClick={() => postponeEndDate(-1)}
              className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
            >
              -1 dia
            </button>
            <button
              type="button"
              onClick={() => postponeEndDate(1)}
              className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              +1 dia
            </button>
            <button
              type="button"
              onClick={() => postponeEndDate(0, -1)}
              className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
            >
              -1 semana
            </button>
            <button
              type="button"
              onClick={() => postponeEndDate(0, 1)}
              className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              +1 semana
            </button>
            <button
              type="button"
              onClick={() => postponeEndDate(0, 0, -1)}
              className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 hover:bg-red-200 transition"
            >
              -1 mês
            </button>
            <button
              type="button"
              onClick={() => postponeEndDate(0, 0, 1)}
              className="px-3 py-1 text-xs rounded-full bg-green-100 text-green-700 hover:bg-green-200 transition"
            >
              +1 mês
            </button>
          </div>
        )}

        {canEdit && editMode && (
          <div className="mt-4 space-y-3">
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-900/20">
              <input type="checkbox" checked={formData.is_event} onChange={(event) => setFormData((current) => ({ ...current, is_event: event.target.checked, event_data: event.target.checked ? normalizeEventData(current.event_data) : current.event_data }))} className="mt-1 rounded text-primary" />
              <span><strong className="block text-primary dark:text-white">Esta atividade é um evento</strong><span className="text-xs text-outline">Inclui o registro na programação institucional de eventos.</span></span>
            </label>
            {formData.is_event && <EventFields value={formData.event_data} onChange={(event_data) => setFormData((current) => ({ ...current, event_data }))} />}
          </div>
        )}

        {!editMode && activity.is_event && <EventSummary data={activity.event_data} />}

        {canEdit && editMode && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Registro Fotográfico</p>
            <PhotoUpload onUploadComplete={handlePhotosChange} existingPhotos={formData.images} />
          </div>
        )}

        {canEdit && editMode && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Registro Arquivos</p>
            <FileUpload onUploadComplete={handleFilesChange} existingFiles={formData.files} />
          </div>
        )}

        {!editMode && activity.images?.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-2">
            {activity.images.map((url, idx) => (
              <img key={idx} src={url} alt="Anexo" className="w-full h-32 object-cover rounded-lg border border-surface-variant dark:border-white/10" />
            ))}
          </div>
        )}

        {!editMode && activity.files?.length > 0 && (
          <div className="mt-4 p-4 bg-surface dark:bg-white/5 rounded-xl">
            <p className="text-label-sm font-roboto text-outline dark:text-gray-400 mb-2">Arquivos Anexados</p>
            <div className="space-y-2">
              {activity.files.map((file, idx) => (
                <a key={idx} href={file.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary hover:underline">
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  <span className="text-sm truncate">{file.name || (file.url.split('/').pop()?.replace(/^\d+-\w+-/, ''))}</span>
                </a>
              ))}
            </div>
          </div>
        )}

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
              {/* Botão Duplicar */}
              <button onClick={handleDuplicate} className="px-4 py-2 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 font-roboto text-label-sm flex items-center gap-2 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all active:scale-95 min-h-[44px]">
                <span className="material-symbols-outlined text-[18px]">content_copy</span>
                Duplicar
              </button>
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

      {canEdit && (
        <section className="mb-10">
          <h3 className="font-roboto text-label-md text-outline dark:text-gray-400 uppercase tracking-widest mb-4">Status</h3>
          <div className="flex flex-wrap gap-3">
            {["Planejado", "Em andamento", "Realizado", "Pendente", "Cancelado"].map((st) => (
              <button
                key={st}
                onClick={() => handleStatusClick(st)}
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

      {canEdit && editMode && (
        <section className="mb-10 space-y-4">
          <div>
            <label className="font-roboto text-label-md text-outline dark:text-gray-400 block mb-2">Desdobramentos / Ocorrências</label>
            <textarea
              required
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

      <section className="mt-12 rounded-3xl border border-surface-variant bg-gradient-to-br from-white via-slate-50/40 to-emerald-50/20 p-4 shadow-sm dark:border-white/10 dark:from-dark-surface dark:via-slate-950/30 dark:to-emerald-950/10 sm:p-6">
        <div className="mb-6 grid grid-cols-2 rounded-2xl border border-surface-variant bg-surface p-1.5 dark:border-white/10 dark:bg-white/5" role="tablist" aria-label="Colaboração e histórico"><button type="button" role="tab" aria-selected={collaborationTab === "comments"} onClick={() => setCollaborationTab("comments")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${collaborationTab === "comments" ? "bg-white text-blue-700 shadow-sm dark:bg-blue-950/50 dark:text-blue-300" : "text-outline hover:text-primary"}`}><span className="material-symbols-outlined icon-plain text-[19px]">forum</span>Conversa <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{logs.filter((log) => log.type === "comment" && !log.metadata?.deleted).length}</span></button><button type="button" role="tab" aria-selected={collaborationTab === "timeline"} onClick={() => setCollaborationTab("timeline")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-bold transition ${collaborationTab === "timeline" ? "bg-white text-primary shadow-sm dark:bg-emerald-950/50 dark:text-green-300" : "text-outline hover:text-primary"}`}><span className="material-symbols-outlined icon-plain text-[19px]">timeline</span>Histórico <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{logs.filter((log) => log.type !== "comment").length}</span></button></div>
        <div role="tabpanel">{collaborationTab === "comments" ? <CommentSection activityId={activity.id} logs={logs.filter((log) => log.type === "comment")} onNewComment={fetchLogs} /> : <ActivityTimeline logs={logs} />}</div>
      </section>
    </div>
  );
}

function EventSummary({ data: rawData }) {
  const data = normalizeEventData(rawData);
  const date = (value) => value ? format(parseISO(value), "dd/MM/yyyy 'às' HH:mm") : "—";
  const rows = [
    ["Tipo", data.type || "Evento"], ["Situação", data.status], ["Temática", data.theme],
    ["Período", `${date(data.start_at)} — ${date(data.end_at)}`], ["Local e formato", `${data.location || "A definir"} · ${data.format}`],
    ["Público previsto", data.audience_expected], ["Público alcançado", data.audience_reached],
    ["Parceiros", data.partners], ["Contrapartidas necessárias", data.counterparts],
    ["Contrapartidas cumpridas", data.counterparts_completed], ["Resultados esperados", data.expected_results],
    ["Resultados obtidos", data.results], ["Observações", data.notes],
  ].filter(([, value]) => value);
  return <section className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 dark:border-emerald-900 dark:bg-emerald-900/10"><div className="mb-4 flex items-center gap-3"><span className="material-symbols-outlined rounded-xl bg-primary p-2 text-white">festival</span><div><h3 className="font-bold text-primary dark:text-white">Evento institucional</h3><p className="text-xs text-outline">Informações complementares do evento</p></div></div><dl className="grid gap-3 md:grid-cols-2">{rows.map(([label, value]) => <div key={label} className="rounded-xl bg-white/70 p-3 dark:bg-white/5"><dt className="text-xs font-bold uppercase text-outline">{label}</dt><dd className="mt-1 whitespace-pre-wrap text-sm text-on-surface dark:text-gray-200">{value}</dd></div>)}</dl></section>;
}

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";
import { format, parseISO, startOfWeek, addDays, subWeeks, addWeeks, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ProgramFiles() {
  const { currentUser } = useCurrentUser();
  const [files, setFiles] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(""); // "" = Todos
  const [uploading, setUploading] = useState(false);
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Controle da semana
  const [currentMonday, setCurrentMonday] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekStart = currentMonday;
  const weekEnd = addDays(weekStart, 5);

  useEffect(() => {
    fetchPrograms();
  }, []);

  useEffect(() => {
    fetchFiles();
    const interval = setInterval(() => {
      deleteOldFiles();
      fetchFiles();
    }, 3600000);
    return () => clearInterval(interval);
  }, [selectedProgram, currentMonday]);

  async function fetchPrograms() {
    const { data } = await supabase.from("programs").select("id, name, leader_id").order("name");
    setPrograms(data || []);
  }

  async function fetchFiles() {
    let query = supabase
      .from("program_files")
      .select("*, uploader:uploader_id(name), program:program_id(name)")
      .order("created_at", { ascending: false });

    if (selectedProgram) {
      query = query.eq("program_id", selectedProgram);
    }

    const { data } = await query;
    const filtered = (data || []).filter((f) => {
      const created = parseISO(f.created_at);
      return isWithinInterval(created, { start: weekStart, end: weekEnd });
    });
    setFiles(filtered);
  }

  async function deleteOldFiles() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: oldFiles } = await supabase
      .from("program_files")
      .select("id, file_url")
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (oldFiles?.length) {
      for (const file of oldFiles) {
        const path = file.file_url.split("/").pop();
        await supabase.storage.from("program-files").remove([path]);
      }
      const ids = oldFiles.map(f => f.id);
      await supabase.from("program_files").delete().in("id", ids);
    }
  }

  // Notifica o(s) líder(es) do programa (ou todos se "Todos")
  async function notifyLeaders(programId, fileName, uploaderName) {
    if (programId) {
      // Programa específico: notifica o líder
      const { data: prog } = await supabase
        .from("programs")
        .select("leader_id")
        .eq("id", programId)
        .single();
      if (prog?.leader_id) {
        await supabase.from("activity_logs").insert({
          activity_id: null, // não vinculado a atividade
          person_id: prog.leader_id,
          type: "file",
          content: `${uploaderName} enviou um arquivo "${fileName}" para o programa.`,
        });
      }
    } else {
      // "Todos" – notifica todos os líderes de todos os programas
      const { data: leaders } = await supabase
        .from("programs")
        .select("leader_id");
      const uniqueLeaders = [...new Set((leaders || []).map(l => l.leader_id).filter(Boolean))];
      const logs = uniqueLeaders.map(leaderId => ({
        activity_id: null,
        person_id: leaderId,
        type: "file",
        content: `${uploaderName} enviou um arquivo "${fileName}" para todos os programas.`,
      }));
      if (logs.length > 0) {
        await supabase.from("activity_logs").insert(logs);
      }
    }
  }

  async function handleUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileName = `${Date.now()}-${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("program-files")
      .upload(fileName, file);

    if (uploadError) {
      setMessage({ type: "error", text: "Erro no upload." });
      setUploading(false);
      return;
    }

    const url = supabase.storage.from("program-files").getPublicUrl(fileName).data.publicUrl;
    const { error: dbError } = await supabase.from("program_files").insert({
      program_id: selectedProgram || null,
      uploader_id: currentUser?.id || null,
      name: file.name,
      description,
      file_url: url,
      file_type: file.type,
      file_size: file.size,
    });

    if (dbError) {
      setMessage({ type: "error", text: "Erro ao salvar referência." });
    } else {
      // Notifica líderes
      const uploaderName = currentUser?.name || "Alguém";
      await notifyLeaders(selectedProgram, file.name, uploaderName);

      setMessage({ type: "success", text: "Arquivo enviado!" });
      setDescription("");
      fetchFiles();
    }
    setUploading(false);
    setTimeout(() => setMessage(null), 3000);
  }

  function requestDelete(file) {
    setDeleteTarget(file);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    const path = deleteTarget.file_url.split("/").pop();
    await supabase.storage.from("program-files").remove([path]);
    await supabase.from("program_files").delete().eq("id", deleteTarget.id);
    setShowDeleteConfirm(false);
    setDeleteTarget(null);
    fetchFiles();
    setMessage({ type: "success", text: "Arquivo removido." });
    setTimeout(() => setMessage(null), 3000);
  }

  const goToPreviousWeek = () => setCurrentMonday(subWeeks(currentMonday, 1));
  const goToNextWeek = () => setCurrentMonday(addWeeks(currentMonday, 1));
  const goToCurrentWeek = () => setCurrentMonday(startOfWeek(new Date(), { weekStartsOn: 1 }));

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">Repositório de Arquivos</h2>

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

      <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
          <input
            type="text"
            placeholder="Descrição do arquivo"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto"
          />
        </div>
        <div className="flex justify-end">
          <label className="bg-accent/10 text-primary dark:text-white font-roboto text-label-sm px-4 py-2 rounded-full flex items-center gap-2 hover:bg-accent/20 transition-all active:scale-95 min-h-[44px] cursor-pointer">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            {uploading ? "Enviando..." : "Escolher arquivo"}
            <input type="file" onChange={handleUpload} disabled={uploading} className="hidden" />
          </label>
        </div>
        {message && (
          <div className={`mt-4 p-3 rounded-xl ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {message.text}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {files.length === 0 ? (
          <p className="text-on-surface-variant dark:text-gray-400">Nenhum arquivo nesta semana.</p>
        ) : (
          files.map((f) => (
            <div key={f.id} className="bg-white dark:bg-dark-surface border border-surface-variant dark:border-white/10 rounded-xl p-4 flex justify-between items-center">
              <div className="flex-1">
                <a href={f.file_url} target="_blank" rel="noreferrer" className="font-roboto font-semibold text-primary dark:text-white hover:underline">
                  {f.name}
                </a>
                <p className="text-sm text-on-surface-variant dark:text-gray-400">{f.description}</p>
                <p className="text-xs text-outline dark:text-gray-500">
                  {f.uploader?.name} • {format(parseISO(f.created_at), "dd/MM/yyyy")}
                  {f.program ? ` • ${f.program.name}` : " • Todos os programas"}
                </p>
              </div>
              <button
                onClick={() => requestDelete(f)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full ml-2"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="bg-white dark:bg-dark-surface rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="font-epilogue text-lg font-semibold text-primary dark:text-white mb-4">Excluir arquivo</h3>
            <p className="text-on-surface-variant dark:text-gray-300 mb-6">Tem certeza que deseja excluir "{deleteTarget?.name}"?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="px-5 py-2.5 rounded-full border border-outline text-on-surface-variant font-roboto hover:bg-gray-100 dark:hover:bg-white/10">Cancelar</button>
              <button onClick={handleDeleteConfirm} className="px-5 py-2.5 rounded-full bg-red-100 text-red-800 font-roboto hover:bg-red-200">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
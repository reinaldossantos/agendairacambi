import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { signedUrl, storagePath } from "../../lib/privateStorage";

export default function FileUpload({
  onUploadComplete,
  existingFiles = [],
  accept = ".pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.ppt,.pptx",
}) {
  const [files, setFiles] = useState(existingFiles);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleFileSelect = async (e) => {
    const fileList = Array.from(e.target.files || []);
    e.target.value = "";
    if (!fileList.length) return;
    setUploading(true);
    setUploadStatus({
      type: "info",
      message: `Enviando ${fileList.length} arquivo(s)...`,
    });

    const uploadedFiles = [];
    const failures = [];

    for (const file of fileList) {
      if (file.size > 20 * 1024 * 1024) {
        failures.push(`${file.name} ultrapassa o limite de 20 MB.`);
        continue;
      }
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const { data: authData } = await supabase.auth.getUser();
      const owner = authData.user?.id || "authenticated";
      const fileName = `${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;

      console.log("Enviando arquivo:", fileName);

      const { error } = await supabase.storage
        .from("activity-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Erro no upload:", error);
        failures.push(`${file.name}: ${error.message}`);
        continue;
      }

      const url = await signedUrl("activity-files", fileName);
      uploadedFiles.push({
        url,
        path: fileName,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    if (uploadedFiles.length > 0) {
      const updatedFiles = [...files, ...uploadedFiles];
      setFiles(updatedFiles);
      if (onUploadComplete) onUploadComplete(updatedFiles, { uploadedPaths: uploadedFiles.map((file) => file.path) });
      setUploadStatus(failures.length ? { type: "error", message: `${uploadedFiles.length} enviado(s). ${failures.join(" ")}` } : { type: "success", message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!` });
    } else {
      setUploadStatus({
        type: "error",
        message:
          failures.join(" ") || "Falha ao enviar arquivos. Verifique as permissões do bucket.",
      });
    }

    setTimeout(() => setUploadStatus({ type: "", message: "" }), 4000);
    setUploading(false);
  };

  const removeFile = async (index) => {
    const fileToRemove = files[index];
    if (fileToRemove?.url || fileToRemove?.path) {
      const path = storagePath(fileToRemove, "activity-files");
      if (path) {
        const { error } = await supabase.storage
          .from("activity-files")
          .remove([path]);
        if (error) console.error("Erro ao remover arquivo do storage:", error);
      }
    }
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    if (onUploadComplete) onUploadComplete(updated);
    setUploadStatus({
      type: "success",
      message: "Arquivo removido com sucesso!",
    });
    setTimeout(() => setUploadStatus({ type: "", message: "" }), 2000);
  };

  const getFileIcon = (filename) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "image";
    if (["pdf"].includes(ext)) return "picture_as_pdf";
    if (["doc", "docx"].includes(ext)) return "description";
    if (["xls", "xlsx"].includes(ext)) return "table_chart";
    if (["zip", "rar", "7z"].includes(ext)) return "folder_zip";
    if (["txt"].includes(ext)) return "article";
    return "attach_file";
  };

  return (
    <div className="space-y-3">
      <label className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 font-roboto text-label-sm transition focus-within:ring-2 focus-within:ring-blue-500 ${uploading ? "cursor-wait border-surface-variant bg-surface text-outline" : "border-blue-200 bg-white text-blue-700 hover:border-blue-400 hover:bg-blue-50 dark:border-blue-900 dark:bg-white/5 dark:text-blue-300"}`}>
        <span className="material-symbols-outlined text-[20px]">
          attach_file
        </span>
        {uploading
          ? "Enviando..."
          : `Adicionar arquivos (${accept.split(",").join(", ")})`}
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>

      {uploadStatus.message && (
        <div
          className={`text-xs p-2 rounded ${uploadStatus.type === "error" ? "bg-red-100 text-red-700" : uploadStatus.type === "success" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}`}
        >
          {uploadStatus.message}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2 mt-2">
          {files.map((file, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between bg-surface dark:bg-dark-background rounded-lg p-2 border border-surface-variant dark:border-white/10"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="material-symbols-outlined text-primary text-[20px]">
                  {getFileIcon(file.name)}
                </span>
                <div className="flex-1 min-w-0">
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary dark:text-white text-sm font-roboto truncate block hover:underline"
                  >
                    {file.name}
                  </a>
                  {file.size && (
                    <span className="text-[10px] text-outline">
                      {formatFileSize(file.size)}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(idx)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full min-w-[32px] min-h-[32px] flex items-center justify-center"
                title="Remover arquivo"
              >
                <span className="material-symbols-outlined text-sm">
                  delete
                </span>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

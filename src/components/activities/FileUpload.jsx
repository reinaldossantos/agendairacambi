import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

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
    const fileList = Array.from(e.target.files);
    if (!fileList.length) return;
    setUploading(true);
    setUploadStatus({
      type: "info",
      message: `Enviando ${fileList.length} arquivo(s)...`,
    });

    const uploadedFiles = [];

    for (const file of fileList) {
      // Gera nome único mantendo a extensão
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`;

      console.log("Enviando arquivo:", fileName);

      const { error, data } = await supabase.storage
        .from("activity-files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Erro no upload:", error);
        setUploadStatus({
          type: "error",
          message: `Erro ao enviar ${file.name}: ${error.message}`,
        });
        continue;
      }

      const url = supabase.storage.from("activity-files").getPublicUrl(fileName)
        .data.publicUrl;
      uploadedFiles.push({
        url: url,
        name: file.name,
        size: file.size,
        type: file.type,
      });
    }

    if (uploadedFiles.length > 0) {
      const updatedFiles = [...files, ...uploadedFiles];
      setFiles(updatedFiles);
      if (onUploadComplete) onUploadComplete(updatedFiles);
      setUploadStatus({
        type: "success",
        message: `${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`,
      });
    } else {
      setUploadStatus({
        type: "error",
        message:
          "Falha ao enviar arquivos. Verifique o console e as permissões do bucket.",
      });
    }

    setTimeout(() => setUploadStatus({ type: "", message: "" }), 4000);
    setUploading(false);
  };

  const removeFile = async (index) => {
    const fileToRemove = files[index];
    if (fileToRemove?.url) {
      const path = fileToRemove.url.split("/").pop();
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
      <label className="font-roboto text-label-sm text-outline dark:text-gray-400 flex items-center gap-2 cursor-pointer">
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

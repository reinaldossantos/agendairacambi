import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";
import { signedUrl, storagePath } from "../../lib/privateStorage";

export default function PhotoUpload({ onUploadComplete, existingPhotos = [] }) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setUploading(true);
    setUploadStatus({ type: "info", message: "Enviando fotos..." });

    const uploadedUrls = [];
    const failures = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        failures.push(`${file.name} não é uma imagem válida.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        failures.push(`${file.name} ultrapassa o limite de 10 MB.`);
        continue;
      }
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const { data: authData } = await supabase.auth.getUser();
      const owner = authData.user?.id || "authenticated";
      const filePath = `${owner}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
      const { error } = await supabase.storage.from("activity-attachments").upload(filePath, file, { cacheControl: "3600", contentType: file.type, upsert: false });

      if (error) {
        console.error("Erro no upload:", error);
        failures.push(`${file.name}: ${error.message}`);
        continue;
      }

      const url = await signedUrl("activity-attachments", filePath);
      uploadedUrls.push(url);
    }

    const updatedPhotos = [...photos, ...uploadedUrls];
    setPhotos(updatedPhotos);
    if (onUploadComplete) onUploadComplete(updatedPhotos, { uploadedPaths: uploadedUrls.map((url) => storagePath(url, "activity-attachments")).filter(Boolean) });
    setUploadStatus(failures.length ? { type: "error", message: `${uploadedUrls.length} enviada(s). ${failures.join(" ")}` } : { type: "success", message: `${uploadedUrls.length} foto(s) enviada(s) com sucesso.` });
    setTimeout(() => setUploadStatus({ type: "", message: "" }), 3000);
    setUploading(false);
  };

  const removePhoto = async (index) => {
    const urlToRemove = photos[index];
    if (urlToRemove) {
      const path = storagePath(urlToRemove, "activity-attachments");
      if (path) {
        const { error } = await supabase.storage
          .from("activity-attachments")
          .remove([path]);
        if (error) console.error("Erro ao remover foto do storage:", error);
      }
    }
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (onUploadComplete) onUploadComplete(updated);
  };

  const getFileName = (url) => {
    try {
      const decoded = decodeURIComponent(url.split("/").pop() || "");
      return decoded.replace(/^\d+-\w+-/, "");
    } catch {
      return "foto";
    }
  };

  return (
    <div className="space-y-3">
      <label className={`flex min-h-12 w-full cursor-pointer items-center gap-3 rounded-xl border px-3 py-2 font-roboto text-label-sm transition focus-within:ring-2 focus-within:ring-primary ${uploading ? "cursor-wait border-surface-variant bg-surface text-outline" : "border-emerald-200 bg-white text-primary hover:border-emerald-400 hover:bg-emerald-50 dark:border-emerald-900 dark:bg-white/5 dark:text-emerald-300"}`}>
        <span className="material-symbols-outlined text-[20px]">add_a_photo</span>
        {uploading ? "Enviando..." : "Adicionar fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          disabled={uploading}
          className="hidden"
        />
      </label>
      {uploadStatus.message && (
        <div className={`text-xs ${uploadStatus.type === "error" ? "text-red-500" : "text-green-600"}`}>
          {uploadStatus.message}
        </div>
      )}
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((url, idx) => (
            <div key={idx} className="relative group">
              <img
                src={url}
                alt="Anexo"
                className="w-full h-24 object-cover rounded-lg border border-surface-variant dark:border-white/10"
              />
              <button
                type="button"
                onClick={() => removePhoto(idx)}
                aria-label={`Remover ${getFileName(url)}`}
                title="Remover foto"
                className="absolute right-1 top-1 flex min-h-9 min-w-9 items-center justify-center rounded-full bg-white/95 text-red-600 shadow-md transition hover:scale-105 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500 dark:bg-gray-900/95 dark:text-red-400"
              >
                <span className="material-symbols-outlined text-[19px]">delete</span>
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 truncate rounded-b-lg">
                {getFileName(url)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

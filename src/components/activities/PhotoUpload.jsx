import { useState } from "react";
import { supabase } from "../../lib/supabaseClient";

export default function PhotoUpload({ onUploadComplete, existingPhotos = [] }) {
  const [photos, setPhotos] = useState(existingPhotos);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState({ type: "", message: "" });

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    setUploadStatus({ type: "info", message: "Enviando fotos..." });

    const uploadedUrls = [];

    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}-${file.name}`;
      const { error } = await supabase.storage
        .from("activity-attachments")
        .upload(fileName, file);

      if (error) {
        console.error("Erro no upload:", error);
        setUploadStatus({ type: "error", message: `Erro ao enviar ${file.name}` });
        continue;
      }

      const url = supabase.storage.from("activity-attachments").getPublicUrl(fileName).data.publicUrl;
      uploadedUrls.push(url);
    }

    const updatedPhotos = [...photos, ...uploadedUrls];
    setPhotos(updatedPhotos);
    if (onUploadComplete) onUploadComplete(updatedPhotos);
    setUploadStatus({ type: "success", message: `${uploadedUrls.length} foto(s) enviada(s)` });
    setTimeout(() => setUploadStatus({ type: "", message: "" }), 3000);
    setUploading(false);
  };

  const removePhoto = async (index) => {
    const urlToRemove = photos[index];
    if (urlToRemove) {
      const path = urlToRemove.split("/").pop();
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
      <label className="font-roboto text-label-sm text-outline dark:text-gray-400 flex items-center gap-2 cursor-pointer">
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
                onClick={() => removePhoto(idx)}
                className="absolute top-1 right-1 p-1 bg-black/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">close</span>
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
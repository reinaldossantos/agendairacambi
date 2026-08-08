import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCurrentUser } from "../context/CurrentUserContext";
import { supabase } from "../lib/supabaseClient";
import { useTranslationSettings } from "../context/TranslationSettingsContext";

export default function Settings() {
  const { dark, toggleDark } = useTheme();
  const { currentUser, refreshProfile } = useCurrentUser();
  const { automaticTranslationEnabled, loading: translationLoading, saving: translationSaving, message: translationMessage, updateAutomaticTranslation } = useTranslationSettings();
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState({ type: "", text: "" });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const authenticated = currentUser?.access_role === "admin";
  const [error, setError] = useState("");
  // Configurações dos modos de lançamento
  const [whatsappEnabled, setWhatsappEnabled] = useState(() => {
    return localStorage.getItem("iracambi_mode_whatsapp") !== "false";
  });
  const [quickEnabled, setQuickEnabled] = useState(() => {
    return localStorage.getItem("iracambi_mode_quick") !== "false";
  });

  const handleAuth = () => setError("Esta seção exige uma conta com perfil administrador.");

  const toggleWhatsapp = () => {
    const newValue = !whatsappEnabled;
    setWhatsappEnabled(newValue);
    localStorage.setItem("iracambi_mode_whatsapp", newValue.toString());
  };

  const toggleQuick = () => {
    const newValue = !quickEnabled;
    setQuickEnabled(newValue);
    localStorage.setItem("iracambi_mode_quick", newValue.toString());
  };

  async function uploadAvatar(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || !currentUser?.id) return;
    if (!["image/jpeg", "image/jfif", "image/png", "image/webp"].includes(file.type) && !file.name.toLowerCase().endsWith(".jfif")) {
      setAvatarMessage({ type: "error", text: "Selecione uma imagem JPG, JFIF, PNG ou WebP." });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarMessage({ type: "error", text: "A foto deve ter no máximo 5 MB." });
      return;
    }
    setUploadingAvatar(true);
    setAvatarMessage({ type: "", text: "" });
    const path = `${currentUser.id}/avatar`;
    const contentType = file.name.toLowerCase().endsWith(".jfif") ? "image/jpeg" : file.type;
    const { error: uploadError } = await supabase.storage.from("profile-photos").upload(path, file, { upsert: true, contentType, cacheControl: "3600" });
    if (uploadError) {
      setUploadingAvatar(false);
      setAvatarMessage({ type: "error", text: `Não foi possível enviar a foto: ${uploadError.message}` });
      return;
    }
    const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
    const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
    const { error: updateError } = await supabase.from("persons").update({ avatar_url: avatarUrl }).eq("id", currentUser.id);
    setUploadingAvatar(false);
    if (updateError) {
      setAvatarMessage({ type: "error", text: `A foto foi enviada, mas o perfil não foi atualizado: ${updateError.message}` });
      return;
    }
    await refreshProfile();
    setAvatarMessage({ type: "success", text: "Foto de perfil atualizada com sucesso." });
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">
        Configurações
      </h2>

      <div className="mb-6 rounded-xl border border-surface-variant bg-white p-6 dark:border-white/10 dark:bg-dark-surface">
        <div className="flex flex-col items-center gap-4 sm:flex-row">
          <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-green-100 text-primary dark:bg-green-900/40 dark:text-green-300">{currentUser?.avatar_url ? <img src={currentUser.avatar_url} alt={`Foto de ${currentUser.name}`} className="h-full w-full object-cover" /> : <span className="material-symbols-outlined text-5xl">account_circle</span>}</div>
          <div className="flex-1 text-center sm:text-left"><h3 className="font-bold text-primary dark:text-white">Foto de perfil</h3><p className="mb-3 text-sm text-on-surface-variant dark:text-gray-400">Envie uma imagem JPG, JFIF, PNG ou WebP de até 5 MB.</p><label className={`inline-flex cursor-pointer items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white ${uploadingAvatar ? "pointer-events-none opacity-60" : ""}`}><span className={`material-symbols-outlined text-[19px] ${uploadingAvatar ? "animate-spin" : ""}`}>{uploadingAvatar ? "progress_activity" : "add_a_photo"}</span>{uploadingAvatar ? "Enviando…" : currentUser?.avatar_url ? "Trocar foto" : "Adicionar foto"}<input type="file" accept="image/jpeg,image/jfif,image/png,image/webp,.jfif" onChange={uploadAvatar} className="hidden" disabled={uploadingAvatar} /></label></div>
        </div>
        {avatarMessage.text && <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${avatarMessage.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{avatarMessage.text}</p>}
      </div>

      {/* Modo escuro */}
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-roboto text-label-md text-primary dark:text-white">
              Modo escuro
            </p>
            <p className="text-sm text-on-surface-variant dark:text-gray-400">
              Ativar o tema escuro para leitura noturna.
            </p>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-6 rounded-full transition-colors ${
              dark ? "bg-primary" : "bg-stone-300"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                dark ? "translate-x-6" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {currentUser?.access_role === "admin" && <div className="mb-6 rounded-xl border border-surface-variant bg-white p-6 dark:border-white/10 dark:bg-dark-surface">
        <div className="flex items-start justify-between gap-5">
          <div className="flex gap-3">
            <span className="material-symbols-outlined rounded-xl bg-blue-100 p-2 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">translate</span>
            <div>
              <p className="font-roboto text-label-md font-bold text-primary dark:text-white">Tradução geral automática</p>
              <p className="mt-1 text-sm text-on-surface-variant dark:text-gray-400">Quando desabilitada, o sistema utiliza somente as traduções convencionais dos menus e da interface.</p>
              <p className="mt-2 text-xs text-outline">A habilitação futura exige o Azure Translator configurado no Supabase. Desligado, este recurso não realiza chamadas externas nem processa o conteúdo da página.</p>
              <p className={`mt-2 text-xs font-bold ${automaticTranslationEnabled ? "text-green-700 dark:text-green-300" : "text-outline"}`}>{automaticTranslationEnabled ? "Habilitada para todos os usuários" : "Desabilitada — padrão atual"}</p>
            </div>
          </div>
          <button type="button" role="switch" aria-checked={automaticTranslationEnabled} aria-label="Ativar ou desativar tradução geral automática" disabled={translationLoading || translationSaving} onClick={() => updateAutomaticTranslation(!automaticTranslationEnabled)} className={`relative h-7 w-14 shrink-0 rounded-full transition-colors disabled:cursor-wait disabled:opacity-50 ${automaticTranslationEnabled ? "bg-primary" : "bg-stone-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${automaticTranslationEnabled ? "translate-x-8" : "translate-x-1"}`} /></button>
        </div>
        {translationMessage && <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${translationMessage.startsWith("Não") ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{translationMessage}</p>}
      </div>}

      {/* Acesso às configurações avançadas */}
      {!authenticated ? (
        <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between font-roboto text-label-md text-primary dark:text-white"
          >
            <span>Configurações Avançadas</span>
            <span className="material-symbols-outlined">
              {showAdvanced ? "expand_less" : "expand_more"}
            </span>
          </button>

          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-on-surface-variant dark:text-gray-400">
                Esta seção é restrita. Faça login como <strong>Reinaldo</strong> e
                informe a senha.
              </p>
              <input
                type="password"
                placeholder="Senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-sm font-roboto text-on-surface dark:text-white"
              />
              {error && (
                <p className="text-red-500 text-sm font-roboto">{error}</p>
              )}
              <button
                onClick={handleAuth}
                className="px-6 py-2 rounded-full bg-accent text-primary font-roboto text-label-md hover:bg-yellow-400 transition-all active:scale-95"
              >
                Acessar
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 space-y-6">
          <p className="font-roboto text-label-md text-primary dark:text-white">
            Configurações Avançadas
          </p>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-roboto text-sm text-primary dark:text-white">
                Modo WhatsApp
              </p>
              <p className="text-xs text-on-surface-variant dark:text-gray-400">
                {whatsappEnabled ? "Habilitado" : "Desabilitado"}
              </p>
            </div>
            <button
              onClick={toggleWhatsapp}
              className={`w-12 h-6 rounded-full transition-colors ${
                whatsappEnabled ? "bg-primary" : "bg-stone-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  whatsappEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-roboto text-sm text-primary dark:text-white">
                Modo Rápido
              </p>
              <p className="text-xs text-on-surface-variant dark:text-gray-400">
                {quickEnabled ? "Habilitado" : "Desabilitado"}
              </p>
            </div>
            <button
              onClick={toggleQuick}
              className={`w-12 h-6 rounded-full transition-colors ${
                quickEnabled ? "bg-primary" : "bg-stone-300"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${
                  quickEnabled ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <p className="text-xs text-outline dark:text-gray-500 mt-4">
            As alterações são salvas automaticamente e aplicadas a todos os
            usuários.
          </p>
        </div>
      )}
    </div>
  );
}

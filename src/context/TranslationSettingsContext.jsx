/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const TranslationSettingsContext = createContext(null);
const localKey = "iracambi_automatic_translation_enabled";

export function TranslationSettingsProvider({ children }) {
  const [automaticTranslationEnabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const loadSetting = useCallback(async () => {
    const { data, error } = await supabase.from("app_settings").select("value").eq("key", "translation_settings").maybeSingle();
    if (error) {
      setEnabled(localStorage.getItem(localKey) === "true");
    } else {
      const enabled = data?.value?.automatic_translation_enabled === true;
      setEnabled(enabled);
      localStorage.setItem(localKey, String(enabled));
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(loadSetting, 0);
    return () => window.clearTimeout(timer);
  }, [loadSetting]);

  async function updateAutomaticTranslation(enabled) {
    setSaving(true);
    setMessage("");
    const { error } = await supabase.rpc("set_automatic_translation_enabled", { enabled });
    setSaving(false);
    if (error) {
      setMessage(`Não foi possível alterar a tradução automática: ${error.message}`);
      return false;
    }
    setEnabled(enabled);
    localStorage.setItem(localKey, String(enabled));
    setMessage(enabled ? "Tradução automática habilitada para todos os usuários." : "Tradução automática desabilitada. Somente as traduções convencionais permanecem ativas.");
    return true;
  }

  return <TranslationSettingsContext.Provider value={{ automaticTranslationEnabled, loading, saving, message, updateAutomaticTranslation }}>
    {children}
  </TranslationSettingsContext.Provider>;
}

export function useTranslationSettings() {
  const context = useContext(TranslationSettingsContext);
  if (!context) throw new Error("useTranslationSettings deve ser usado dentro de TranslationSettingsProvider");
  return context;
}

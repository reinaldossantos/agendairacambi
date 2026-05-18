import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const AdvancedSettingsContext = createContext();

export function AdvancedSettingsProvider({ children }) {
  const [modes, setModes] = useState({ wpp: true, quick: true });
  const [loaded, setLoaded] = useState(false);

  // Carrega configurações do banco ao montar
  useEffect(() => {
    async function loadSettings() {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("key", "launch_modes")
        .single();

      if (data?.value) {
        setModes(data.value);
      }
      setLoaded(true);
    }
    loadSettings();
  }, []);

  const toggleMode = async (mode) => {
    const newModes = { ...modes, [mode]: !modes[mode] };
    setModes(newModes);

    // Salva no banco
    await supabase
      .from("app_settings")
      .upsert({ key: "launch_modes", value: newModes }, { onConflict: "key" });
  };

  // Só renderiza os filhos depois que as configurações foram carregadas
  if (!loaded) {
    return <div className="flex items-center justify-center h-screen">Carregando configurações...</div>;
  }

  return (
    <AdvancedSettingsContext.Provider value={{ modes, toggleMode }}>
      {children}
    </AdvancedSettingsContext.Provider>
  );
}

export function useAdvancedSettings() {
  return useContext(AdvancedSettingsContext);
}
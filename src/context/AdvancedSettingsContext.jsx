import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const AdvancedSettingsContext = createContext();

export function AdvancedSettingsProvider({ children }) {
  const [modes, setModes] = useState({ wpp: true, quick: true });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const { data, error } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", "launch_modes")
          .single();

        if (error) throw error;
        if (data?.value) {
          console.log("Configurações carregadas do banco:", data.value);
          setModes(data.value);
        }
      } catch (err) {
        console.warn("Usando configurações padrão (banco indisponível).", err);
      } finally {
        setLoaded(true);
      }
    }
    loadSettings();
  }, []);

  const toggleMode = async (mode) => {
    const newModes = { ...modes, [mode]: !modes[mode] };
    setModes(newModes);
    console.log("Salvando novas configurações:", newModes);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "launch_modes", value: newModes }, { onConflict: "key" });

      if (error) throw error;
      console.log("Configurações salvas com sucesso!");
    } catch (err) {
      console.warn("Não foi possível salvar a configuração no banco.", err);
    }
  };

  if (!loaded) {
    return (
      <div className="flex items-center justify-center h-screen text-on-surface dark:text-gray-200">
        Carregando configurações...
      </div>
    );
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
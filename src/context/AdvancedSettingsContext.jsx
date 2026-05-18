import { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

const AdvancedSettingsContext = createContext();

export function AdvancedSettingsProvider({ children }) {
  const [modes, setModes] = useState(null);
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
          setModes(data.value);
          localStorage.setItem("iracambi_launch_modes", JSON.stringify(data.value));
        }
      } catch (err) {
        console.warn("Banco indisponível, usando localStorage.", err);
        const local = localStorage.getItem("iracambi_launch_modes");
        setModes(local ? JSON.parse(local) : { wpp: true, quick: true });
      } finally {
        setLoaded(true);
      }
    }
    loadSettings();
  }, []);

  const toggleMode = async (mode) => {
    const newModes = { ...modes, [mode]: !modes[mode] };
    setModes(newModes);
    localStorage.setItem("iracambi_launch_modes", JSON.stringify(newModes));

    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert({ key: "launch_modes", value: newModes }, { onConflict: "key" });

      if (error) {
        console.warn("Erro ao salvar no banco, mas localStorage foi atualizado.", error);
      }
    } catch (err) {
      console.warn("Erro ao salvar no banco, mas localStorage foi atualizado.", err);
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
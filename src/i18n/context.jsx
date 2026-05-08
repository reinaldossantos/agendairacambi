import { createContext, useState, useEffect, useContext, useCallback } from "react";

const LanguageContext = createContext();

const loadMessages = async (locale) => {
  try {
    const module = await import(`./translations/${locale}.json`);
    return module.default;
  } catch (error) {
    console.error(`Erro ao carregar tradução para ${locale}`, error);
    const fallback = await import("./translations/pt.json");
    return fallback.default;
  }
};

export function LanguageProvider({ children }) {
  const [locale, setLocale] = useState(() => {
    return localStorage.getItem("iracambi_locale") || "pt";
  });
  const [messages, setMessages] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMessages(locale).then((msgs) => {
      setMessages(msgs);
      setLoading(false);
    });
  }, [locale]);

  const changeLocale = useCallback((newLocale) => {
    if (newLocale === locale) return;
    setLocale(newLocale);
    localStorage.setItem("iracambi_locale", newLocale);
    setLoading(true);
  }, [locale]);

  const t = useCallback((key, replacements = {}) => {
    if (!key) return "";
    const keys = key.split(".");
    let value = messages;
    for (const k of keys) {
      if (value && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    if (typeof value === "string") {
      return Object.keys(replacements).reduce((str, rk) => {
        return str.replace(`{${rk}}`, replacements[rk]);
      }, value);
    }
    return key;
  }, [messages]);

  const formatDateLocalized = useCallback((date, options = {}) => {
    if (!date) return "";
    const localeMap = { pt: "pt-BR", en: "en-US", es: "es-ES" };
    const dateObj = date instanceof Date ? date : new Date(date);
    return new Intl.DateTimeFormat(localeMap[locale] || "pt-BR", options).format(dateObj);
  }, [locale]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Carregando...</div>;
  }

  return (
    <LanguageContext.Provider value={{ locale, changeLocale, t, formatDateLocalized }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage deve ser usado dentro de um LanguageProvider");
  }
  return context;
}
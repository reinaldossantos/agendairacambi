/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext(null);
const THEME_STORAGE_KEY = "iracambi_theme_v2";

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
    localStorage.removeItem("iracambi_dark");
  }, [dark]);

  const toggleDark = () => setDark((value) => !value);

  return (
    <ThemeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

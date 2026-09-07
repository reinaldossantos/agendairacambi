import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { CurrentUserProvider } from "./context/CurrentUserContext";
import { ThemeProvider } from "./context/ThemeContext";
import { LanguageProvider } from "./i18n/context";
import AutomaticTranslationLayer from "./i18n/AutomaticTranslationLayer";
import { AdvancedSettingsProvider } from "./context/AdvancedSettingsContext";
import { TranslationSettingsProvider } from "./context/TranslationSettingsContext";
import { registerSW } from "virtual:pwa-register";
import "./index.css";

const updateSW = registerSW({
  immediate: true,
  onNeedRefresh() {
    updateSW(true);
  },
  onRegisteredSW(_serviceWorkerUrl, registration) {
    if (!registration) return;
    const checkForUpdate = () => registration.update().catch(() => undefined);
    window.setInterval(checkForUpdate, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") checkForUpdate();
    });
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <CurrentUserProvider>
        <ThemeProvider>
          <AdvancedSettingsProvider>
            <TranslationSettingsProvider>
              <BrowserRouter>
                <AutomaticTranslationLayer />
                <App />
              </BrowserRouter>
            </TranslationSettingsProvider>
          </AdvancedSettingsProvider>
        </ThemeProvider>
      </CurrentUserProvider>
    </LanguageProvider>
  </React.StrictMode>
);

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
import "./index.css";

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

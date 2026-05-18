import { useState } from "react";
import { useTheme } from "../context/ThemeContext";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function Settings() {
  const { dark, toggleDark } = useTheme();
  const { currentUser } = useCurrentUser();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  // Configurações dos modos de lançamento
  const [whatsappEnabled, setWhatsappEnabled] = useState(() => {
    return localStorage.getItem("iracambi_mode_whatsapp") !== "false";
  });
  const [quickEnabled, setQuickEnabled] = useState(() => {
    return localStorage.getItem("iracambi_mode_quick") !== "false";
  });

  const handleAuth = () => {
    if (
      currentUser?.name === "Reinaldo" &&
      password === "Iracamb!2026"
    ) {
      setAuthenticated(true);
      setError("");
      setPassword("");
    } else {
      setError("Usuário ou senha inválidos.");
    }
  };

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

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">
        Configurações
      </h2>

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
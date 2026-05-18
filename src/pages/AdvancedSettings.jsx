import { useState } from "react";
import { useAdvancedSettings } from "../context/AdvancedSettingsContext";

export default function AdvancedSettings() {
  const { modes, toggleMode } = useAdvancedSettings();
  const [authenticated, setAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (username === "Reinaldo" && password === "Iracamb!2026") {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Usuário ou senha incorretos.");
    }
  };

  const handleResetLocal = () => {
    localStorage.removeItem("iracambi_launch_modes");
    window.location.reload();
  };

  if (!authenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 px-4">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6 text-center">
          Configurações Avançadas
        </h2>
        <form onSubmit={handleLogin} className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 space-y-4">
          <input
            type="text"
            placeholder="Usuário"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto"
          />
          <input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-on-surface dark:text-white font-roboto"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 rounded-full bg-accent text-primary font-bold font-roboto hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px]"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 mt-10">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">
        Configurações Avançadas
      </h2>
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-roboto text-label-md text-primary dark:text-white">Modo WhatsApp</p>
            <p className="text-sm text-on-surface-variant dark:text-gray-400">Habilitar o lançamento via texto (WhatsApp).</p>
          </div>
          <button
            onClick={() => toggleMode("wpp")}
            className={`w-12 h-6 rounded-full transition-colors ${modes.wpp ? "bg-primary" : "bg-stone-300"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${modes.wpp ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="font-roboto text-label-md text-primary dark:text-white">Modo Rápido</p>
            <p className="text-sm text-on-surface-variant dark:text-gray-400">Habilitar o lançamento rápido (manual).</p>
          </div>
          <button
            onClick={() => toggleMode("quick")}
            className={`w-12 h-6 rounded-full transition-colors ${modes.quick ? "bg-primary" : "bg-stone-300"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${modes.quick ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div className="pt-4 border-t border-surface-variant dark:border-white/10">
          <button
            onClick={handleResetLocal}
            className="px-4 py-2 rounded-full bg-red-100 text-red-700 font-roboto text-label-sm hover:bg-red-200 transition-all active:scale-95 min-h-[44px]"
          >
            Resetar configurações locais
          </button>
          <p className="text-xs text-outline dark:text-gray-400 mt-2">
            Se as alterações não estão sendo salvas no banco, clique aqui para limpar o cache local e recarregar.
          </p>
        </div>
        <p className="text-sm text-outline dark:text-gray-400">
          As alterações são salvas automaticamente no banco e no navegador.
        </p>
      </div>
    </div>
  );
}
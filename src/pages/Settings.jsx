import { useTheme } from "../context/ThemeContext";

export default function Settings() {
  const { dark, toggleDark } = useTheme();

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">Configurações</h2>
      <div className="bg-white dark:bg-dark-surface rounded-xl border border-surface-variant dark:border-white/10 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-roboto text-label-md text-primary dark:text-white">Modo escuro</p>
            <p className="text-sm text-on-surface-variant dark:text-gray-400">Ativar o tema escuro para leitura noturna.</p>
          </div>
          <button
            onClick={toggleDark}
            className={`w-12 h-6 rounded-full transition-colors ${dark ? "bg-primary" : "bg-stone-300"}`}
          >
            <div className={`w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform ${dark ? "translate-x-6" : "translate-x-0.5"}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
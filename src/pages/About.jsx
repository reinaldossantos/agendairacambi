import { useState } from "react";
import { Link } from "react-router-dom";

const sections = [
  // ... (conteúdo existente, sem alterações)
];

export default function About() {
  const [openSection, setOpenSection] = useState(null);

  const toggleSection = (id) => { setOpenSection(openSection === id ? null : id); };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <div className="mb-8">
        <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-2">
          Manual do AGENDA IRACAMBI
        </h2>
        <p className="font-roboto text-on-surface-variant dark:text-gray-400">
          Um guia rápido para todas as funcionalidades.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-white/5 border border-surface-variant dark:border-white/10 rounded-xl overflow-hidden">
            <button onClick={() => toggleSection(section.id)} className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-surface dark:hover:bg-white/5 transition-colors">
              <span className="font-roboto text-headline-md text-primary dark:text-white">{section.title}</span>
              <span className={`material-symbols-outlined text-outline dark:text-gray-400 transition-transform duration-300 ${openSection === section.id ? "rotate-180" : ""}`}>expand_more</span>
            </button>
            {openSection === section.id && (
              <div className="px-6 pb-6 font-roboto text-body-md text-on-surface dark:text-gray-200 leading-relaxed">
                {section.content}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-label-sm text-outline dark:text-gray-500">🌱 Colegiado IRACAMBI®</p>
        <Link to="/" className="inline-block mt-4 px-6 py-2 rounded-full bg-accent text-primary font-roboto text-label-md hover:bg-yellow-400 transition-all active:scale-95">Ir para o Dashboard</Link>
      </div>
    </div>
  );
}
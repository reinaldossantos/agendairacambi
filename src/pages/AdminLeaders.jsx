import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export default function AdminLeaders() {
  const [programs, setPrograms] = useState([]);
  const [persons, setPersons] = useState([]);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchPrograms();
    fetchPersons();
  }, []);

  async function fetchPrograms() {
    const { data } = await supabase
      .from("programs")
      .select("id, name, leader:leader_id(id, name, initials)")
      .order("name");
    setPrograms(data || []);
  }

  async function fetchPersons() {
    const { data } = await supabase
      .from("persons")
      .select("id, name, initials")
      .order("name");
    setPersons(data || []);
  }

  async function handleChangeLeader(programId, newLeaderId) {
    const { error } = await supabase
      .from("programs")
      .update({ leader_id: newLeaderId || null })
      .eq("id", programId);

    if (error) {
      setMessage({ type: "error", text: "Erro ao atualizar líder." });
    } else {
      setMessage({ type: "success", text: "Líder atualizado com sucesso!" });
      fetchPrograms();
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-roboto text-headline-lg text-primary dark:text-white mb-6">
        Líderes dos Programas
      </h2>
      <p className="text-on-surface-variant dark:text-gray-400 mb-8">
        Visualize e defina o líder de cada programa.
      </p>

      {message.text && (
        <div
          className={`mb-6 p-4 rounded-xl ${
            message.type === "success"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
              : "bg-error-container/20 text-error"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-4">
        {programs.map((prog) => (
          <div
            key={prog.id}
            className="bg-white dark:bg-white/5 border border-surface-variant dark:border-white/10 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
          >
            <div className="flex-1">
              <h3 className="font-roboto text-headline-md text-primary dark:text-white">
                {prog.name}
              </h3>
              {prog.leader ? (
                <p className="text-sm text-on-surface dark:text-gray-300 mt-1">
                  Líder atual:{" "}
                  <span className="font-semibold">
                    {prog.leader.name} ({prog.leader.initials})
                  </span>
                </p>
              ) : (
                <p className="text-sm text-outline dark:text-gray-500 mt-1 italic">
                  Nenhum líder definido
                </p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={prog.leader?.id || ""}
                onChange={(e) => handleChangeLeader(prog.id, e.target.value)}
                className="bg-surface dark:bg-dark-background border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 rounded-t-lg text-sm font-roboto text-on-surface dark:text-gray-200"
              >
                <option value="">Selecionar líder</option>
                {persons.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({person.initials})
                  </option>
                ))}
              </select>
              {prog.leader && (
                <button
                  onClick={() => handleChangeLeader(prog.id, "")}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
                  title="Remover líder"
                >
                  <span className="material-symbols-outlined">person_remove</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-surface dark:bg-white/5 border border-surface-variant dark:border-white/10 rounded-xl">
        <p className="text-sm text-on-surface-variant dark:text-gray-400">
          💡 <strong>Dica:</strong> Para cadastrar uma nova pessoa, acesse{" "}
          <a href="/admin/persons" className="text-accent underline">Pessoas</a>. Depois, volte aqui para atribuí‑la como líder.
        </p>
      </div>
    </div>
  );
}
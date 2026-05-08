import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export default function AdminPersons() {
  const [persons, setPersons] = useState([]);
  const [form, setForm] = useState({ name: "", initials: "" });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPersons();
  }, []);

  async function fetchPersons() {
    const { data } = await supabase
      .from("persons")
      .select("*")
      .order("name");
    setPersons(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim() || !form.initials.trim()) return;
    const payload = { name: form.name, initials: form.initials.toUpperCase() };
    if (editingId) {
      await supabase.from("persons").update(payload).eq("id", editingId);
    } else {
      await supabase.from("persons").insert(payload);
    }
    setForm({ name: "", initials: "" });
    setEditingId(null);
    fetchPersons();
  }

  function handleEdit(person) {
    setForm({ name: person.name, initials: person.initials });
    setEditingId(person.id);
  }

  function requestDelete(person) {
    setDeleteTarget(person);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (deleteTarget) {
      await supabase.from("persons").delete().eq("id", deleteTarget.id);
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
      fetchPersons();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-epilogue text-headline-lg text-primary dark:text-white mb-6">
        Pessoas
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-surface-variant dark:border-gray-700 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
          <input
            placeholder="Iniciais (ex: AR)"
            value={form.initials}
            onChange={(e) => setForm({ ...form, initials: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="submit"
            className="bg-accent text-primary font-bold py-3 px-8 rounded-full hover:bg-yellow-400 transition-all active:scale-95 min-h-[48px] flex items-center gap-2"
          >
            {editingId ? "Atualizar" : "Adicionar"}
          </button>
        </div>
      </form>

      <div className="space-y-2">
        {persons.map((person) => (
          <div
            key={person.id}
            className="flex justify-between items-center bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 p-4 rounded-xl"
          >
            <div>
              <span className="font-space text-primary dark:text-white font-bold">
                {person.name}
              </span>
              <span className="text-sm text-outline ml-2">
                ({person.initials})
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(person)}
                className="p-2 text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                onClick={() => requestDelete(person)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal de confirmação para exclusão */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Excluir pessoa"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteTarget(null);
        }}
        confirmText="Sim, excluir"
        variant="danger"
      />
    </div>
  );
}
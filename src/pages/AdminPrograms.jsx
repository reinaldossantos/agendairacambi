import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import ConfirmDialog from "../components/ui/ConfirmDialog";

export default function AdminPrograms() {
  const [programs, setPrograms] = useState([]);
  const [persons, setPersons] = useState([]);
  const [form, setForm] = useState({ name: "", slug: "", leader_id: "" });
  const [editingId, setEditingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null); // programa a ser excluído
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchPrograms();
    fetchPersons();
  }, []);

  async function fetchPrograms() {
    const { data } = await supabase
      .from("programs")
      .select("*, leader:leader_id(name)")
      .order("name");
    setPrograms(data || []);
  }

  async function fetchPersons() {
    const { data } = await supabase
      .from("persons")
      .select("id, name")
      .order("name");
    setPersons(data || []);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    const slug = form.slug || form.name.toLowerCase().replace(/\s+/g, "-");
    const payload = { name: form.name, slug, leader_id: form.leader_id || null };
    if (editingId) {
      await supabase.from("programs").update(payload).eq("id", editingId);
    } else {
      await supabase.from("programs").insert(payload);
    }
    setForm({ name: "", slug: "", leader_id: "" });
    setEditingId(null);
    fetchPrograms();
  }

  function handleEdit(prog) {
    setForm({
      name: prog.name,
      slug: prog.slug,
      leader_id: prog.leader_id || "",
    });
    setEditingId(prog.id);
  }

  function requestDelete(prog) {
    setDeleteTarget(prog);
    setShowDeleteConfirm(true);
  }

  async function handleDeleteConfirm() {
    if (deleteTarget) {
      await supabase.from("programs").delete().eq("id", deleteTarget.id);
      setDeleteTarget(null);
      setShowDeleteConfirm(false);
      fetchPrograms();
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0">
      <h2 className="font-epilogue text-headline-lg text-primary dark:text-white mb-6">
        Programas
      </h2>

      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-surface-variant dark:border-gray-700 mb-8 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            placeholder="Nome do programa"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
          <input
            placeholder="Slug (opcional)"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          />
          <select
            value={form.leader_id}
            onChange={(e) => setForm({ ...form, leader_id: e.target.value })}
            className="bg-surface dark:bg-gray-800 border-b-2 border-primary/20 focus:border-accent outline-none py-2 px-3 text-on-surface dark:text-white rounded-t-lg"
          >
            <option value="">Líder (opcional)</option>
            {persons.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
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
        {programs.map((prog) => (
          <div
            key={prog.id}
            className="flex justify-between items-center bg-white dark:bg-gray-900 border border-surface-variant dark:border-gray-700 p-4 rounded-xl"
          >
            <div>
              <span className="font-space text-primary dark:text-white font-bold">
                {prog.name}
              </span>
              {prog.leader && (
                <span className="text-sm text-outline ml-2">
                  Líder: {prog.leader.name}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleEdit(prog)}
                className="p-2 text-primary dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center transition-all active:scale-95"
              >
                <span className="material-symbols-outlined">edit</span>
              </button>
              <button
                onClick={() => requestDelete(prog)}
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
        title="Excluir programa"
        message={
          deleteTarget
            ? `Tem certeza que deseja excluir o programa "${deleteTarget.name}"? Esta ação não pode ser desfeita.`
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
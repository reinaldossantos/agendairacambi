import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";

export default function ChangePassword() {
  const { session, currentUser, refreshProfile } = useCurrentUser();
  const location = useLocation();
  const [password, setPassword] = useState(""); const [confirmation, setConfirmation] = useState(""); const [message, setMessage] = useState(""); const [saving, setSaving] = useState(false);
  if (!session) return <Navigate to="/login" replace />;
  async function submit(event) { event.preventDefault(); if (password.length < 8) return setMessage("A nova senha deve ter pelo menos 8 caracteres."); if (password !== confirmation) return setMessage("As senhas não coincidem."); setSaving(true); const { error } = await supabase.auth.updateUser({ password }); if (!error) await supabase.from("persons").update({ must_change_password: false, failed_login_attempts: 0, locked_at: null }).eq("auth_user_id", session.user.id); setSaving(false); if (error) setMessage(error.message); else await refreshProfile(); }
  if (currentUser && !currentUser.must_change_password && location.pathname !== "/reset-password") return <Navigate to="/" replace />;
  return <main className="flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-dark-background"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-7 shadow-xl dark:bg-dark-surface"><h1 className="text-2xl font-bold text-primary dark:text-white">Crie uma nova senha</h1><p className="text-sm text-outline">Por segurança, substitua a senha temporária antes de continuar.</p>{message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}<input required minLength="8" type="password" placeholder="Nova senha" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full rounded-xl border p-3 dark:bg-gray-800" /><input required minLength="8" type="password" placeholder="Confirme a nova senha" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="w-full rounded-xl border p-3 dark:bg-gray-800" /><button disabled={saving} className="w-full rounded-full bg-primary py-3 font-bold text-white">{saving ? "Salvando…" : "Salvar nova senha"}</button></form></main>;
}

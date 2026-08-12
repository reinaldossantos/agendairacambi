import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";

const inputClass = "w-full rounded-xl border border-surface-variant p-3 dark:border-gray-700 dark:bg-gray-800";
const comparable = (value) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/\s+/g, "").trim();

export default function ChangePassword() {
  const { session, currentUser, refreshProfile } = useCurrentUser();
  const location = useLocation();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [hint, setHint] = useState("");
  const [savedHint, setSavedHint] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (!session || location.pathname !== "/reset-password") return undefined;
    const timer = window.setTimeout(async () => {
      const { data } = await supabase.rpc("get_my_password_hint");
      setSavedHint(data || "");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session, location.pathname]);

  if (!session) return <Navigate to="/login" replace />;
  if (currentUser && !currentUser.must_change_password && location.pathname !== "/reset-password") return <Navigate to="/" replace />;

  async function submit(event) {
    event.preventDefault();
    if (password.length < 8) return setMessage("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== confirmation) return setMessage("As senhas não coincidem.");
    if (hint.trim().length < 4) return setMessage("Informe uma dica com pelo menos 4 caracteres.");
    const normalizedPassword = comparable(password);
    const normalizedHint = comparable(hint);
    if (normalizedHint === normalizedPassword || normalizedPassword.includes(normalizedHint) || normalizedHint.includes(normalizedPassword)) {
      return setMessage("A dica não pode conter ou revelar a própria senha.");
    }

    setSaving(true);
    setMessage("");
    const { error } = await supabase.auth.updateUser({ password });
    const profileResult = error ? null : await supabase.rpc("complete_password_change", { password_hint: hint.trim() });
    setSaving(false);
    if (error || profileResult?.error) setMessage(error?.message || profileResult.error.message);
    else await refreshProfile();
  }

  return <main className="flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-dark-background">
    <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-7 shadow-xl dark:bg-dark-surface">
      <h1 className="text-2xl font-bold text-primary dark:text-white">Crie uma nova senha</h1>
      <div className="rounded-xl bg-blue-50 p-4 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-200">
        <strong className="block">Sua nova senha precisa ter no mínimo 8 caracteres.</strong>
        <span>Você pode combinar letras, números e símbolos. Ela deve ser diferente da senha temporária.</span>
      </div>
      {savedHint && <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><span className="material-symbols-outlined text-[20px]">lightbulb</span><div><strong className="block">Sua dica cadastrada</strong><span>{savedHint}</span></div></div>}
      {message && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{message}</p>}
      <PasswordField label="Nova senha" value={password} onChange={setPassword} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} placeholder="Mínimo de 8 caracteres" />
      <PasswordField label="Confirme a nova senha" value={confirmation} onChange={setConfirmation} visible={showConfirmation} onToggle={() => setShowConfirmation((value) => !value)} placeholder="Digite novamente" />
      <label className="block text-sm font-bold text-primary dark:text-white">Dica para lembrar sua senha
        <input required minLength="4" maxLength="160" type="text" autoComplete="off" placeholder="Ex.: nome do meu primeiro animal" value={hint} onChange={(event) => setHint(event.target.value)} className={`mt-1 ${inputClass}`} />
        <span className="mt-1 block text-xs font-normal text-outline">Não escreva a senha nem parte dela. Use uma lembrança que faça sentido somente para você.</span>
      </label>
      <button disabled={saving} className="w-full rounded-full bg-primary py-3 font-bold text-white disabled:opacity-60">{saving ? "Salvando…" : "Salvar nova senha e dica"}</button>
    </form>
  </main>;
}

function PasswordField({ label, value, onChange, visible, onToggle, placeholder }) {
  return <label className="block text-sm font-bold text-primary dark:text-white">{label}
    <span className="relative mt-1 block">
      <input required minLength="8" type={visible ? "text" : "password"} autoComplete="new-password" placeholder={placeholder} value={value} onChange={(event) => onChange(event.target.value)} className={`${inputClass} pr-12`} />
      <button type="button" onClick={onToggle} className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-outline transition hover:bg-primary/5 hover:text-primary" aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Visualizar ${label.toLowerCase()}`} aria-pressed={visible} title={visible ? "Ocultar senha" : "Visualizar senha"}>
        <span className="material-symbols-outlined text-[21px]">{visible ? "visibility_off" : "visibility"}</span>
      </button>
    </span>
  </label>;
}

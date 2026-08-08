import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { useCurrentUser } from "../context/CurrentUserContext";

const IRACAMBI_DOMAIN = "@iracambi.com";

function completeEmail(value) {
  const normalized = value.trim().toLowerCase();
  return normalized.includes("@") ? normalized : `${normalized}${IRACAMBI_DOMAIN}`;
}

export default function Login() {
  const { session } = useCurrentUser();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  if (session) return <Navigate to="/" replace />;

  async function login(event) {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    const { data, error } = await supabase.functions.invoke("auth-login", {
      body: { email: completeEmail(email), password, userAgent: navigator.userAgent },
    });
    if (error || !data?.session) {
      setLoading(false);
      setMessage({ type: "error", text: data?.error || error?.message || "Não foi possível entrar." });
      return;
    }
    if (data.accessLogId) localStorage.setItem("iracambi_access_log_id", String(data.accessLogId));
    const sessionResult = await supabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    setLoading(false);
    if (sessionResult.error) setMessage({ type: "error", text: sessionResult.error.message });
  }

  async function forgotPassword() {
    if (!email.trim()) return setMessage({ type: "error", text: "Informe seu usuário para recuperar a senha." });
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(completeEmail(email), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    setMessage(error
      ? { type: "error", text: error.message }
      : { type: "success", text: "Enviamos as instruções de recuperação para o seu e-mail." });
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-green-50 p-4 dark:bg-dark-background">
      <div className="w-full max-w-md rounded-2xl border border-surface-variant bg-white p-7 shadow-xl dark:border-gray-700 dark:bg-dark-surface">
        <div className="mb-5 text-center">
          <img src="/logo.webp" alt="Iracambi" className="mx-auto h-20 w-auto" />
          <p className="mt-2 text-sm font-semibold italic tracking-wide text-primary-light dark:text-green-300">Salvando florestas, transformando vidas</p>
        </div>
        <h1 className="text-center text-2xl font-bold text-primary dark:text-white">Acessar Agenda Iracambi</h1>
        <p className="mb-6 mt-2 text-center text-sm text-outline">Entre com seu usuário e a senha fornecida.</p>
        {message.text && <div className={`mb-4 rounded-xl p-3 text-sm ${message.type === "error" ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>{message.text}</div>}
        <form onSubmit={login} className="space-y-4">
          <label className="block text-sm font-bold text-primary dark:text-white">
            Usuário
            <div className="mt-1 flex overflow-hidden rounded-xl border border-surface-variant bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15 dark:bg-gray-800">
              <input required type="text" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Digite seu usuário" aria-label="Usuário ou e-mail" className="min-w-0 flex-1 bg-transparent px-3 py-3 outline-none" />
              <span className="flex items-center border-l border-surface-variant bg-surface px-3 text-sm font-semibold text-outline dark:bg-gray-700">@iracambi.com</span>
            </div>
            <span className="mt-1 block text-xs font-normal text-outline">Você também pode informar o e-mail completo.</span>
          </label>
          <label className="block text-sm font-bold text-primary dark:text-white">
            Senha
            <input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-surface-variant px-3 py-3 dark:bg-gray-800" />
          </label>
          <button disabled={loading} className="w-full rounded-full bg-primary py-3 font-bold text-white disabled:opacity-60">{loading ? "Entrando…" : "Entrar"}</button>
        </form>
        <button disabled={loading} onClick={forgotPassword} className="mt-4 w-full text-sm font-bold text-primary hover:underline dark:text-green-300">Esqueceu a senha?</button>
      </div>
    </main>
  );
}

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Configuração do Supabase ausente. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no ambiente de publicação.",
  );
}

const auditAwareFetch = (url, options = {}) => {
  const headers = new Headers(options.headers || {});
  try {
    const selected = JSON.parse(localStorage.getItem("iracambi_current_user") || "null");
    if (selected?.id) headers.set("x-iracambi-user-id", selected.id);
    if (selected?.name) headers.set("x-iracambi-user-name", selected.name.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  } catch {
    // A operação continua mesmo se o usuário local não puder ser identificado.
  }
  return fetch(url, { ...options, headers });
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: auditAwareFetch },
});

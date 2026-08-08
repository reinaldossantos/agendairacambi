-- A tela de login carrega configuracoes publicas antes de existir uma sessao.
-- Mantem anon estritamente somente-leitura; escritas continuam autenticadas.
grant usage on schema public to anon;
grant select on table public.app_settings to anon;


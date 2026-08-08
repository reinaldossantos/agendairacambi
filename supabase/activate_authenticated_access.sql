-- ============================================================================
-- AGENDA IRACAMBI - CORTE DEFINITIVO PARA ACESSO AUTENTICADO
-- ============================================================================
-- Execute este arquivo NO DIA EM QUE A NOVA VERSAO COM LOGIN FOR PUBLICADA.
-- Recomenda-se publicar o frontend e executar este SQL na mesma janela de
-- manutencao. O script nao apaga dados, anexos, relatorios nem contas.

begin;

do $authenticated_cutover$
declare
  legacy_tables constant text[] := array[
    'persons',
    'programs',
    'activities',
    'activity_logs',
    'announcements',
    'program_files',
    'monthly_activity_reports',
    'expense_reports',
    'expense_report_notifications',
    'app_settings',
    'mileage_rates',
    'vehicles',
    'vehicle_bookings'
  ];
  table_name text;
begin
  -- Remove exclusivamente as politicas temporarias criadas pelo script legado.
  foreach table_name in array legacy_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      continue;
    end if;

    execute format('drop policy if exists legacy_compat_select on public.%I', table_name);
    execute format('drop policy if exists legacy_compat_insert on public.%I', table_name);
    execute format('drop policy if exists legacy_compat_update on public.%I', table_name);
    execute format('drop policy if exists legacy_compat_delete on public.%I', table_name);
  end loop;
end
$authenticated_cutover$;

-- Encerra o acesso convencional em todo o schema public.
revoke all privileges on all tables in schema public from anon;
revoke all privileges on all sequences in schema public from anon;

-- Mantem a aplicacao nova operando com uma sessao valida do Supabase Auth.
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Novas tabelas criadas depois do corte tambem nascem sem acesso anonimo.
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public grant usage, select on sequences to authenticated;

commit;

-- Resultado esperado: todos os valores abaixo devem ser false.
select
  has_table_privilege('anon', 'public.activities', 'select') as anon_can_read_activities,
  has_table_privilege('anon', 'public.persons', 'select') as anon_can_read_persons,
  has_table_privilege('anon', 'public.user_access_logs', 'select') as anon_can_read_access_logs,
  has_table_privilege('anon', 'public.security_notifications', 'select') as anon_can_read_security_notifications;

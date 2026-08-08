-- ============================================================================
-- AGENDA IRACAMBI - COMPATIBILIDADE TEMPORARIA COM A VERSAO CONVENCIONAL
-- ============================================================================
-- Execute este arquivo APENAS enquanto o site publicado ainda usar o seletor
-- convencional de pessoas, sem login pelo Supabase Auth.
--
-- O script:
--   * nao apaga nem altera dados;
--   * nao desfaz as contas criadas no Supabase Auth;
--   * libera ao papel anon somente as tabelas operacionais listadas abaixo;
--   * mantem protegidos logs de acesso, notificacoes de seguranca, leituras de
--     notificacoes autenticadas e logs de auditoria.
--
-- ATENCAO: durante esta fase, o site antigo continua com o nivel de seguranca
-- convencional. Execute activate_authenticated_access.sql no dia da publicacao.

begin;

do $legacy_access$
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
  sequence_record record;
begin
  foreach table_name in array legacy_tables loop
    if to_regclass(format('public.%I', table_name)) is null then
      raise notice 'Tabela public.% nao existe neste ambiente; ignorada.', table_name;
      continue;
    end if;

    execute format(
      'grant select, insert, update, delete on table public.%I to anon',
      table_name
    );

    -- Estas politicas so entram em efeito quando a tabela possui RLS habilitado.
    -- Os nomes exclusivos permitem a remocao segura no corte definitivo.
    execute format('drop policy if exists legacy_compat_select on public.%I', table_name);
    execute format(
      'create policy legacy_compat_select on public.%I for select to anon using (true)',
      table_name
    );

    execute format('drop policy if exists legacy_compat_insert on public.%I', table_name);
    execute format(
      'create policy legacy_compat_insert on public.%I for insert to anon with check (true)',
      table_name
    );

    execute format('drop policy if exists legacy_compat_update on public.%I', table_name);
    execute format(
      'create policy legacy_compat_update on public.%I for update to anon using (true) with check (true)',
      table_name
    );

    execute format('drop policy if exists legacy_compat_delete on public.%I', table_name);
    execute format(
      'create policy legacy_compat_delete on public.%I for delete to anon using (true)',
      table_name
    );
  end loop;

  -- Libera somente sequences pertencentes as tabelas operacionais acima.
  for sequence_record in
    select distinct sequence_namespace.nspname as schema_name,
                    sequence_class.relname as sequence_name
      from pg_class table_class
      join pg_namespace table_namespace
        on table_namespace.oid = table_class.relnamespace
      join pg_depend dependency
        on dependency.refobjid = table_class.oid
       and dependency.deptype in ('a', 'i')
      join pg_class sequence_class
        on sequence_class.oid = dependency.objid
       and sequence_class.relkind = 'S'
      join pg_namespace sequence_namespace
        on sequence_namespace.oid = sequence_class.relnamespace
     where table_namespace.nspname = 'public'
       and table_class.relname = any (legacy_tables)
  loop
    execute format(
      'grant usage, select on sequence %I.%I to anon',
      sequence_record.schema_name,
      sequence_record.sequence_name
    );
  end loop;
end
$legacy_access$;

-- Garantias explicitas: as estruturas sensiveis permanecem sem acesso anonimo.
revoke all privileges on table public.user_access_logs from anon;
revoke all privileges on table public.security_notifications from anon;
revoke all privileges on table public.activity_notification_reads from anon;
revoke all privileges on table public.system_audit_logs from anon;

commit;

-- Resultado esperado: can_read = true para tabelas operacionais e false para
-- as estruturas sensiveis.
select
  has_table_privilege('anon', 'public.activities', 'select') as can_read_activities,
  has_table_privilege('anon', 'public.persons', 'select') as can_read_persons,
  has_table_privilege('anon', 'public.user_access_logs', 'select') as can_read_access_logs,
  has_table_privilege('anon', 'public.security_notifications', 'select') as can_read_security_notifications;

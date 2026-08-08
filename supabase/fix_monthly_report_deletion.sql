-- Correção da exclusão de relatórios mensais finalizados.
grant select, insert, update, delete on public.monthly_activity_reports to anon, authenticated;

drop policy if exists "monthly_reports_delete_drafts" on public.monthly_activity_reports;
drop policy if exists "monthly_reports_delete_all" on public.monthly_activity_reports;

create policy "monthly_reports_delete_all"
  on public.monthly_activity_reports
  for delete
  using (true);

-- Versão defensiva da auditoria: não pressupõe que a tabela auditada tenha coluna key.
create or replace function public.capture_system_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  audit_enabled boolean := false;
  headers jsonb := '{}'::jsonb;
  before_data jsonb;
  after_data jsonb;
  affected_id text;
  fields text[] := '{}';
  user_id_text text;
begin
  select coalesce((value->>'enabled')::boolean, false)
    into audit_enabled
    from public.app_settings
   where key = 'audit_settings';

  if tg_table_name = 'app_settings' then
    if coalesce(to_jsonb(new)->>'key', to_jsonb(old)->>'key') = 'audit_settings' then
      audit_enabled := true;
    end if;
  end if;

  if not coalesce(audit_enabled, false) then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  begin
    headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    headers := '{}'::jsonb;
  end;

  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  affected_id := coalesce(after_data->>'id', before_data->>'id', after_data->>'key', before_data->>'key');

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into fields
      from jsonb_object_keys(after_data) as key
     where before_data->key is distinct from after_data->key;
  elsif tg_op = 'INSERT' then
    select coalesce(array_agg(key order by key), '{}') into fields from jsonb_object_keys(after_data) as key;
  else
    select coalesce(array_agg(key order by key), '{}') into fields from jsonb_object_keys(before_data) as key;
  end if;

  user_id_text := headers->>'x-iracambi-user-id';

  insert into public.system_audit_logs (
    table_name, record_id, action, actor_id, actor_name,
    changed_fields, old_data, new_data, request_path, database_role
  ) values (
    tg_table_name,
    affected_id,
    tg_op,
    case when user_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then user_id_text::uuid else null end,
    nullif(headers->>'x-iracambi-user-name', ''),
    fields,
    before_data,
    after_data,
    headers->>'x-client-info',
    current_user
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

notify pgrst, 'reload schema';

-- Auditoria permanente, abrangente e vinculada à identidade autenticada.
insert into public.app_settings(key, value)
values ('audit_settings', '{"enabled": true, "permanent": true}'::jsonb)
on conflict (key) do update
set value = excluded.value;

create or replace function public.force_permanent_audit_setting()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.key = 'audit_settings' then
    new.value := coalesce(new.value, '{}'::jsonb) || '{"enabled": true, "permanent": true}'::jsonb;
  end if;
  return new;
end;
$$;

drop trigger if exists force_permanent_audit_setting on public.app_settings;
create trigger force_permanent_audit_setting
before insert or update on public.app_settings
for each row execute function public.force_permanent_audit_setting();

create or replace function public.capture_system_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  headers jsonb := '{}'::jsonb;
  before_data jsonb;
  after_data jsonb;
  affected_id text;
  fields text[] := '{}';
  authenticated_actor uuid := public.current_person_id();
  fallback_actor_text text;
  resolved_actor uuid;
  resolved_actor_name text;
begin
  begin
    headers := coalesce(nullif(current_setting('request.headers', true), ''), '{}')::jsonb;
  exception when others then
    headers := '{}'::jsonb;
  end;

  resolved_actor := authenticated_actor;
  if resolved_actor is null then
    fallback_actor_text := headers->>'x-iracambi-user-id';
    if fallback_actor_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
       and exists(select 1 from public.persons where id = fallback_actor_text::uuid and is_active) then
      resolved_actor := fallback_actor_text::uuid;
    end if;
  end if;
  select name into resolved_actor_name from public.persons where id = resolved_actor;

  before_data := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  after_data := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  affected_id := coalesce(after_data->>'id', before_data->>'id', after_data->>'key', before_data->>'key');

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(key order by key), '{}') into fields
      from jsonb_object_keys(after_data) as key
     where before_data->key is distinct from after_data->key;
    if cardinality(fields) = 0 then return new; end if;
  elsif tg_op = 'INSERT' then
    select coalesce(array_agg(key order by key), '{}') into fields from jsonb_object_keys(after_data) as key;
  else
    select coalesce(array_agg(key order by key), '{}') into fields from jsonb_object_keys(before_data) as key;
  end if;

  insert into public.system_audit_logs(
    table_name, record_id, action, actor_id, actor_name,
    changed_fields, old_data, new_data, request_path, database_role
  ) values (
    tg_table_name, affected_id, tg_op, resolved_actor, resolved_actor_name,
    fields, before_data, after_data, headers->>'x-client-info', current_user
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- Instala auditoria em todas as tabelas operacionais presentes e futuras desta versão.
do $$
declare
  target_table text;
begin
  for target_table in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public'
       and c.relkind in ('r', 'p')
       and c.relname not in (
         'system_audit_logs', 'notification_read_audit', 'activity_notification_reads',
         'user_access_logs', 'user_password_hints', 'spatial_ref_sys'
       )
  loop
    execute format('drop trigger if exists system_audit_trigger on public.%I', target_table);
    execute format(
      'create trigger system_audit_trigger after insert or update or delete on public.%I for each row execute function public.capture_system_audit()',
      target_table
    );
  end loop;
end;
$$;

-- Recupera somente históricos preexistentes que já possuíam autoria e horário confiáveis.
insert into public.system_audit_logs(table_name, record_id, action, actor_id, actor_name, occurred_at, changed_fields, new_data, request_path)
select 'purchase_request_history', h.id::text, 'INSERT', h.actor_id, p.name, h.created_at,
       array['request_id', 'event_type', 'content', 'metadata'], to_jsonb(h), 'historical-backfill'
  from public.purchase_request_history h
  left join public.persons p on p.id = h.actor_id
 where not exists (
   select 1 from public.system_audit_logs a
    where a.table_name = 'purchase_request_history' and a.record_id = h.id::text
 );

insert into public.system_audit_logs(table_name, record_id, action, actor_id, actor_name, occurred_at, changed_fields, new_data, request_path)
select 'management_project_logs', h.id::text, 'INSERT', h.actor_id, p.name, h.created_at,
       array['project_id', 'log_type', 'content', 'metadata'], to_jsonb(h), 'historical-backfill'
  from public.management_project_logs h
  left join public.persons p on p.id = h.actor_id
 where not exists (
   select 1 from public.system_audit_logs a
    where a.table_name = 'management_project_logs' and a.record_id = h.id::text
 );

insert into public.system_audit_logs(table_name, record_id, action, actor_id, actor_name, occurred_at, changed_fields, new_data, request_path)
select 'activity_logs', h.id::text, 'INSERT', h.person_id, p.name, h.created_at,
       array['activity_id', 'type', 'content'], to_jsonb(h), 'historical-backfill'
  from public.activity_logs h
  left join public.persons p on p.id = h.person_id
 where not exists (
   select 1 from public.system_audit_logs a
    where a.table_name = 'activity_logs' and a.record_id = h.id::text
 );

insert into public.system_audit_logs(table_name, record_id, action, actor_name, changed_fields, new_data, request_path)
values (
  'audit_control', 'permanent-audit', 'INSERT', 'Sistema', array['enabled', 'permanent'],
  '{"enabled": true, "permanent": true}'::jsonb, 'migration/20260811223000'
);

notify pgrst, 'reload schema';

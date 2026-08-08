-- Auditoria geral do sistema — execute integralmente no SQL Editor do Supabase.
create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (key, value)
values ('audit_settings', '{"enabled": false}'::jsonb)
on conflict (key) do nothing;

create table if not exists public.system_audit_logs (
  id bigint generated always as identity primary key,
  table_name text not null,
  record_id text,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid,
  actor_name text,
  occurred_at timestamptz not null default now(),
  changed_fields text[] not null default '{}',
  old_data jsonb,
  new_data jsonb,
  request_path text,
  database_role text not null default current_user
);

create index if not exists system_audit_logs_occurred_idx on public.system_audit_logs(occurred_at desc);
create index if not exists system_audit_logs_actor_idx on public.system_audit_logs(actor_id, occurred_at desc);
create index if not exists system_audit_logs_table_idx on public.system_audit_logs(table_name, occurred_at desc);
create index if not exists system_audit_logs_record_idx on public.system_audit_logs(table_name, record_id);

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

  -- A própria ativação/desativação sempre deve ser rastreada.
  if tg_table_name = 'app_settings' then
    if coalesce(to_jsonb(new)->>'key', to_jsonb(old)->>'key') = 'audit_settings' then
      audit_enabled := true;
    end if;
  end if;

  if not coalesce(audit_enabled, false) then
    return coalesce(new, old);
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
    select coalesce(array_agg(key order by key), '{}')
      into fields
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

  return coalesce(new, old);
end;
$$;

-- Instala o mesmo gatilho nas tabelas existentes do sistema.
do $$
declare
  target_table text;
  audited_tables text[] := array[
    'activities', 'activity_logs', 'persons', 'programs',
    'announcements', 'program_files', 'vehicles', 'vehicle_bookings',
    'expense_reports', 'expense_report_notifications', 'mileage_rates',
    'monthly_activity_reports', 'app_settings',
    'management_projects', 'management_project_tasks', 'management_project_risks'
  ];
begin
  foreach target_table in array audited_tables loop
    if to_regclass('public.' || target_table) is not null then
      execute format('drop trigger if exists system_audit_trigger on public.%I', target_table);
      execute format(
        'create trigger system_audit_trigger after insert or update or delete on public.%I for each row execute function public.capture_system_audit()',
        target_table
      );
    end if;
  end loop;
end;
$$;

alter table public.system_audit_logs enable row level security;

drop policy if exists "system_audit_select_all" on public.system_audit_logs;
create policy "system_audit_select_all" on public.system_audit_logs for select using (true);

-- Não há política pública de INSERT/UPDATE/DELETE: os registros são imutáveis
-- e somente a função SECURITY DEFINER pode criá-los.
notify pgrst, 'reload schema';

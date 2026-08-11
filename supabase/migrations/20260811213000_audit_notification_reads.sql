-- Registra de forma imutável a leitura individual das notificações.
create table if not exists public.notification_read_audit (
  id bigint generated always as identity primary key,
  person_id uuid not null references public.persons(id) on delete restrict,
  notification_source text not null check (notification_source in ('activity', 'expense_report', 'security', 'project', 'purchase_request')),
  notification_id text not null,
  title text,
  read_at timestamptz not null default now(),
  unique (person_id, notification_source, notification_id)
);

create index if not exists notification_read_audit_person_idx
  on public.notification_read_audit(person_id, read_at desc);

alter table public.notification_read_audit enable row level security;
drop policy if exists notification_read_audit_reinaldo_read on public.notification_read_audit;
create policy notification_read_audit_reinaldo_read on public.notification_read_audit
  for select to authenticated using (public.is_reinaldo());
revoke all on public.notification_read_audit from public, anon, authenticated;
grant select on public.notification_read_audit to authenticated;

create or replace function public.read_notification(requested_source text, requested_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := public.current_person_id();
  actor_name text;
  notification_title text;
begin
  if actor is null or not public.is_active_user() then
    raise exception 'Usuário sem acesso ativo.';
  end if;

  case requested_source
    when 'activity' then
      select case l.type when 'comment' then 'Novo comentário' when 'file' then 'Novo arquivo' else 'Atualização da atividade' end
        into notification_title
        from public.activity_logs l
        join public.activities a on a.id = l.activity_id
       where l.id::text = requested_id
         and (l.person_id = actor or a.responsible_id = actor or actor = any(coalesce(a.involved_ids, '{}'::uuid[])));
      if notification_title is not null then
        insert into public.activity_notification_reads(log_id, person_id, read_at)
        values (requested_id, actor, now())
        on conflict (log_id, person_id) do nothing;
      end if;
    when 'expense_report' then
      update public.expense_report_notifications set read_at = coalesce(read_at, now())
       where id = requested_id::uuid and recipient_id = actor returning title into notification_title;
    when 'security' then
      update public.security_notifications set is_read = true
       where id = requested_id::bigint and recipient_id = actor returning title into notification_title;
    when 'project' then
      update public.management_project_notifications set read_at = coalesce(read_at, now())
       where id = requested_id::uuid and recipient_id = actor returning title into notification_title;
    when 'purchase_request' then
      update public.purchase_request_notifications set read_at = coalesce(read_at, now())
       where id = requested_id::uuid and recipient_id = actor returning title into notification_title;
    else
      raise exception 'Origem de notificação inválida.';
  end case;

  if notification_title is null then
    raise exception 'Notificação não encontrada ou sem acesso.';
  end if;

  insert into public.notification_read_audit(person_id, notification_source, notification_id, title)
  values (actor, requested_source, requested_id, notification_title)
  on conflict (person_id, notification_source, notification_id) do nothing;

  if found then
    select name into actor_name from public.persons where id = actor;
    insert into public.system_audit_logs(
      table_name, record_id, action, actor_id, actor_name, changed_fields, new_data, request_path
    ) values (
      'notification_read_audit', requested_source || ':' || requested_id, 'INSERT', actor, actor_name,
      array['person_id', 'notification_source', 'notification_id', 'title', 'read_at'],
      jsonb_build_object('person_id', actor, 'source', requested_source, 'notification_id', requested_id, 'title', notification_title, 'read_at', now()),
      'notification/read'
    );
  end if;
end;
$$;

revoke all on function public.read_notification(text, text) from public, anon;
grant execute on function public.read_notification(text, text) to authenticated;
notify pgrst, 'reload schema';

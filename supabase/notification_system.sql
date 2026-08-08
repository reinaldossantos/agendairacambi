-- Correções completas do sistema de notificações.

create table if not exists public.activity_notification_reads (
  log_id text not null,
  person_id uuid not null references public.persons(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key (log_id, person_id)
);

create index if not exists activity_notification_reads_person_idx
  on public.activity_notification_reads(person_id, read_at desc);

alter table public.activity_notification_reads enable row level security;

drop policy if exists "users_read_own_activity_notification_reads" on public.activity_notification_reads;
create policy "users_read_own_activity_notification_reads"
on public.activity_notification_reads for select to authenticated
using (person_id in (select id from public.persons where auth_user_id = auth.uid()));

drop policy if exists "users_insert_own_activity_notification_reads" on public.activity_notification_reads;
create policy "users_insert_own_activity_notification_reads"
on public.activity_notification_reads for insert to authenticated
with check (person_id in (select id from public.persons where auth_user_id = auth.uid()));

drop policy if exists "users_update_own_activity_notification_reads" on public.activity_notification_reads;
create policy "users_update_own_activity_notification_reads"
on public.activity_notification_reads for update to authenticated
using (person_id in (select id from public.persons where auth_user_id = auth.uid()))
with check (person_id in (select id from public.persons where auth_user_id = auth.uid()));

-- Restringe notificações financeiras ao destinatário. A inserção exige que o ator seja
-- o usuário autenticado; o serviço administrativo continua autorizado pela service role.
drop policy if exists "expense_notifications_select_all" on public.expense_report_notifications;
drop policy if exists "expense_notifications_insert_all" on public.expense_report_notifications;
drop policy if exists "expense_notifications_update_all" on public.expense_report_notifications;
drop policy if exists "expense_notifications_select_recipient" on public.expense_report_notifications;
drop policy if exists "expense_notifications_insert_actor" on public.expense_report_notifications;
drop policy if exists "expense_notifications_update_recipient" on public.expense_report_notifications;

create policy "expense_notifications_select_recipient"
on public.expense_report_notifications for select to authenticated
using (recipient_id in (select id from public.persons where auth_user_id = auth.uid()));

create policy "expense_notifications_insert_actor"
on public.expense_report_notifications for insert to authenticated
with check (actor_id in (select id from public.persons where auth_user_id = auth.uid()));

create policy "expense_notifications_update_recipient"
on public.expense_report_notifications for update to authenticated
using (recipient_id in (select id from public.persons where auth_user_id = auth.uid()))
with check (recipient_id in (select id from public.persons where auth_user_id = auth.uid()));

-- Garante que as tabelas que alimentam o sino publiquem eventos em tempo real.
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'activity_logs') then
    alter publication supabase_realtime add table public.activity_logs;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_report_notifications') then
    alter publication supabase_realtime add table public.expense_report_notifications;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'security_notifications') then
    alter publication supabase_realtime add table public.security_notifications;
  end if;
end $$;

grant select, insert, update on public.activity_notification_reads to authenticated;

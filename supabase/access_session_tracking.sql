-- Rastreamento de sessões e acesso exclusivo de Reinaldo ao histórico.
-- Execute no SQL Editor antes de publicar novamente a função auth-login.

alter table public.user_access_logs
  add column if not exists session_id uuid,
  add column if not exists last_seen_at timestamptz,
  add column if not exists ended_at timestamptz,
  add column if not exists duration_seconds integer not null default 0,
  add column if not exists ip_address inet;

update public.user_access_logs
set last_seen_at = occurred_at
where last_seen_at is null;

create index if not exists user_access_logs_person_occurred_idx
  on public.user_access_logs(person_id, occurred_at desc);
create index if not exists user_access_logs_active_session_idx
  on public.user_access_logs(person_id, last_seen_at desc)
  where event_type = 'login_success' and ended_at is null;

drop policy if exists "admins_read_access_logs" on public.user_access_logs;
drop policy if exists "reinaldo_reads_access_logs" on public.user_access_logs;
create policy "reinaldo_reads_access_logs"
on public.user_access_logs for select to authenticated
using (
  exists (
    select 1 from public.persons
    where persons.auth_user_id = auth.uid()
      and lower(persons.email) = 'reinaldo@iracambi.com'
  )
);

create or replace function public.touch_current_access_session(p_log_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_access_logs log
  set last_seen_at = now(),
      duration_seconds = greatest(0, floor(extract(epoch from (now() - log.occurred_at)))::integer)
  where log.id = p_log_id
    and log.event_type = 'login_success'
    and log.ended_at is null
    and exists (
      select 1 from public.persons
      where persons.id = log.person_id and persons.auth_user_id = auth.uid()
    );
end;
$$;

create or replace function public.close_current_access_session(p_log_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.user_access_logs log
  set last_seen_at = now(),
      ended_at = now(),
      duration_seconds = greatest(0, floor(extract(epoch from (now() - log.occurred_at)))::integer)
  where log.id = p_log_id
    and log.event_type = 'login_success'
    and log.ended_at is null
    and exists (
      select 1 from public.persons
      where persons.id = log.person_id and persons.auth_user_id = auth.uid()
    );
end;
$$;

revoke all on function public.touch_current_access_session(bigint) from public, anon;
revoke all on function public.close_current_access_session(bigint) from public, anon;
grant execute on function public.touch_current_access_session(bigint) to authenticated;
grant execute on function public.close_current_access_session(bigint) to authenticated;

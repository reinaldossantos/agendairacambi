-- Permite editar logicamente apenas os próprios comentários.
grant update on table public.activity_logs to authenticated;

drop policy if exists "activity_comments_update_own" on public.activity_logs;
create policy "activity_comments_update_own"
on public.activity_logs
for update
to authenticated
using (
  type = 'comment'
  and exists (
    select 1 from public.persons
    where persons.id = activity_logs.person_id
      and persons.auth_user_id = auth.uid()
  )
)
with check (
  type = 'comment'
  and exists (
    select 1 from public.persons
    where persons.id = activity_logs.person_id
      and persons.auth_user_id = auth.uid()
  )
);

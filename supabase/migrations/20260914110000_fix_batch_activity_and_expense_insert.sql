alter table public.activities drop constraint if exists activities_schedule_required;

drop policy if exists expense_reports_owner_insert on public.expense_reports;
create policy expense_reports_owner_insert on public.expense_reports
for insert to authenticated
with check (
  exists (
    select 1 from public.persons p
    where p.id = person_id
      and p.auth_user_id = auth.uid()
      and p.is_active = true
      and p.locked_at is null
  )
);

notify pgrst, 'reload schema';

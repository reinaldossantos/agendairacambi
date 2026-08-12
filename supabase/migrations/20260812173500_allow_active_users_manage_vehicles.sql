-- Thaís administra o cadastro da frota com o administrador; exclusões permanecem administrativas.
drop policy if exists vehicles_thais_insert on public.vehicles;
create policy vehicles_thais_insert
on public.vehicles
for insert
to authenticated
with check (
  exists (
    select 1 from public.persons
    where auth_user_id = auth.uid()
      and is_active = true
      and locked_at is null
      and lower(trim(name)) in ('thais', 'thaís')
  )
);

drop policy if exists vehicles_thais_update on public.vehicles;
create policy vehicles_thais_update
on public.vehicles
for update
to authenticated
using (
  exists (
    select 1 from public.persons
    where auth_user_id = auth.uid()
      and is_active = true
      and locked_at is null
      and lower(trim(name)) in ('thais', 'thaís')
  )
)
with check (
  exists (
    select 1 from public.persons
    where auth_user_id = auth.uid()
      and is_active = true
      and locked_at is null
      and lower(trim(name)) in ('thais', 'thaís')
  )
);

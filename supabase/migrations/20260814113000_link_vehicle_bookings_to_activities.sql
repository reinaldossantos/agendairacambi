-- Vincula reservas criadas durante o lancamento de atividades.
alter table public.vehicle_bookings
  add column if not exists activity_id uuid references public.activities(id) on delete set null;

create unique index if not exists vehicle_bookings_activity_unique_idx
  on public.vehicle_bookings(activity_id)
  where activity_id is not null;

create index if not exists vehicle_bookings_activity_idx
  on public.vehicle_bookings(activity_id);

notify pgrst, 'reload schema';

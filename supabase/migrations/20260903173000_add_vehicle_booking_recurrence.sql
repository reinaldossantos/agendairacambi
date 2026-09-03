alter table public.vehicle_bookings
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_frequency text,
  add column if not exists recurrence_until date;

alter table public.vehicle_bookings
  drop constraint if exists vehicle_bookings_recurrence_frequency_check;

alter table public.vehicle_bookings
  add constraint vehicle_bookings_recurrence_frequency_check
  check (recurrence_frequency is null or recurrence_frequency = 'weekly');

create index if not exists vehicle_bookings_recurrence_group_idx
  on public.vehicle_bookings(recurrence_group_id)
  where recurrence_group_id is not null;


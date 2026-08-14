-- Registra nominalmente os passageiros selecionados no agendamento.
alter table public.vehicle_bookings
  add column if not exists passenger_ids uuid[] not null default '{}';

create index if not exists vehicle_bookings_passengers_idx
  on public.vehicle_bookings using gin(passenger_ids);

notify pgrst, 'reload schema';

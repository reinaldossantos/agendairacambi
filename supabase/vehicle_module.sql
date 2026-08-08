-- Execute no SQL Editor do Supabase antes de acessar /vehicles.
create extension if not exists btree_gist;

create table if not exists public.vehicles (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  plate text not null unique check (plate ~ '^[A-Z0-9]{7}$'),
  capacity integer not null default 5 check (capacity between 1 and 99),
  status text not null default 'available'
    check (status in ('available', 'maintenance', 'inactive')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vehicle_bookings (
  id uuid primary key default gen_random_uuid(),
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  person_id uuid not null references public.persons(id) on delete restrict,
  program_id uuid not null references public.programs(id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  destination text,
  purpose text not null check (length(trim(purpose)) >= 2),
  passengers integer not null default 1 check (passengers > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  start_odometer integer check (start_odometer >= 0),
  end_odometer integer check (end_odometer >= 0),
  completed_at timestamptz,
  completion_notes text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_at > start_at),
  constraint vehicle_booking_no_overlap exclude using gist (
    vehicle_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status = 'scheduled')
);

-- Mantém instalações existentes compatíveis com a finalização de viagens.
alter table public.vehicle_bookings
  add column if not exists start_odometer integer,
  add column if not exists end_odometer integer,
  add column if not exists completed_at timestamptz,
  add column if not exists completion_notes text;

alter table public.vehicle_bookings
  drop constraint if exists vehicle_bookings_odometer_check;
alter table public.vehicle_bookings
  add constraint vehicle_bookings_odometer_check check (
    (start_odometer is null or start_odometer >= 0)
    and (end_odometer is null or end_odometer >= 0)
    and (end_odometer is null or start_odometer is null or end_odometer >= start_odometer)
    and (
      status <> 'completed'
      or (start_odometer is not null and end_odometer is not null and completed_at is not null)
    )
  );

create index if not exists vehicle_bookings_start_idx
  on public.vehicle_bookings(start_at);
create index if not exists vehicle_bookings_person_idx
  on public.vehicle_bookings(person_id);
create index if not exists vehicle_bookings_program_idx
  on public.vehicle_bookings(program_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_vehicle_booking()
returns trigger language plpgsql as $$
declare
  selected_vehicle public.vehicles%rowtype;
begin
  select * into selected_vehicle
  from public.vehicles
  where id = new.vehicle_id;

  if selected_vehicle.status <> 'available' and new.status = 'scheduled' then
    raise exception 'O veículo selecionado não está disponível';
  end if;
  if new.passengers > selected_vehicle.capacity then
    raise exception 'O número de passageiros excede a capacidade do veículo';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicles_updated_at on public.vehicles;
create trigger vehicles_updated_at before update on public.vehicles
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_bookings_updated_at on public.vehicle_bookings;
create trigger vehicle_bookings_updated_at before update on public.vehicle_bookings
for each row execute function public.set_updated_at();

drop trigger if exists vehicle_booking_validation on public.vehicle_bookings;
create trigger vehicle_booking_validation before insert or update on public.vehicle_bookings
for each row execute function public.validate_vehicle_booking();

alter table public.vehicles enable row level security;
alter table public.vehicle_bookings enable row level security;

-- Políticas compatíveis com o modelo atual do app (chave anônima e seleção de pessoa).
-- Quando Supabase Auth for adotado, restrinja INSERT/UPDATE/DELETE por função.
create policy "vehicles_select_all" on public.vehicles for select using (true);
create policy "vehicles_insert_all" on public.vehicles for insert with check (true);
create policy "vehicles_update_all" on public.vehicles for update using (true) with check (true);
create policy "bookings_select_all" on public.vehicle_bookings for select using (true);
create policy "bookings_insert_all" on public.vehicle_bookings for insert with check (true);
create policy "bookings_update_all" on public.vehicle_bookings for update using (true) with check (true);

alter table public.activities drop constraint if exists activities_valid_schedule;
alter table public.activities add constraint activities_valid_schedule check (
  due_date is not null
  and ((start_datetime is null and end_datetime is null)
    or (start_datetime is not null and end_datetime is not null and end_datetime > start_datetime))
) not valid;

alter table public.expense_reports add column if not exists used_own_vehicle boolean not null default false;

create table if not exists public.school_visits (
  id uuid primary key default gen_random_uuid(),
  school_name text not null check (length(trim(school_name)) >= 2),
  visit_date date not null,
  expected_arrival time,
  expected_departure time,
  total_people integer not null check (total_people > 0),
  adults integer not null default 0 check (adults >= 0),
  children integer not null default 0 check (children >= 0),
  lunch_people integer not null default 0 check (lunch_people >= 0),
  breakfast_people integer not null default 0 check (breakfast_people >= 0),
  afternoon_coffee_people integer not null default 0 check (afternoon_coffee_people >= 0),
  dietary_restrictions text,
  notes text,
  estimated_meal_total numeric(12,2) not null default 0 check (estimated_meal_total >= 0),
  responsible_id uuid not null references public.persons(id),
  program_id uuid references public.programs(id),
  activity_id uuid references public.activities(id) on delete set null,
  future_activity_title text,
  created_by uuid not null references public.persons(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (adults + children <= total_people),
  check (lunch_people <= total_people and breakfast_people <= total_people and afternoon_coffee_people <= total_people),
  check (expected_departure is null or expected_arrival is null or expected_departure > expected_arrival)
);

alter table public.school_visits enable row level security;
drop policy if exists "school_visits_select" on public.school_visits;
create policy "school_visits_select" on public.school_visits for select to authenticated using (true);
drop policy if exists "school_visits_insert" on public.school_visits;
create policy "school_visits_insert" on public.school_visits for insert to authenticated with check (created_by = public.current_person_id());
drop policy if exists "school_visits_update" on public.school_visits;
create policy "school_visits_update" on public.school_visits for update to authenticated using (
  created_by = public.current_person_id() or responsible_id = public.current_person_id() or public.is_admin()
) with check (
  created_by = public.current_person_id() or responsible_id = public.current_person_id() or public.is_admin()
);

drop trigger if exists school_visits_set_updated_at on public.school_visits;
create trigger school_visits_set_updated_at before update on public.school_visits
for each row execute function public.set_updated_at();

grant select, insert, update on public.school_visits to authenticated;

alter table public.school_visits
  add column if not exists lunch_unit_price numeric(12,2) not null default 25
  check (lunch_unit_price >= 0);

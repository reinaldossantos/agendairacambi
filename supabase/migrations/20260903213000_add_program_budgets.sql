create table if not exists public.program_budgets (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  fiscal_year integer not null check (fiscal_year between 2000 and 2100),
  name text not null,
  description text,
  notes text,
  created_by uuid references public.persons(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, fiscal_year)
);

create table if not exists public.program_budget_lines (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.program_budgets(id) on delete cascade,
  line_type text not null default 'expense' check (line_type in ('revenue', 'expense')),
  group_name text not null,
  category_name text not null,
  monthly_amounts jsonb not null default '[0,0,0,0,0,0,0,0,0,0,0,0]'::jsonb,
  note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(monthly_amounts) = 'array' and jsonb_array_length(monthly_amounts) = 12)
);

create index if not exists program_budgets_program_year_idx on public.program_budgets(program_id, fiscal_year desc);
create index if not exists program_budget_lines_budget_idx on public.program_budget_lines(budget_id, sort_order);

drop trigger if exists program_budgets_updated_at on public.program_budgets;
create trigger program_budgets_updated_at before update on public.program_budgets
for each row execute function public.set_updated_at();
drop trigger if exists program_budget_lines_updated_at on public.program_budget_lines;
create trigger program_budget_lines_updated_at before update on public.program_budget_lines
for each row execute function public.set_updated_at();

alter table public.program_budgets enable row level security;
alter table public.program_budget_lines enable row level security;

create or replace function public.can_manage_program_budget(target_program_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
    or exists (select 1 from public.programs p where p.id = target_program_id and p.leader_id = public.current_person_id())
    or exists (select 1 from public.expense_approval_config c where c.person_id = public.current_person_id() and c.is_active);
$$;

revoke all on function public.can_manage_program_budget(uuid) from public;
grant execute on function public.can_manage_program_budget(uuid) to authenticated;

create policy program_budgets_active_read on public.program_budgets for select to authenticated using (public.is_active_user());
create policy program_budgets_manager_insert on public.program_budgets for insert to authenticated
with check (public.can_manage_program_budget(program_id) and created_by = public.current_person_id());
create policy program_budgets_manager_update on public.program_budgets for update to authenticated
using (public.can_manage_program_budget(program_id)) with check (public.can_manage_program_budget(program_id));
create policy program_budgets_manager_delete on public.program_budgets for delete to authenticated
using (public.can_manage_program_budget(program_id));

create policy program_budget_lines_active_read on public.program_budget_lines for select to authenticated using (public.is_active_user());
create policy program_budget_lines_manager_insert on public.program_budget_lines for insert to authenticated
with check (exists (select 1 from public.program_budgets b where b.id = budget_id and public.can_manage_program_budget(b.program_id)));
create policy program_budget_lines_manager_update on public.program_budget_lines for update to authenticated
using (exists (select 1 from public.program_budgets b where b.id = budget_id and public.can_manage_program_budget(b.program_id)))
with check (exists (select 1 from public.program_budgets b where b.id = budget_id and public.can_manage_program_budget(b.program_id)));
create policy program_budget_lines_manager_delete on public.program_budget_lines for delete to authenticated
using (exists (select 1 from public.program_budgets b where b.id = budget_id and public.can_manage_program_budget(b.program_id)));

grant select, insert, update, delete on public.program_budgets, public.program_budget_lines to authenticated;


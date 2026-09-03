alter table public.program_budgets
  add column if not exists status text not null default 'draft',
  add column if not exists submitted_at timestamptz,
  add column if not exists coordinator_signed_at timestamptz,
  add column if not exists coordinator_signed_by uuid references public.persons(id) on delete set null,
  add column if not exists approved_at timestamptz;

alter table public.program_budgets drop constraint if exists program_budgets_status_check;
alter table public.program_budgets add constraint program_budgets_status_check
  check (status in ('draft','pending_approval','changes_requested','rejected','approved'));

create table if not exists public.program_budget_approvals (
  id uuid primary key default gen_random_uuid(),
  budget_id uuid not null references public.program_budgets(id) on delete cascade,
  approver_id uuid not null references public.persons(id) on delete restrict,
  approver_key text not null check (approver_key in ('reinaldo','thais')),
  decision text not null default 'pending' check (decision in ('pending','approved','changes_requested','rejected')),
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  unique (budget_id, approver_key)
);

create index if not exists program_budget_approvals_budget_idx on public.program_budget_approvals(budget_id);
create index if not exists program_budget_approvals_person_idx on public.program_budget_approvals(approver_id, decision);
alter table public.program_budget_approvals enable row level security;
create policy program_budget_approvals_active_read on public.program_budget_approvals for select to authenticated using (public.is_active_user());
grant select on public.program_budget_approvals to authenticated;

drop policy if exists program_budgets_manager_update on public.program_budgets;
drop policy if exists program_budgets_manager_delete on public.program_budgets;
create policy program_budgets_manager_update on public.program_budgets for update to authenticated
using (public.can_manage_program_budget(program_id) and status in ('draft','changes_requested'))
with check (public.can_manage_program_budget(program_id) and status in ('draft','changes_requested'));
create policy program_budgets_manager_delete on public.program_budgets for delete to authenticated
using (public.can_manage_program_budget(program_id) and status in ('draft','changes_requested','rejected'));

drop policy if exists program_budget_lines_manager_insert on public.program_budget_lines;
drop policy if exists program_budget_lines_manager_update on public.program_budget_lines;
drop policy if exists program_budget_lines_manager_delete on public.program_budget_lines;
create policy program_budget_lines_manager_insert on public.program_budget_lines for insert to authenticated
with check (exists (select 1 from public.program_budgets b where b.id = budget_id and b.status in ('draft','changes_requested') and public.can_manage_program_budget(b.program_id)));
create policy program_budget_lines_manager_update on public.program_budget_lines for update to authenticated
using (exists (select 1 from public.program_budgets b where b.id = budget_id and b.status in ('draft','changes_requested') and public.can_manage_program_budget(b.program_id)))
with check (exists (select 1 from public.program_budgets b where b.id = budget_id and b.status in ('draft','changes_requested') and public.can_manage_program_budget(b.program_id)));
create policy program_budget_lines_manager_delete on public.program_budget_lines for delete to authenticated
using (exists (select 1 from public.program_budgets b where b.id = budget_id and b.status in ('draft','changes_requested') and public.can_manage_program_budget(b.program_id)));

create or replace function public.submit_program_budget(target_budget_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor uuid := public.current_person_id();
  target public.program_budgets%rowtype;
  leader uuid;
  reinaldo_id uuid;
  thais_id uuid;
begin
  select * into target from public.program_budgets where id = target_budget_id for update;
  if target.id is null then raise exception 'Orçamento não encontrado.'; end if;
  select leader_id into leader from public.programs where id = target.program_id;
  if actor is null or actor is distinct from leader then raise exception 'Somente o coordenador do programa pode finalizar este orçamento.'; end if;
  if target.status not in ('draft','changes_requested') then raise exception 'Este orçamento não pode ser finalizado no estado atual.'; end if;
  if not exists (select 1 from public.program_budget_lines where budget_id = target.id) then raise exception 'Cadastre ao menos uma rubrica antes de finalizar.'; end if;
  select person_id into reinaldo_id from public.expense_approval_config where approver_key = 'reinaldo' and is_active;
  select person_id into thais_id from public.expense_approval_config where approver_key = 'thais' and is_active;
  if reinaldo_id is null or thais_id is null then raise exception 'Configure Reinaldo e Thaís como aprovadores ativos.'; end if;

  delete from public.program_budget_approvals where budget_id = target.id;
  insert into public.program_budget_approvals (budget_id, approver_id, approver_key)
  values (target.id, reinaldo_id, 'reinaldo'), (target.id, thais_id, 'thais');
  update public.program_budgets set status = 'pending_approval', submitted_at = now(),
    coordinator_signed_at = now(), coordinator_signed_by = actor, approved_at = null
  where id = target.id;
end $$;

create or replace function public.decide_program_budget(target_budget_id uuid, requested_decision text, decision_comment text default null)
returns text language plpgsql security definer set search_path = public as $$
declare
  actor uuid := public.current_person_id();
  target public.program_budgets%rowtype;
  pending_count integer;
  resulting_status text;
begin
  if requested_decision not in ('approved','changes_requested','rejected') then raise exception 'Decisão inválida.'; end if;
  if requested_decision <> 'approved' and nullif(trim(decision_comment),'') is null then raise exception 'Informe a justificativa da decisão.'; end if;
  select * into target from public.program_budgets where id = target_budget_id for update;
  if target.id is null then raise exception 'Orçamento não encontrado.'; end if;
  if target.status <> 'pending_approval' then raise exception 'Este orçamento não está aguardando aprovação.'; end if;

  update public.program_budget_approvals set decision = requested_decision,
    comment = nullif(trim(decision_comment),''), decided_at = now()
  where budget_id = target.id and approver_id = actor and decision = 'pending';
  if not found then raise exception 'Você não possui aprovação pendente para este orçamento.'; end if;

  if requested_decision in ('changes_requested','rejected') then
    resulting_status := requested_decision;
  else
    select count(*) into pending_count from public.program_budget_approvals where budget_id = target.id and decision = 'pending';
    resulting_status := case when pending_count = 0 then 'approved' else 'pending_approval' end;
  end if;
  update public.program_budgets set status = resulting_status,
    approved_at = case when resulting_status = 'approved' then now() else null end
  where id = target.id;
  return resulting_status;
end $$;

revoke all on function public.submit_program_budget(uuid) from public;
revoke all on function public.decide_program_budget(uuid,text,text) from public;
grant execute on function public.submit_program_budget(uuid) to authenticated;
grant execute on function public.decide_program_budget(uuid,text,text) to authenticated;

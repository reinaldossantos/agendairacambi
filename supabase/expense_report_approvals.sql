-- Fluxo individual e auditável de aprovação dos relatórios de despesas.
-- Execute este arquivo no SQL Editor do Supabase após expense_reports.sql.

alter table public.expense_reports drop constraint if exists expense_reports_status_check;
alter table public.expense_reports add constraint expense_reports_status_check
  check (status in (
    'draft', 'pending_approval', 'changes_requested', 'rejected', 'approved',
    'provisioned', 'payment_scheduled', 'paid'
  ));

alter table public.expense_report_notifications
  drop constraint if exists expense_report_notifications_type_check;
alter table public.expense_report_notifications
  add constraint expense_report_notifications_type_check
  check (type in (
    'submitted', 'approval_requested', 'partial_approval', 'changes_requested',
    'rejected', 'approved', 'provisioned', 'payment_scheduled', 'paid'
  ));

create table if not exists public.expense_approval_config (
  person_id uuid primary key references public.persons(id) on delete cascade,
  approver_key text not null unique check (approver_key in ('reinaldo', 'thais')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vincula os aprovadores às pessoas existentes. Depois disso, a regra usa UUID,
-- e não o nome digitado na tela.
insert into public.expense_approval_config (person_id, approver_key)
select id, 'reinaldo' from public.persons
where lower(trim(name)) like 'reinaldo%'
order by is_active desc nulls last, name
limit 1
on conflict (approver_key) do update set person_id = excluded.person_id, is_active = true, updated_at = now();

insert into public.expense_approval_config (person_id, approver_key)
select id, 'thais' from public.persons
where lower(trim(name)) like 'thaís%' or lower(trim(name)) like 'thais%'
order by is_active desc nulls last, name
limit 1
on conflict (approver_key) do update set person_id = excluded.person_id, is_active = true, updated_at = now();

create table if not exists public.expense_report_approvals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.expense_reports(id) on delete cascade,
  approver_id uuid not null references public.persons(id) on delete restrict,
  decision text not null default 'pending'
    check (decision in ('pending', 'approved', 'changes_requested', 'rejected')),
  comment text,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, approver_id)
);

create index if not exists expense_report_approvals_report_idx
  on public.expense_report_approvals(report_id, created_at);
create index if not exists expense_report_approvals_approver_idx
  on public.expense_report_approvals(approver_id, decision);

drop trigger if exists expense_approval_config_updated_at on public.expense_approval_config;
create trigger expense_approval_config_updated_at before update on public.expense_approval_config
for each row execute function public.set_updated_at();
drop trigger if exists expense_report_approvals_updated_at on public.expense_report_approvals;
create trigger expense_report_approvals_updated_at before update on public.expense_report_approvals
for each row execute function public.set_updated_at();

alter table public.expense_approval_config enable row level security;
alter table public.expense_report_approvals enable row level security;

drop policy if exists "authenticated_read_expense_approval_config" on public.expense_approval_config;
create policy "authenticated_read_expense_approval_config"
on public.expense_approval_config for select to authenticated using (true);

drop policy if exists "authenticated_read_expense_report_approvals" on public.expense_report_approvals;
create policy "authenticated_read_expense_report_approvals"
on public.expense_report_approvals for select to authenticated using (true);

grant select on public.expense_approval_config to authenticated;
grant select on public.expense_report_approvals to authenticated;

create or replace function public.initialize_expense_report_approval(target_report_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  report_row public.expense_reports%rowtype;
  actor_id uuid;
  reinaldo_id uuid;
  thais_id uuid;
  required_ids uuid[];
  approver record;
begin
  select id into actor_id from public.persons where auth_user_id = auth.uid() order by access_role = 'admin' desc limit 1;
  select * into report_row from public.expense_reports where id = target_report_id for update;
  if report_row.id is null then raise exception 'Relatório não encontrado.'; end if;
  if actor_id is null or actor_id is distinct from report_row.person_id then
    raise exception 'Somente o autor pode enviar este relatório para aprovação.';
  end if;

  select person_id into reinaldo_id from public.expense_approval_config where approver_key = 'reinaldo' and is_active;
  select person_id into thais_id from public.expense_approval_config where approver_key = 'thais' and is_active;
  if reinaldo_id is null or thais_id is null then
    raise exception 'Configure Reinaldo e Thaís como aprovadores antes de enviar o relatório.';
  end if;

  required_ids := case
    when report_row.person_id = reinaldo_id then array[thais_id]
    when report_row.person_id = thais_id then array[reinaldo_id]
    else array[reinaldo_id, thais_id]
  end;

  delete from public.expense_report_approvals where report_id = target_report_id;
  insert into public.expense_report_approvals (report_id, approver_id)
  select target_report_id, unnest(required_ids);

  update public.expense_reports set
    status = 'pending_approval', submitted_at = now(), approved_by = null, approved_at = null
  where id = target_report_id;

  for approver in select id, name from public.persons where id = any(required_ids) loop
    insert into public.expense_report_notifications
      (report_id, recipient_id, actor_id, type, title, content)
    values
      (target_report_id, approver.id, actor_id, 'approval_requested', 'Aprovação de despesas',
       report_row.user_name || ' enviou o relatório nº ' || lpad(report_row.report_number::text, 5, '0') || ' para sua análise.')
    on conflict (report_id, recipient_id, type) do update
      set actor_id = excluded.actor_id, content = excluded.content, read_at = null, created_at = now();
  end loop;
end;
$$;

create or replace function public.decide_expense_report(
  target_report_id uuid,
  requested_decision text,
  decision_comment text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
  actor_name text;
  report_row public.expense_reports%rowtype;
  pending_count integer;
  next_status text;
  notification_title text;
  notification_content text;
begin
  if requested_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Decisão inválida.';
  end if;
  if requested_decision in ('changes_requested', 'rejected') and nullif(trim(decision_comment), '') is null then
    raise exception 'Informe uma justificativa para esta decisão.';
  end if;

  select id, name into actor_id, actor_name from public.persons where auth_user_id = auth.uid() order by access_role = 'admin' desc limit 1;
  select * into report_row from public.expense_reports where id = target_report_id for update;
  if report_row.id is null then raise exception 'Relatório não encontrado.'; end if;
  if actor_id is null or actor_id = report_row.person_id then raise exception 'O autor não pode aprovar o próprio relatório.'; end if;

  update public.expense_report_approvals set
    decision = requested_decision,
    comment = nullif(trim(decision_comment), ''),
    decided_at = now()
  where report_id = target_report_id and approver_id = actor_id and decision = 'pending';
  if not found then raise exception 'Você não possui uma aprovação pendente para este relatório.'; end if;

  if requested_decision = 'rejected' then
    next_status := 'rejected';
  elsif requested_decision = 'changes_requested' then
    next_status := 'changes_requested';
  else
    select count(*) into pending_count from public.expense_report_approvals
      where report_id = target_report_id and decision = 'pending';
    next_status := case when pending_count = 0 then 'approved' else 'pending_approval' end;
  end if;

  update public.expense_reports set
    status = next_status,
    approved_by = case when next_status = 'approved' then actor_id else null end,
    approved_at = case when next_status = 'approved' then now() else null end
  where id = target_report_id;

  if next_status = 'approved' then
    notification_title := 'Relatório aprovado';
    notification_content := 'Seu relatório nº ' || lpad(report_row.report_number::text, 5, '0') || ' recebeu todas as aprovações.';
  elsif next_status = 'pending_approval' then
    notification_title := 'Aprovação parcial';
    notification_content := actor_name || ' aprovou seu relatório nº ' || lpad(report_row.report_number::text, 5, '0') || '. Ainda há uma análise pendente.';
  elsif next_status = 'changes_requested' then
    notification_title := 'Ajustes solicitados';
    notification_content := 'Foram solicitados ajustes no relatório nº ' || lpad(report_row.report_number::text, 5, '0') || ': ' || trim(decision_comment);
  else
    notification_title := 'Relatório reprovado';
    notification_content := 'O relatório nº ' || lpad(report_row.report_number::text, 5, '0') || ' foi reprovado: ' || trim(decision_comment);
  end if;

  insert into public.expense_report_notifications
    (report_id, recipient_id, actor_id, type, title, content)
  values
    (target_report_id, report_row.person_id, actor_id,
     case when next_status = 'pending_approval' then 'partial_approval' else next_status end,
     notification_title, notification_content)
  on conflict (report_id, recipient_id, type) do update
    set actor_id = excluded.actor_id, title = excluded.title, content = excluded.content,
        read_at = null, created_at = now();

  return next_status;
end;
$$;

revoke all on function public.initialize_expense_report_approval(uuid) from public;
revoke all on function public.decide_expense_report(uuid, text, text) from public;
grant execute on function public.initialize_expense_report_approval(uuid) to authenticated;
grant execute on function public.decide_expense_report(uuid, text, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'expense_report_approvals'
  ) then
    alter publication supabase_realtime add table public.expense_report_approvals;
  end if;
end $$;

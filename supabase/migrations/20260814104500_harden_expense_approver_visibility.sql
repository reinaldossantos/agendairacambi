-- Faz a autorizacao de despesas pela conta Auth, mesmo quando ha perfis de pessoa duplicados.

drop policy if exists "expense_reports_select_all" on public.expense_reports;
drop policy if exists expense_reports_scoped_read on public.expense_reports;
create policy expense_reports_scoped_read on public.expense_reports
for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.persons owner
    where owner.id = expense_reports.person_id
      and owner.auth_user_id = auth.uid()
      and owner.is_active and owner.locked_at is null
  )
  or exists (
    select 1
    from public.expense_report_approvals approval
    join public.persons approver on approver.id = approval.approver_id
    where approval.report_id = expense_reports.id
      and approver.auth_user_id = auth.uid()
      and approver.is_active and approver.locked_at is null
  )
);

drop policy if exists "expense_notifications_select_all" on public.expense_report_notifications;
drop policy if exists "expense_notifications_select_recipient" on public.expense_report_notifications;
drop policy if exists expense_notifications_own_read on public.expense_report_notifications;
create policy expense_notifications_own_read on public.expense_report_notifications
for select to authenticated using (
  public.is_admin()
  or exists (
    select 1 from public.persons recipient
    where recipient.id = expense_report_notifications.recipient_id
      and recipient.auth_user_id = auth.uid()
      and recipient.is_active and recipient.locked_at is null
  )
  or exists (
    select 1 from public.persons actor
    where actor.id = expense_report_notifications.actor_id
      and actor.auth_user_id = auth.uid()
      and actor.is_active and actor.locked_at is null
  )
);

drop policy if exists "expense_notifications_update_all" on public.expense_report_notifications;
drop policy if exists "expense_notifications_update_recipient" on public.expense_report_notifications;
drop policy if exists expense_notifications_own_update on public.expense_report_notifications;
create policy expense_notifications_own_update on public.expense_report_notifications
for update to authenticated
using (
  exists (
    select 1 from public.persons recipient
    where recipient.id = expense_report_notifications.recipient_id
      and recipient.auth_user_id = auth.uid()
      and recipient.is_active and recipient.locked_at is null
  )
)
with check (
  exists (
    select 1 from public.persons recipient
    where recipient.id = expense_report_notifications.recipient_id
      and recipient.auth_user_id = auth.uid()
      and recipient.is_active and recipient.locked_at is null
  )
);

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
  if requested_decision not in ('approved', 'changes_requested', 'rejected') then raise exception 'Decisao invalida.'; end if;
  if requested_decision in ('changes_requested', 'rejected') and nullif(trim(decision_comment), '') is null then
    raise exception 'Informe uma justificativa para esta decisao.';
  end if;

  select approval.approver_id, person.name into actor_id, actor_name
  from public.expense_report_approvals approval
  join public.persons person on person.id = approval.approver_id
  where approval.report_id = target_report_id
    and approval.decision = 'pending'
    and person.auth_user_id = auth.uid()
    and person.is_active and person.locked_at is null
  limit 1;

  select * into report_row from public.expense_reports where id = target_report_id for update;
  if report_row.id is null then raise exception 'Relatorio nao encontrado.'; end if;
  if actor_id is null then raise exception 'Voce nao possui uma aprovacao pendente para este relatorio.'; end if;

  update public.expense_report_approvals set
    decision = requested_decision,
    comment = nullif(trim(decision_comment), ''),
    decided_at = now()
  where report_id = target_report_id and approver_id = actor_id and decision = 'pending';

  if requested_decision = 'rejected' then next_status := 'rejected';
  elsif requested_decision = 'changes_requested' then next_status := 'changes_requested';
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

  notification_title := case next_status
    when 'approved' then 'Relatorio aprovado'
    when 'pending_approval' then 'Aprovacao parcial'
    when 'changes_requested' then 'Ajustes solicitados'
    else 'Relatorio reprovado' end;
  notification_content := case next_status
    when 'approved' then 'Seu relatorio recebeu todas as aprovacoes.'
    when 'pending_approval' then actor_name || ' aprovou seu relatorio. Ainda ha uma analise pendente.'
    when 'changes_requested' then 'Foram solicitados ajustes: ' || trim(decision_comment)
    else 'O relatorio foi reprovado: ' || trim(decision_comment) end;

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

revoke all on function public.decide_expense_report(uuid, text, text) from public;
grant execute on function public.decide_expense_report(uuid, text, text) to authenticated;

-- Reabre a notificacao de todas as aprovacoes pendentes para o perfil configurado.
insert into public.expense_report_notifications
  (report_id, recipient_id, actor_id, type, title, content, read_at, created_at)
select report.id, approval.approver_id, report.person_id, 'approval_requested',
  'Aprovacao de despesas',
  report.user_name || ' enviou o relatorio n. ' || lpad(report.report_number::text, 5, '0') || ' para sua analise.',
  null, now()
from public.expense_reports report
join public.expense_report_approvals approval on approval.report_id = report.id and approval.decision = 'pending'
join public.persons approver on approver.id = approval.approver_id
where report.status = 'pending_approval'
  and approver.auth_user_id is not null
  and approver.is_active and approver.locked_at is null
on conflict (report_id, recipient_id, type) do update
set actor_id = excluded.actor_id, title = excluded.title, content = excluded.content,
    read_at = null, created_at = now();

notify pgrst, 'reload schema';

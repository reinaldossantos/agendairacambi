-- Garante que o fluxo de despesas use o perfil ativo realmente ligado ao Auth da Thaís.
-- Repara também aprovações/notificações pendentes criadas com um person_id legado.

create or replace function public.configured_expense_approver_id(requested_key text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.expense_approval_config c
  join public.persons p on p.id = c.person_id
  where c.approver_key = requested_key
    and c.is_active
    and p.is_active
    and p.locked_at is null
    and p.auth_user_id is not null
  limit 1
$$;

revoke all on function public.configured_expense_approver_id(text) from public;
grant execute on function public.configured_expense_approver_id(text) to authenticated;

do $$
declare
  legacy_thais_id uuid;
  canonical_thais_id uuid;
begin
  select person_id into legacy_thais_id
  from public.expense_approval_config
  where approver_key = 'thais';

  select id into canonical_thais_id
  from public.persons
  where is_active
    and locked_at is null
    and auth_user_id is not null
    and (lower(email) = 'thais@iracambi.com' or lower(name) in ('thaís', 'thais'))
  order by
    (lower(email) = 'thais@iracambi.com') desc,
    created_at desc nulls last
  limit 1;

  if canonical_thais_id is null then
    raise exception 'Perfil autenticado e ativo da Thaís não foi encontrado.';
  end if;

  update public.expense_approval_config
  set person_id = canonical_thais_id, is_active = true, updated_at = now()
  where approver_key = 'thais';

  if legacy_thais_id is not null and legacy_thais_id is distinct from canonical_thais_id then
    delete from public.expense_report_approvals old_approval
    where old_approval.approver_id = legacy_thais_id
      and old_approval.decision = 'pending'
      and exists (
        select 1 from public.expense_report_approvals current_approval
        where current_approval.report_id = old_approval.report_id
          and current_approval.approver_id = canonical_thais_id
      );

    update public.expense_report_approvals
    set approver_id = canonical_thais_id, updated_at = now()
    where approver_id = legacy_thais_id
      and decision = 'pending';
  end if;

  insert into public.expense_report_notifications
    (report_id, recipient_id, actor_id, type, title, content, read_at, created_at)
  select
    report.id,
    canonical_thais_id,
    report.person_id,
    'approval_requested',
    'Aprovação de despesas',
    report.user_name || ' enviou o relatório nº ' || lpad(report.report_number::text, 5, '0') || ' para sua análise.',
    null,
    now()
  from public.expense_reports report
  join public.expense_report_approvals approval
    on approval.report_id = report.id
   and approval.approver_id = canonical_thais_id
   and approval.decision = 'pending'
  where report.status = 'pending_approval'
  on conflict (report_id, recipient_id, type) do update
    set actor_id = excluded.actor_id,
        title = excluded.title,
        content = excluded.content,
        read_at = null,
        created_at = now();

  if legacy_thais_id is not null and legacy_thais_id is distinct from canonical_thais_id then
    delete from public.expense_report_notifications legacy_notification
    where legacy_notification.recipient_id = legacy_thais_id
      and legacy_notification.type = 'approval_requested'
      and exists (
        select 1 from public.expense_report_approvals approval
        where approval.report_id = legacy_notification.report_id
          and approval.approver_id = canonical_thais_id
          and approval.decision = 'pending'
      );
  end if;

  insert into public.system_audit_logs
    (table_name, action, actor_name, record_id, changed_fields, old_data, new_data, request_path)
  values
    ('expense_approval_config', 'UPDATE', 'Sistema', canonical_thais_id::text,
     array['person_id'], jsonb_build_object('legacy_thais_id', legacy_thais_id),
     jsonb_build_object('canonical_thais_id', canonical_thais_id), '/maintenance/repair-expense-approver');
end $$;

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
  select id into actor_id from public.persons where auth_user_id = auth.uid() and is_active and locked_at is null order by access_role = 'admin' desc limit 1;
  select * into report_row from public.expense_reports where id = target_report_id for update;
  if report_row.id is null then raise exception 'Relatório não encontrado.'; end if;
  if actor_id is null or actor_id is distinct from report_row.person_id then
    raise exception 'Somente o autor pode enviar este relatório para aprovação.';
  end if;

  reinaldo_id := public.configured_expense_approver_id('reinaldo');
  thais_id := public.configured_expense_approver_id('thais');
  if reinaldo_id is null or thais_id is null then
    raise exception 'Configure Reinaldo e Thaís com perfis autenticados e ativos antes de enviar o relatório.';
  end if;

  required_ids := case
    when report_row.person_id = reinaldo_id then array[thais_id]
    when report_row.person_id = thais_id then array[reinaldo_id]
    else array[reinaldo_id, thais_id]
  end;

  delete from public.expense_report_approvals where report_id = target_report_id;
  insert into public.expense_report_approvals (report_id, approver_id)
  select target_report_id, unnest(required_ids);

  update public.expense_reports set status = 'pending_approval', submitted_at = now(), approved_by = null, approved_at = null
  where id = target_report_id;

  for approver in select id from public.persons where id = any(required_ids) loop
    insert into public.expense_report_notifications
      (report_id, recipient_id, actor_id, type, title, content)
    values
      (target_report_id, approver.id, actor_id, 'approval_requested', 'Aprovação de despesas',
       report_row.user_name || ' enviou o relatório nº ' || lpad(report_row.report_number::text, 5, '0') || ' para sua análise.')
    on conflict (report_id, recipient_id, type) do update
      set actor_id = excluded.actor_id, title = excluded.title, content = excluded.content, read_at = null, created_at = now();
  end loop;
end;
$$;

revoke all on function public.initialize_expense_report_approval(uuid) from public;
grant execute on function public.initialize_expense_report_approval(uuid) to authenticated;

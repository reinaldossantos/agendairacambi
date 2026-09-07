-- Mantém a solicitação em análise até todos os aprovadores se manifestarem.
-- A decisão final consolida as manifestações individuais sem apagar a auditoria.
create or replace function public.decide_purchase_request(
  target_request_id uuid,
  requested_decision text,
  decision_comment text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := public.current_person_id();
  actor_name text;
  request_row public.purchase_requests%rowtype;
  pending_count integer;
  rejected_count integer;
  changes_count integer;
  resulting_status text;
begin
  if requested_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Decisão inválida.';
  end if;
  if requested_decision <> 'approved' and nullif(trim(decision_comment), '') is null then
    raise exception 'Informe a justificativa da decisão.';
  end if;

  select * into request_row
  from public.purchase_requests
  where id = target_request_id
  for update;

  select name into actor_name from public.persons where id = actor;
  if request_row.id is null then raise exception 'Solicitação não encontrada.'; end if;
  if actor = request_row.requester_id then raise exception 'O solicitante não pode aprovar a própria solicitação.'; end if;

  update public.purchase_request_approvals
  set decision = requested_decision,
      comment = nullif(trim(decision_comment), ''),
      decided_at = now()
  where request_id = target_request_id
    and approver_id = actor
    and decision = 'pending';

  if not found then
    raise exception 'Você não possui aprovação pendente para esta solicitação.';
  end if;

  select
    count(*) filter (where decision = 'pending'),
    count(*) filter (where decision = 'rejected'),
    count(*) filter (where decision = 'changes_requested')
  into pending_count, rejected_count, changes_count
  from public.purchase_request_approvals
  where request_id = target_request_id;

  resulting_status := case
    when pending_count > 0 then 'pending_approval'
    when rejected_count > 0 then 'rejected'
    when changes_count > 0 then 'changes_requested'
    else 'approved'
  end;

  update public.purchase_requests
  set status = resulting_status,
      approved_at = case when resulting_status = 'approved' then now() else null end
  where id = target_request_id;

  insert into public.purchase_request_history(request_id, actor_id, event_type, content, metadata)
  values (
    target_request_id,
    actor,
    requested_decision,
    coalesce(nullif(trim(decision_comment), ''), actor_name || ' aprovou a solicitação.'),
    jsonb_build_object('status', resulting_status)
  );

  insert into public.purchase_request_notifications(request_id, recipient_id, actor_id, type, title, content)
  values (
    target_request_id,
    request_row.requester_id,
    actor,
    resulting_status,
    case resulting_status
      when 'approved' then 'Solicitação aprovada'
      when 'pending_approval' then 'Aprovação parcial'
      when 'changes_requested' then 'Ajustes solicitados'
      else 'Solicitação reprovada'
    end,
    'A solicitação nº ' || lpad(request_row.request_number::text, 5, '0') || ' foi analisada por ' || actor_name || '.'
  );

  return resulting_status;
end
$$;

revoke all on function public.decide_purchase_request(uuid, text, text) from public;
grant execute on function public.decide_purchase_request(uuid, text, text) to authenticated;

-- Reabre registros antigos encerrados antes de todos os aprovadores decidirem.
update public.purchase_requests request
set status = 'pending_approval',
    approved_at = null
where request.status in ('rejected', 'changes_requested')
  and exists (
    select 1
    from public.purchase_request_approvals approval
    where approval.request_id = request.id
      and approval.decision = 'pending'
  );

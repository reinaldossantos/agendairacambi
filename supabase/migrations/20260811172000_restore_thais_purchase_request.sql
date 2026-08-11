-- Restaura a solicitação da Thaís cancelada acidentalmente pela interface.
-- O cancelamento permanece no histórico e ganha um registro corretivo explícito.

do $$
declare
  target_request public.purchase_requests%rowtype;
  cancellation record;
  correction_actor uuid;
begin
  if (select count(*) from public.purchase_requests) <> 1 then
    raise exception 'Restauração abortada: o banco não possui exatamente uma solicitação de compra.';
  end if;

  select pr.* into target_request
  from public.purchase_requests pr
  join public.expense_approval_config cfg
    on cfg.person_id = pr.requester_id and cfg.approver_key = 'thais'
  where pr.status = 'cancelled'
    and not exists (
      select 1 from public.purchase_request_history h
      where h.request_id = pr.id and h.metadata->>'correction_key' = 'accidental_cancel_20260811'
    )
  order by pr.updated_at desc
  limit 1;

  if target_request.id is null then
    raise exception 'Nenhuma solicitação cancelada da Thaís foi encontrada para restauração.';
  end if;

  select h.metadata->>'from' as previous_status, h.created_at
  into cancellation
  from public.purchase_request_history h
  where h.request_id = target_request.id
    and h.event_type = 'status'
    and h.metadata->>'to' = 'cancelled'
  order by h.created_at desc
  limit 1;

  if cancellation.previous_status not in ('approved','quotation','ordered','partially_received') then
    raise exception 'O estado anterior da solicitação não pôde ser validado com segurança.';
  end if;

  select person_id into correction_actor
  from public.expense_approval_config
  where approver_key = 'reinaldo' and is_active;

  update public.purchase_requests
  set status = cancellation.previous_status
  where id = target_request.id and status = 'cancelled';

  insert into public.purchase_request_history(request_id, actor_id, event_type, content, metadata)
  values(
    target_request.id, correction_actor, 'status',
    'Cancelamento desfeito administrativamente após acionamento acidental na interface.',
    jsonb_build_object(
      'from', 'cancelled', 'to', cancellation.previous_status,
      'correction_key', 'accidental_cancel_20260811',
      'original_cancellation_at', cancellation.created_at
    )
  );

  insert into public.purchase_request_notifications(request_id, recipient_id, actor_id, type, title, content)
  values(
    target_request.id, target_request.requester_id, correction_actor, 'status_restored',
    'Solicitação de compra restaurada',
    'O cancelamento acidental da solicitação nº ' || lpad(target_request.request_number::text, 5, '0') || ' foi desfeito e o processo retornou à situação anterior.'
  );
end $$;

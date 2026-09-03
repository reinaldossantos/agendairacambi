alter table public.expense_reports
  add column if not exists paid_by uuid references public.persons(id) on delete set null,
  add column if not exists payment_receipt jsonb;

alter table public.expense_reports drop constraint if exists expense_reports_paid_receipt_check;
alter table public.expense_reports add constraint expense_reports_paid_receipt_check check (
  status <> 'paid' or (
    paid_at is not null and paid_by is not null and jsonb_typeof(payment_receipt) = 'object'
    and nullif(trim(payment_receipt->>'path'),'') is not null
  )
) not valid;

create or replace function public.record_expense_report_payment(target_report_id uuid, receipt jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  actor uuid := public.current_person_id();
  target public.expense_reports%rowtype;
begin
  if actor is null or not exists (
    select 1 from public.expense_approval_config where person_id = actor and is_active
  ) then raise exception 'Somente Reinaldo ou Thaís podem registrar o pagamento.'; end if;
  if jsonb_typeof(receipt) <> 'object'
    or nullif(trim(receipt->>'path'),'') is null
    or nullif(trim(receipt->>'name'),'') is null
  then raise exception 'Anexe o comprovante de pagamento.'; end if;

  select * into target from public.expense_reports where id = target_report_id for update;
  if target.id is null then raise exception 'Relatório não encontrado.'; end if;
  if target.status <> 'payment_scheduled' then raise exception 'O relatório precisa estar com pagamento agendado.'; end if;

  update public.expense_reports set status = 'paid', paid_at = now(), paid_by = actor,
    payment_receipt = receipt where id = target.id;

  if target.person_id is not null then
    insert into public.expense_report_notifications(report_id, recipient_id, actor_id, type, title, content)
    values(target.id, target.person_id, actor, 'paid', 'Pagamento realizado',
      'O pagamento do relatório nº ' || lpad(target.report_number::text, 5, '0') || ' foi realizado e o comprovante está disponível.')
    on conflict (report_id, recipient_id, type) do update set actor_id = excluded.actor_id,
      title = excluded.title, content = excluded.content, read_at = null, created_at = now();
  end if;
end $$;

revoke all on function public.record_expense_report_payment(uuid,jsonb) from public;
grant execute on function public.record_expense_report_payment(uuid,jsonb) to authenticated;

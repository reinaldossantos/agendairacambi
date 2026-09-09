-- Solicitações simples de reposição do restaurante e lista consolidada de compras.
create table if not exists public.restaurant_restock_requests (
  id uuid primary key default gen_random_uuid(),
  product_name text not null check (length(trim(product_name)) >= 2),
  urgency text not null check (urgency in ('running_low','out_of_stock')),
  quantity numeric(12,2) check (quantity is null or quantity > 0),
  unit text,
  notes text,
  status text not null default 'requested' check (status in ('requested','purchasing','restocked','cancelled')),
  requested_by uuid not null references public.persons(id) on delete restrict,
  requested_at timestamptz not null default now(),
  updated_by uuid references public.persons(id) on delete restrict,
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.restaurant_restock_notifications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.restaurant_restock_requests(id) on delete cascade,
  recipient_id uuid not null references public.persons(id) on delete cascade,
  actor_id uuid references public.persons(id) on delete set null,
  title text not null,
  content text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists restaurant_restock_open_idx on public.restaurant_restock_requests(status, urgency, requested_at);
create index if not exists restaurant_restock_notifications_recipient_idx on public.restaurant_restock_notifications(recipient_id, read_at, created_at desc);

create or replace function public.normalized_person_name(person_name text)
returns text language sql immutable parallel safe as $$
  select lower(translate(trim(coalesce(person_name,'')), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'));
$$;

create or replace function public.is_restaurant_operator(person_id uuid default public.current_person_id())
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.persons p where p.id=person_id and p.is_active and public.normalized_person_name(p.name) in ('laiza','luciana'));
$$;

create or replace function public.can_manage_restaurant_restock(person_id uuid default public.current_person_id())
returns boolean language sql stable security definer set search_path=public as $$
  select public.is_admin() or exists(
    select 1 from public.persons p where p.id=person_id and p.is_active and public.normalized_person_name(p.name) in ('thais','arielle')
  );
$$;

create or replace function public.create_restaurant_restock_request(
  requested_product_name text, requested_urgency text, requested_quantity numeric default null,
  requested_unit text default null, requested_notes text default null
) returns uuid language plpgsql security definer set search_path=public as $$
declare actor uuid:=public.current_person_id(); new_id uuid; recipient record;
begin
  if actor is null or not public.is_active_user() then raise exception 'Usuário sem acesso ativo.'; end if;
  if not public.is_restaurant_operator(actor) and not public.can_manage_restaurant_restock(actor) then raise exception 'Seu perfil não pode solicitar reposições do restaurante.'; end if;
  if length(trim(coalesce(requested_product_name,''))) < 2 then raise exception 'Informe o produto.'; end if;
  if requested_urgency not in ('running_low','out_of_stock') then raise exception 'Informe se o produto está acabando ou acabou.'; end if;
  if requested_quantity is not null and requested_quantity <= 0 then raise exception 'Informe uma quantidade válida.'; end if;
  insert into public.restaurant_restock_requests(product_name,urgency,quantity,unit,notes,requested_by)
  values(initcap(trim(requested_product_name)),requested_urgency,requested_quantity,nullif(trim(requested_unit),''),nullif(trim(requested_notes),''),actor)
  returning id into new_id;
  for recipient in select id from public.persons where is_active and public.normalized_person_name(name) in ('thais','arielle') loop
    insert into public.restaurant_restock_notifications(request_id,recipient_id,actor_id,title,content)
    values(new_id,recipient.id,actor,case when requested_urgency='out_of_stock' then 'Produto acabou no restaurante' else 'Produto acabando no restaurante' end,initcap(trim(requested_product_name))||' precisa de reposição.');
  end loop;
  return new_id;
end $$;

create or replace function public.update_restaurant_restock_status(target_request_id uuid, requested_status text)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=public.current_person_id(); item public.restaurant_restock_requests%rowtype;
begin
  if not public.can_manage_restaurant_restock(actor) then raise exception 'Somente a gestão do restaurante pode atualizar esta solicitação.'; end if;
  if requested_status not in ('requested','purchasing','restocked','cancelled') then raise exception 'Situação inválida.'; end if;
  select * into item from public.restaurant_restock_requests where id=target_request_id for update;
  if not found then raise exception 'Solicitação não encontrada.'; end if;
  update public.restaurant_restock_requests set status=requested_status,updated_by=actor,updated_at=now(),completed_at=case when requested_status in ('restocked','cancelled') then now() else null end where id=target_request_id;
end $$;

alter table public.restaurant_restock_requests enable row level security;
alter table public.restaurant_restock_notifications enable row level security;
create policy restaurant_restock_active_read on public.restaurant_restock_requests for select to authenticated using (public.is_active_user());
create policy restaurant_notifications_own_read on public.restaurant_restock_notifications for select to authenticated using (recipient_id=public.current_person_id() or public.is_admin());
create policy restaurant_notifications_own_update on public.restaurant_restock_notifications for update to authenticated using (recipient_id=public.current_person_id()) with check (recipient_id=public.current_person_id());
grant select on public.restaurant_restock_requests to authenticated;
grant select,update(read_at) on public.restaurant_restock_notifications to authenticated;
grant execute on function public.is_restaurant_operator(uuid), public.can_manage_restaurant_restock(uuid), public.create_restaurant_restock_request(text,text,numeric,text,text), public.update_restaurant_restock_status(uuid,text) to authenticated;

alter table public.notification_read_audit drop constraint if exists notification_read_audit_notification_source_check;
alter table public.notification_read_audit add constraint notification_read_audit_notification_source_check check (notification_source in ('activity','expense_report','security','project','purchase_request','restaurant_restock'));

-- Substitui a leitura centralizada para incluir notificações do restaurante.
create or replace function public.read_notification(requested_source text, requested_id text)
returns void language plpgsql security definer set search_path=public as $$
declare actor uuid:=public.current_person_id(); actor_name text; notification_title text;
begin
  if actor is null or not public.is_active_user() then raise exception 'Usuário sem acesso ativo.'; end if;
  case requested_source
    when 'activity' then
      select case l.type when 'comment' then 'Novo comentário' when 'file' then 'Novo arquivo' else 'Atualização da atividade' end into notification_title from public.activity_logs l join public.activities a on a.id=l.activity_id where l.id::text=requested_id and (l.person_id=actor or a.responsible_id=actor or actor=any(coalesce(a.involved_ids,'{}'::uuid[])));
      if notification_title is not null then insert into public.activity_notification_reads(log_id,person_id,read_at) values(requested_id,actor,now()) on conflict(log_id,person_id) do nothing; end if;
    when 'expense_report' then update public.expense_report_notifications set read_at=coalesce(read_at,now()) where id=requested_id::uuid and recipient_id=actor returning title into notification_title;
    when 'security' then update public.security_notifications set is_read=true where id=requested_id::bigint and recipient_id=actor returning title into notification_title;
    when 'project' then update public.management_project_notifications set read_at=coalesce(read_at,now()) where id=requested_id::uuid and recipient_id=actor returning title into notification_title;
    when 'purchase_request' then update public.purchase_request_notifications set read_at=coalesce(read_at,now()) where id=requested_id::uuid and recipient_id=actor returning title into notification_title;
    when 'restaurant_restock' then update public.restaurant_restock_notifications set read_at=coalesce(read_at,now()) where id=requested_id::uuid and recipient_id=actor returning title into notification_title;
    else raise exception 'Origem de notificação inválida.';
  end case;
  if notification_title is null then raise exception 'Notificação não encontrada ou sem acesso.'; end if;
  insert into public.notification_read_audit(person_id,notification_source,notification_id,title) values(actor,requested_source,requested_id,notification_title) on conflict(person_id,notification_source,notification_id) do nothing;
  if found then select name into actor_name from public.persons where id=actor; insert into public.system_audit_logs(table_name,record_id,action,actor_id,actor_name,changed_fields,new_data,request_path) values('notification_read_audit',requested_source||':'||requested_id,'INSERT',actor,actor_name,array['person_id','notification_source','notification_id','title','read_at'],jsonb_build_object('person_id',actor,'source',requested_source,'notification_id',requested_id,'title',notification_title,'read_at',now()),'notification/read'); end if;
end $$;

do $$ begin if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='restaurant_restock_notifications') then alter publication supabase_realtime add table public.restaurant_restock_notifications; end if; end $$;
notify pgrst, 'reload schema';

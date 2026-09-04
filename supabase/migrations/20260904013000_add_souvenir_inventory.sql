-- Estoque e movimentação de souvenires da Iracambi.
create table if not exists public.souvenir_products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 2),
  sku text unique,
  category text,
  description text,
  cost_price numeric(12,2) not null default 0 check (cost_price >= 0),
  sale_price numeric(12,2) not null default 0 check (sale_price >= 0),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  minimum_stock integer not null default 0 check (minimum_stock >= 0),
  is_active boolean not null default true,
  created_by uuid not null references public.persons(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.souvenir_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.souvenir_products(id) on delete restrict,
  movement_type text not null check (movement_type in ('entry','sale','bonus')),
  quantity integer not null check (quantity > 0),
  unit_cost numeric(12,2) check (unit_cost is null or unit_cost >= 0),
  unit_sale_price numeric(12,2) check (unit_sale_price is null or unit_sale_price >= 0),
  recipient_name text,
  notes text,
  status text not null check (status in ('pending_approval','approved','rejected')),
  requested_by uuid not null references public.persons(id) on delete restrict,
  requested_at timestamptz not null default now(),
  decided_by uuid references public.persons(id) on delete restrict,
  decided_at timestamptz,
  decision_comment text,
  created_at timestamptz not null default now(),
  constraint souvenir_recipient_required check (
    movement_type = 'entry' or length(trim(coalesce(recipient_name, ''))) >= 2
  ),
  constraint souvenir_sale_price_required check (
    movement_type <> 'sale' or unit_sale_price is not null
  )
);

create index if not exists souvenir_products_active_idx on public.souvenir_products(is_active, name);
create index if not exists souvenir_movements_product_idx on public.souvenir_movements(product_id, created_at desc);
create index if not exists souvenir_movements_status_idx on public.souvenir_movements(status, created_at desc);

drop trigger if exists souvenir_products_updated_at on public.souvenir_products;
create trigger souvenir_products_updated_at before update on public.souvenir_products
for each row execute function public.set_updated_at();

create or replace function public.can_manage_souvenirs()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.expense_approval_config c
    where c.person_id = public.current_person_id() and c.is_active
  );
$$;

create or replace function public.create_souvenir_movement(
  target_product_id uuid,
  requested_type text,
  requested_quantity integer,
  requested_unit_cost numeric default null,
  requested_unit_sale_price numeric default null,
  requested_recipient text default null,
  requested_notes text default null
)
returns uuid language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_person_id();
  product public.souvenir_products%rowtype;
  movement_id uuid;
  movement_status text;
  effective_cost numeric;
  effective_sale numeric;
begin
  if actor is null then raise exception 'Usuário autenticado inválido.'; end if;
  if requested_type not in ('entry','sale','bonus') then raise exception 'Tipo de movimentação inválido.'; end if;
  if requested_quantity is null or requested_quantity <= 0 then raise exception 'Informe uma quantidade válida.'; end if;
  select * into product from public.souvenir_products where id = target_product_id and is_active for update;
  if not found then raise exception 'Produto não encontrado ou inativo.'; end if;
  if requested_type <> 'entry' and length(trim(coalesce(requested_recipient,''))) < 2 then
    raise exception 'Informe para quem o produto foi vendido ou entregue.';
  end if;
  effective_cost := coalesce(requested_unit_cost, product.cost_price);
  effective_sale := case when requested_type = 'sale' then coalesce(requested_unit_sale_price, product.sale_price) else null end;
  movement_status := case when requested_type = 'bonus' then 'pending_approval' else 'approved' end;
  if requested_type = 'sale' and product.stock_quantity < requested_quantity then raise exception 'Estoque insuficiente para esta venda.'; end if;

  insert into public.souvenir_movements(product_id,movement_type,quantity,unit_cost,unit_sale_price,recipient_name,notes,status,requested_by)
  values(target_product_id,requested_type,requested_quantity,effective_cost,effective_sale,nullif(trim(requested_recipient),''),nullif(trim(requested_notes),''),movement_status,actor)
  returning id into movement_id;

  if requested_type = 'entry' then
    update public.souvenir_products set stock_quantity = stock_quantity + requested_quantity,
      cost_price = effective_cost where id = target_product_id;
  elsif requested_type = 'sale' then
    update public.souvenir_products set stock_quantity = stock_quantity - requested_quantity where id = target_product_id;
  end if;
  return movement_id;
end;
$$;

create or replace function public.decide_souvenir_bonus(
  target_movement_id uuid,
  requested_decision text,
  requested_comment text default null
)
returns void language plpgsql security definer set search_path = public
as $$
declare
  actor uuid := public.current_person_id();
  movement public.souvenir_movements%rowtype;
  product public.souvenir_products%rowtype;
begin
  if actor is null then raise exception 'Usuário autenticado inválido.'; end if;
  if requested_decision not in ('approved','rejected') then raise exception 'Decisão inválida.'; end if;
  if not exists (select 1 from public.expense_approval_config c where c.person_id = actor and c.is_active) then
    raise exception 'Somente a gestão autorizadora pode decidir bonificações.';
  end if;
  select * into movement from public.souvenir_movements where id = target_movement_id for update;
  if not found or movement.movement_type <> 'bonus' or movement.status <> 'pending_approval' then
    raise exception 'Esta bonificação não está aguardando autorização.';
  end if;
  if movement.requested_by = actor then raise exception 'O solicitante não pode autorizar a própria bonificação.'; end if;
  if requested_decision = 'rejected' and length(trim(coalesce(requested_comment,''))) < 3 then
    raise exception 'Informe a justificativa da rejeição.';
  end if;
  if requested_decision = 'approved' then
    select * into product from public.souvenir_products where id = movement.product_id for update;
    if product.stock_quantity < movement.quantity then raise exception 'Estoque insuficiente para autorizar esta bonificação.'; end if;
    update public.souvenir_products set stock_quantity = stock_quantity - movement.quantity where id = movement.product_id;
  end if;
  update public.souvenir_movements set status=requested_decision, decided_by=actor, decided_at=now(),
    decision_comment=nullif(trim(requested_comment),'') where id=target_movement_id;
end;
$$;

alter table public.souvenir_products enable row level security;
alter table public.souvenir_movements enable row level security;

create policy souvenir_products_active_read on public.souvenir_products for select to authenticated using (public.is_active_user());
create policy souvenir_products_management_insert on public.souvenir_products for insert to authenticated with check (public.can_manage_souvenirs() and created_by = public.current_person_id());
create policy souvenir_products_management_update on public.souvenir_products for update to authenticated using (public.can_manage_souvenirs()) with check (public.can_manage_souvenirs());
create policy souvenir_movements_active_read on public.souvenir_movements for select to authenticated using (public.is_active_user());

grant select on public.souvenir_products, public.souvenir_movements to authenticated;
revoke insert, update on public.souvenir_products from authenticated;
grant insert (name,sku,category,description,cost_price,sale_price,minimum_stock,is_active,created_by) on public.souvenir_products to authenticated;
grant update (name,sku,category,description,cost_price,sale_price,minimum_stock,is_active) on public.souvenir_products to authenticated;
revoke all on function public.can_manage_souvenirs() from public, anon;
revoke all on function public.create_souvenir_movement(uuid,text,integer,numeric,numeric,text,text) from public, anon;
revoke all on function public.decide_souvenir_bonus(uuid,text,text) from public, anon;
grant execute on function public.can_manage_souvenirs(), public.create_souvenir_movement(uuid,text,integer,numeric,numeric,text,text), public.decide_souvenir_bonus(uuid,text,text) to authenticated;

drop trigger if exists system_audit_trigger on public.souvenir_products;
create trigger system_audit_trigger after insert or update or delete on public.souvenir_products for each row execute function public.capture_system_audit();
drop trigger if exists system_audit_trigger on public.souvenir_movements;
create trigger system_audit_trigger after insert or update or delete on public.souvenir_movements for each row execute function public.capture_system_audit();

notify pgrst, 'reload schema';

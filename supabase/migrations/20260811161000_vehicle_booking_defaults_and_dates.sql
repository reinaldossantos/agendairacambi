-- Reforça no banco as regras aplicadas ao formulário de agendamento de veículos.

create or replace function public.validate_vehicle_booking()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  selected_vehicle public.vehicles%rowtype;
begin
  select * into selected_vehicle from public.vehicles where id = new.vehicle_id;
  if selected_vehicle.id is null then raise exception 'Veículo não encontrado.'; end if;
  if selected_vehicle.status <> 'available' and new.status = 'scheduled' then
    raise exception 'O veículo selecionado não está disponível.';
  end if;
  if new.passengers > selected_vehicle.capacity then
    raise exception 'O número de passageiros excede a capacidade do veículo.';
  end if;
  if new.end_at <= new.start_at then
    raise exception 'O retorno deve ser posterior à saída.';
  end if;

  -- Permite finalizar ou cancelar reservas antigas, mas impede criar ou remarcar
  -- uma saída/retorno para um instante que já passou.
  if new.status = 'scheduled' and (
    tg_op = 'INSERT'
    or new.start_at is distinct from old.start_at
    or new.end_at is distinct from old.end_at
  ) and (new.start_at < now() or new.end_at < now()) then
    raise exception 'As datas de saída e retorno não podem ser anteriores à data e hora atuais.';
  end if;

  if (tg_op = 'INSERT' or new.person_id is distinct from old.person_id or new.program_id is distinct from old.program_id)
    and not exists (
      select 1 from public.programs
      where id = new.program_id and leader_id = new.person_id
    ) then
    raise exception 'O programa deve corresponder ao solicitante selecionado.';
  end if;
  return new;
end;
$$;

drop trigger if exists vehicle_booking_validation on public.vehicle_bookings;
create trigger vehicle_booking_validation
before insert or update on public.vehicle_bookings
for each row execute function public.validate_vehicle_booking();

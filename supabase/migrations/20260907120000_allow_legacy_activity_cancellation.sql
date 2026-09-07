-- Atividades canceladas não exigem dados de execução. Isso permite encerrar
-- pendências históricas incompletas sem inventar horários ou descrições.
alter table public.activities drop constraint if exists activities_description_required;
alter table public.activities add constraint activities_description_required
  check (
    status = 'Cancelado'
    or length(btrim(coalesce(description, ''))) > 0
  ) not valid;

alter table public.activities drop constraint if exists activities_schedule_required;
alter table public.activities add constraint activities_schedule_required
  check (
    status = 'Cancelado'
    or (
      due_date is not null
      and start_datetime is not null
      and end_datetime is not null
      and end_datetime > start_datetime
    )
  ) not valid;

notify pgrst, 'reload schema';

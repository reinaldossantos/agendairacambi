-- Horário de início necessário para apuração da duração das atividades.
alter table public.activities
  add column if not exists start_datetime timestamptz;

create index if not exists activities_start_datetime_idx
  on public.activities (start_datetime);

comment on column public.activities.start_datetime is
  'Data e horário de início usados com end_datetime para calcular a carga horária.';

-- NOT VALID preserva registros históricos incompletos, mas as regras passam a ser
-- exigidas para novos cadastros e futuras alterações.
alter table public.activities drop constraint if exists activities_description_required;
alter table public.activities add constraint activities_description_required
  check (length(btrim(coalesce(description, ''))) > 0) not valid;

alter table public.activities drop constraint if exists activities_schedule_required;
alter table public.activities add constraint activities_schedule_required
  check (
    due_date is not null
    and start_datetime is not null
    and end_datetime is not null
    and end_datetime > start_datetime
  ) not valid;

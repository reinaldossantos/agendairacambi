-- Eventos são atividades especializadas; não existe cadastro duplicado.
alter table public.activities
  add column if not exists is_event boolean not null default false,
  add column if not exists event_data jsonb not null default '{}'::jsonb;

alter table public.activities
  drop constraint if exists activities_event_data_object_check;

alter table public.activities
  add constraint activities_event_data_object_check
  check (jsonb_typeof(event_data) = 'object');

create index if not exists activities_event_period_idx
  on public.activities (is_event, due_date)
  where is_event = true;

comment on column public.activities.is_event is
  'Identifica atividades que também são eventos institucionais.';
comment on column public.activities.event_data is
  'Dados complementares do evento: tipo, período, temática, local, parceiros, contrapartidas e resultados.';

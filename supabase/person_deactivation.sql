-- Desativação lógica de pessoas, preservando todo o histórico relacionado.
alter table public.persons
  add column if not exists is_active boolean not null default true,
  add column if not exists deactivated_at timestamptz;

update public.persons
set is_active = true
where is_active is null;

create index if not exists persons_active_name_idx
  on public.persons (is_active, name);

comment on column public.persons.is_active is
  'Pessoa disponível para novos lançamentos. Registros históricos permanecem vinculados quando false.';

comment on column public.persons.deactivated_at is
  'Data e hora da desativação lógica da pessoa.';

-- Força a API REST do Supabase a reconhecer imediatamente as novas colunas.
notify pgrst, 'reload schema';

-- Cache seguro das traduções automáticas da Agenda Iracambi.
-- Execute no SQL Editor antes de publicar a função translate-content.

create table if not exists public.dynamic_translations (
  id uuid primary key default gen_random_uuid(),
  cache_key text not null unique,
  source_hash text not null,
  source_language text not null default 'auto',
  target_language text not null check (target_language in ('en', 'es')),
  source_text text not null,
  translated_text text not null,
  model text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists dynamic_translations_lookup_idx
  on public.dynamic_translations(source_hash, target_language);

drop trigger if exists dynamic_translations_updated_at on public.dynamic_translations;
create trigger dynamic_translations_updated_at before update on public.dynamic_translations
for each row execute function public.set_updated_at();

alter table public.dynamic_translations enable row level security;

-- O conteúdo só é acessado pela Edge Function com service role. Nenhuma tradução
-- fica diretamente exposta pela API pública do banco.
revoke all on table public.dynamic_translations from anon, authenticated;

comment on table public.dynamic_translations is
  'Cache privado das traduções automáticas; o texto original permanece nas tabelas de origem.';

insert into public.app_settings (key, value)
values ('translation_settings', '{"automatic_translation_enabled": false}'::jsonb)
on conflict (key) do nothing;

create or replace function public.set_automatic_translation_enabled(enabled boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.persons
    where auth_user_id = auth.uid() and access_role = 'admin' and is_active = true
  ) then
    raise exception 'Apenas administradores podem alterar a tradução automática.';
  end if;

  insert into public.app_settings (key, value, updated_at)
  values ('translation_settings', jsonb_build_object('automatic_translation_enabled', enabled), now())
  on conflict (key) do update
    set value = excluded.value, updated_at = excluded.updated_at;
end;
$$;

revoke all on function public.set_automatic_translation_enabled(boolean) from public;
grant execute on function public.set_automatic_translation_enabled(boolean) to authenticated;

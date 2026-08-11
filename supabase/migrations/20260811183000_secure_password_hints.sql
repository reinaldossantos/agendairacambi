-- Dicas de senha isoladas dos perfis e acessíveis somente pelo fluxo controlado de autenticação.

create table if not exists public.user_password_hints (
  person_id uuid primary key references public.persons(id) on delete cascade,
  hint text not null check (char_length(trim(hint)) between 4 and 160),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists user_password_hints_updated_at on public.user_password_hints;
create trigger user_password_hints_updated_at
before update on public.user_password_hints
for each row execute function public.set_updated_at();

alter table public.user_password_hints enable row level security;
revoke all on public.user_password_hints from public, anon, authenticated;

create or replace function public.complete_password_change(password_hint text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  profile_email text;
  clean_hint text := trim(password_hint);
begin
  if auth.uid() is null then raise exception 'Sessão autenticada não encontrada.'; end if;
  if char_length(clean_hint) < 4 or char_length(clean_hint) > 160 then
    raise exception 'A dica deve conter entre 4 e 160 caracteres.';
  end if;

  perform set_config('app.completing_own_password_change', 'on', true);
  update public.persons
  set must_change_password = false, failed_login_attempts = 0, locked_at = null
  where auth_user_id = auth.uid() and is_active = true
  returning id, email into profile_id, profile_email;
  if profile_id is null then raise exception 'Perfil ativo não encontrado.'; end if;

  insert into public.user_password_hints(person_id, hint)
  values(profile_id, clean_hint)
  on conflict(person_id) do update set hint = excluded.hint, updated_at = now();

  insert into public.user_access_logs(person_id, email, event_type)
  values(profile_id, coalesce(profile_email, auth.jwt()->>'email', ''), 'password_changed');
end;
$$;

-- Impede clientes antigos de concluírem a troca sem cadastrar a dica solicitada.
create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Informe uma dica de senha para concluir a alteração.';
end;
$$;

revoke all on function public.complete_password_change(text) from public, anon;
revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change(text) to authenticated;
grant execute on function public.complete_password_change() to authenticated;

create or replace function public.get_my_password_hint()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select h.hint
  from public.user_password_hints h
  join public.persons p on p.id = h.person_id
  where p.auth_user_id = auth.uid() and p.is_active = true
  limit 1
$$;
revoke all on function public.get_my_password_hint() from public, anon;
grant execute on function public.get_my_password_hint() to authenticated;

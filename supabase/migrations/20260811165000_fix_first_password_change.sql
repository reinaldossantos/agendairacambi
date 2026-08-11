-- Corrige a finalização segura da troca obrigatória de senha no primeiro acesso.

create or replace function public.protect_person_security_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  completing_own_password_change boolean :=
    current_setting('app.completing_own_password_change', true) = 'on'
    and old.auth_user_id = auth.uid()
    and new.auth_user_id is not distinct from old.auth_user_id
    and new.access_role is not distinct from old.access_role
    and new.is_active is not distinct from old.is_active
    and new.email is not distinct from old.email
    and new.managed_by is not distinct from old.managed_by
    and new.must_change_password = false
    and new.failed_login_attempts = 0
    and new.locked_at is null;
begin
  if auth.uid() is not null and not public.is_admin() and not completing_own_password_change and (
    new.auth_user_id is distinct from old.auth_user_id or
    new.access_role is distinct from old.access_role or
    new.is_active is distinct from old.is_active or
    new.email is distinct from old.email or
    new.managed_by is distinct from old.managed_by or
    new.must_change_password is distinct from old.must_change_password or
    new.failed_login_attempts is distinct from old.failed_login_attempts or
    new.locked_at is distinct from old.locked_at
  ) then
    raise exception 'Campos de segurança do perfil exigem administrador.';
  end if;
  return new;
end;
$$;

create or replace function public.complete_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  profile_id uuid;
  profile_email text;
begin
  if auth.uid() is null then raise exception 'Sessão autenticada não encontrada.'; end if;
  perform set_config('app.completing_own_password_change', 'on', true);
  update public.persons
  set must_change_password = false, failed_login_attempts = 0, locked_at = null
  where auth_user_id = auth.uid() and is_active = true
  returning id, email into profile_id, profile_email;
  if profile_id is null then raise exception 'Perfil ativo não encontrado.'; end if;

  insert into public.user_access_logs(person_id, email, event_type)
  values(profile_id, coalesce(profile_email, auth.jwt()->>'email', ''), 'password_changed');
end;
$$;

revoke all on function public.complete_password_change() from public, anon;
grant execute on function public.complete_password_change() to authenticated;

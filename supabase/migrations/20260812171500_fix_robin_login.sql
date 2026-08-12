-- Normaliza a identidade de Robin e remove bloqueios causados por tentativas anteriores.
do $$
declare
  robin_person_id uuid;
  robin_auth_user_id uuid;
begin
  select id, auth_user_id
    into robin_person_id, robin_auth_user_id
  from public.persons
  where lower(trim(name)) = 'robin'
  order by id
  limit 1;

  if robin_person_id is null then
    raise exception 'Perfil de Robin não encontrado em public.persons.';
  end if;

  if robin_auth_user_id is null then
    select id into robin_auth_user_id
    from auth.users
    where lower(email) = 'iracambi@iracambi.com'
    limit 1;
  end if;

  if robin_auth_user_id is null then
    raise exception 'Conta de autenticação iracambi@iracambi.com não encontrada.';
  end if;

  if not exists (
    select 1 from auth.users
    where id = robin_auth_user_id
      and lower(email) = 'iracambi@iracambi.com'
  ) then
    raise exception 'A conta vinculada a Robin não corresponde a iracambi@iracambi.com.';
  end if;

  update public.persons
  set email = 'iracambi@iracambi.com',
      auth_user_id = robin_auth_user_id,
      is_active = true,
      failed_login_attempts = 0,
      locked_at = null
  where id = robin_person_id;

  update auth.users
  set banned_until = null,
      updated_at = now()
  where id = robin_auth_user_id;
end;
$$;

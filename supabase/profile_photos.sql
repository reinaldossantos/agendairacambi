-- Foto de perfil dos usuários.
alter table public.persons add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg', 'image/jfif', 'image/png', 'image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "profile_photos_public_read" on storage.objects;
create policy "profile_photos_public_read" on storage.objects for select using (bucket_id = 'profile-photos');

drop policy if exists "users_insert_own_profile_photo" on storage.objects;
create policy "users_insert_own_profile_photo" on storage.objects for insert to authenticated with check (
  bucket_id = 'profile-photos' and (storage.foldername(name))[1] in (
    select id::text from public.persons where auth_user_id = auth.uid()
  )
);

drop policy if exists "users_update_own_profile_photo" on storage.objects;
create policy "users_update_own_profile_photo" on storage.objects for update to authenticated using (
  bucket_id = 'profile-photos' and (storage.foldername(name))[1] in (
    select id::text from public.persons where auth_user_id = auth.uid()
  )
) with check (
  bucket_id = 'profile-photos' and (storage.foldername(name))[1] in (
    select id::text from public.persons where auth_user_id = auth.uid()
  )
);

drop policy if exists "users_delete_own_profile_photo" on storage.objects;
create policy "users_delete_own_profile_photo" on storage.objects for delete to authenticated using (
  bucket_id = 'profile-photos' and (storage.foldername(name))[1] in (
    select id::text from public.persons where auth_user_id = auth.uid()
  )
);

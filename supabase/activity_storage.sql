-- Buckets e permissões para evidências de atividades.
-- Execute este arquivo no SQL Editor do Supabase.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'activity-attachments',
  'activity-attachments',
  true,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('activity-files', 'activity-files', true, 20971520, null)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "activity_storage_public_read" on storage.objects;
create policy "activity_storage_public_read"
on storage.objects for select
using (bucket_id in ('activity-attachments', 'activity-files'));
drop policy if exists "activity_storage_authenticated_insert" on storage.objects;
create policy "activity_storage_authenticated_insert"
on storage.objects for insert to authenticated
with check (bucket_id in ('activity-attachments', 'activity-files'));

drop policy if exists "activity_storage_authenticated_update" on storage.objects;
create policy "activity_storage_authenticated_update"
on storage.objects for update to authenticated
using (bucket_id in ('activity-attachments', 'activity-files'))
with check (bucket_id in ('activity-attachments', 'activity-files'));

drop policy if exists "activity_storage_authenticated_delete" on storage.objects;
create policy "activity_storage_authenticated_delete"
on storage.objects for delete to authenticated
using (bucket_id in ('activity-attachments', 'activity-files'));

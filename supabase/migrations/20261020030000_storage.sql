-- ============================================================
-- Cloud SaaS Toolkit — Storage buckets & policies
-- ============================================================

-- parking-images bucket (shared — view role read, edit role write)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('parking-images', 'parking-images', false, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

-- SELECT: all approved users with view permission on parking
drop policy if exists parking_images_select on storage.objects;
create policy parking_images_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'parking-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and coalesce(p.must_change_password, false) = false
    )
    and public.has_tool_permission('parking', 'view')
  );

-- INSERT: users with edit permission on parking
drop policy if exists parking_images_insert on storage.objects;
create policy parking_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'parking-images'
    and public.has_tool_permission('parking', 'edit')
  );

-- DELETE: users with edit permission on parking (owners are the uploaders)
drop policy if exists parking_images_delete on storage.objects;
create policy parking_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'parking-images'
    and public.has_tool_permission('parking', 'edit')
  );

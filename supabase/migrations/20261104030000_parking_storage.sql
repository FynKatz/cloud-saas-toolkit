-- ============================================================
-- Cloud SaaS Toolkit — 停车 V2 Storage 权限调整
-- 普通已授权用户可上传停车图片；删除仅限 admin。
-- ============================================================

-- INSERT: 放宽到已审批用户 + parking view（普通用户新增停车场时上传现场图）
drop policy if exists parking_images_insert on storage.objects;
create policy parking_images_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'parking-images'
    and exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and coalesce(p.must_change_password, false) = false
    )
    and public.has_tool_permission('parking', 'view')
  );

-- DELETE: 仅 admin（编辑/删除/停用统一为 admin 操作）
drop policy if exists parking_images_delete on storage.objects;
create policy parking_images_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'parking-images'
    and public.is_admin()
  );

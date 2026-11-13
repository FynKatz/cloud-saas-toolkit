-- 补建 parking-images 私有桶与 SELECT 策略。
--
-- 实测现状：storage.buckets 为空；storage.objects 上只有 parking_images_insert
-- 与 parking_images_delete 两条策略。20261020030000_storage.sql 里其实写了
-- parking_images_select，但库里没有 —— 该文件当时只执行了一部分。
-- 后果：图片能上传（走 insert 策略），但任何读取都被 RLS 拒绝，
-- 签名 URL 取不到内容，「私有桶图片可读」这一项必然失败。
--
-- 写法与既有 insert / delete 策略保持一致（带 approved 且非强制改密的 profiles 校验）。

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'parking-images',
  'parking-images',
  false,
  10485760,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do nothing;

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

-- 执行后校验：应返回 3 条策略（delete / insert / select）
-- select polname, polcmd::text from pg_policy pol
--   join pg_class c on c.oid = pol.polrelid
--   where c.relname = 'objects' order by polname;

-- 回滚（顺序不可颠倒，桶内有对象时 delete buckets 会被外键挡住）：
--   1. 先删 parking-images 桶内对象
--   2. drop policy parking_images_select on storage.objects;
--   3. delete from storage.buckets where id = 'parking-images';

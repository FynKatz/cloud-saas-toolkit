-- ============================================================
-- 修复三张业务表新增记录必然失败
-- 日期：2026-10-22
--
-- 现象（生产实测，POST /rest/v1/parking_info 返回 400）：
--   null value in column "user_id" of relation "parking_info"
--   violates not-null constraint
--
-- 根因：parking_info / movies_library / tasks 的 user_id 均为
--   `uuid not null references auth.users(id)`，既无 DEFAULT 也无触发器填充；
--   而三个前端视图的 insert payload 都不带 user_id（也不该带——身份不应由客户端提供）。
--   因此停车、电影、Todo 三个工具的「新增」全部无法写入。
--
-- 修法：给三张表的 user_id 加 DEFAULT auth.uid()。
--   - 服务端求值，客户端无法伪造归属
--   - 与既有 RLS 的 INSERT ... WITH CHECK (user_id = auth.uid()) 语义一致
--   - 三表统一，前端无需改动
-- ============================================================

alter table public.parking_info   alter column user_id set default auth.uid();
alter table public.movies_library alter column user_id set default auth.uid();
alter table public.tasks          alter column user_id set default auth.uid();

-- 校验：三列都应带默认值
select
  c.relname as table_name,
  a.attname as column_name,
  pg_get_expr(d.adbin, d.adrelid) as default_expr
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace n on n.oid = c.relnamespace
left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
where n.nspname = 'public'
  and c.relname in ('parking_info', 'movies_library', 'tasks')
  and a.attname = 'user_id'
order by c.relname;

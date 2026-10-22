-- ============================================================
-- 导航分组定稿 (思路 1 + B)：重排 tools.category 与 sort_order
-- 日期：2026-10-21
-- 依据：docs/design/dashboard-layout-spec.md §3.0（唯一权威映射表）
-- 方向：DB 向导航对齐，不得反向把导航改回旧分类。
--
-- 旧：速查参考(6) / 交互工具(4) / 信息面板(1) / 任务管理(1)
-- 新：速查参考(4) / 数据应用(3) / 图形工具(2) / 文本工具(3)
--
-- 注意：20261020010000_init_schema.sql 末尾的 seed 带
--       `on conflict (id) do update set category = excluded.category`。
--       该文件已应用、正常情况下不会重跑；若被重跑会把本迁移覆盖回旧分类，
--       届时需重新执行本文件。
-- ============================================================

begin;

-- 速查参考 (4)：静态内容，搜索 + 复制为主
update public.tools set category = '速查参考', sort_order = 1 where id = 'sql-cheatsheet';
update public.tools set category = '速查参考', sort_order = 2 where id = 'redis-cheatsheet';
update public.tools set category = '速查参考', sort_order = 3 where id = 'docker-k8s-cheatsheet';
update public.tools set category = '速查参考', sort_order = 4 where id = 'typora-shortcuts';

-- 数据应用 (3)：有状态、需要 CRUD，数据存 Supabase
update public.tools set category = '数据应用', sort_order = 5 where id = 'parking';
update public.tools set category = '数据应用', sort_order = 6 where id = 'todo';
update public.tools set category = '数据应用', sort_order = 7 where id = 'movie';

-- 图形工具 (2)：以图片为输入或输出
update public.tools set category = '图形工具', sort_order = 8 where id = 'image-stitch';
update public.tools set category = '图形工具', sort_order = 9 where id = 'pixabay-download';

-- 文本工具 (3)：以文本为输入或输出
update public.tools set category = '文本工具', sort_order = 10 where id = 'word-count';
update public.tools set category = '文本工具', sort_order = 11 where id = 'chrome-extension-packaging';
update public.tools set category = '文本工具', sort_order = 12 where id = 'markdown-heading';

commit;

-- 校验：期望 4 行 → 速查参考|4, 数据应用|3, 文本工具|3, 图形工具|2
select category, count(*) as n, string_agg(id::text, ',' order by sort_order) as ids
from public.tools
group by category
order by min(sort_order);

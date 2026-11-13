-- 恢复 家庭成员 角色在手工调整中丢掉的 5 条授权。
--
-- 这是【数据恢复】，不是缺陷修复：audit_logs 显示 2026-11-04 05:40:56→05:41:25
-- 有人对 role 0002 连续调用 admin_set_role_permission 13 次，最后一步把
-- parking 与 movie 置空、todo 置回 edit。Edge Function 本身的逻辑是正确的
-- （逐条 delete/upsert，授 edit 前查 writable）。因此本文件只把库恢复到
-- init_schema.sql 声明的种子状态，不代表此类漂移不会再发生。
--
-- 配套约定（AGENTS.md §7 / PRD）：种子是权限的唯一事实源，RBAC 界面的手工改动
-- 必须同步回种子，否则视为待恢复漂移。
--
-- 幂等：upsert。重复执行不产生新行，也不会改动本已正确的值。
-- 已核对：PK 为 (role_id, tool_id)；role_permissions_check_writable 触发器只拦
-- edit + writable=false，parking / movie 均 writable=true，不会被拦；
-- role_permissions_set_updated_at 是 BEFORE UPDATE，纯 INSERT 走列默认值。

begin;

insert into public.role_permissions (role_id, tool_id, access_level) values
  ('00000000-0000-0000-0000-000000000002', 'sql-cheatsheet',        'view'),
  ('00000000-0000-0000-0000-000000000002', 'docker-k8s-cheatsheet', 'view'),
  ('00000000-0000-0000-0000-000000000002', 'typora-shortcuts',      'view'),
  ('00000000-0000-0000-0000-000000000002', 'parking',               'edit'),
  ('00000000-0000-0000-0000-000000000002', 'movie',                 'edit')
on conflict (role_id, tool_id) do update
  set access_level = excluded.access_level;

commit;

-- 执行后校验：应返回 total = 12、edits = 3
-- select count(*) total,
--        count(*) filter (where access_level = 'edit') edits
-- from public.role_permissions
-- where role_id = '00000000-0000-0000-0000-000000000002';

-- 回滚：
-- delete from public.role_permissions
--  where role_id = '00000000-0000-0000-0000-000000000002'
--    and tool_id in ('sql-cheatsheet','docker-k8s-cheatsheet','typora-shortcuts','parking','movie');

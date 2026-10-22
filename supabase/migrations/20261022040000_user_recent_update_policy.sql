-- ============================================================
-- 补 user_recent_tools UPDATE 权限检查
-- 日期：2026-10-22
--
-- 现况：INSERT 策略检查了 has_tool_permission(tool_id,'view')，
-- 但 UPDATE 策略仅检查 user_id = auth.uid()，漏了权限校验。
-- 用户可能更新一个已失去权限的 tool 的最近使用记录（低风险，
-- 但违反「无权限工具不出现」的隔离原则）。
-- ============================================================

begin;

drop policy if exists user_recent_tools_update_own on public.user_recent_tools;
create policy user_recent_tools_update_own on public.user_recent_tools
  for update to authenticated
  using (
    user_id = auth.uid()
    and public.has_tool_permission(tool_id, 'view')
  )
  with check (
    user_id = auth.uid()
    and public.has_tool_permission(tool_id, 'view')
  );

commit;

-- 校验：策略 OLD/NEW 两侧均检查 has_tool_permission
select tablename, policyname, qual, with_check
from pg_policies
where tablename = 'user_recent_tools' and policyname = 'user_recent_tools_update_own';

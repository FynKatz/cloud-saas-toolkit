-- ============================================================
-- 补 role_permissions DB 层 writable 硬约束 + 安全函数修复
-- 日期：2026-10-22
--
-- 背景：PRD §4.4 要求双重保证——前端禁用只读工具的 edit 选项 +
-- DB CHECK 拒绝 access_level='edit' 与 writable=false 的组合。
-- DB CHECK 此前缺失，仅靠 has_tool_permission() 软拦截。
--
-- 本 migration 补：
-- 1. role_permissions 的 INSERT/UPDATE trigger，阻止对 writable=false
--    的工具写入 access_level='edit'。
-- 2. get_my_tool_permissions() 增加 tools JOIN，非管理员用户的 tool
--    权限必须通过 writable 检查才能返回 'edit'。
--
-- 注：对已存在的脏数据（若有 role_permissions 对不可写工具持有
-- edit），本 migration 只阻止写入不清理历史行——has_tool_permission()
-- 的软拦截已足够兜底。
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Trigger：阻止 role_permissions 对 writable=false 工具写入 edit
-- ------------------------------------------------------------
create or replace function public.check_role_permission_writable()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_writable boolean;
begin
  if new.access_level = 'edit' then
    select t.writable into v_writable
    from public.tools t
    where t.id = new.tool_id;

    if v_writable is null then
      raise exception '工具 % 不存在', new.tool_id;
    end if;

    if v_writable = false then
      raise exception '工具 % 为只读工具，不能授予 edit 权限', new.tool_id;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists role_permissions_check_writable on public.role_permissions;
create trigger role_permissions_check_writable
  before insert or update on public.role_permissions
  for each row execute function public.check_role_permission_writable();

-- ------------------------------------------------------------
-- 2. 修复 get_my_tool_permissions()：非 admin 的 edit 必须过 writable 检查
-- ------------------------------------------------------------
create or replace function public.get_my_tool_permissions()
returns table(tool_id text, access_level text)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if public.is_admin() then
    return query
      select t.id, 'edit'::text
      from public.tools t
      where t.status = 'active';
  else
    return query
      select rp.tool_id,
             case when bool_or(rp.access_level = 'edit' and t.writable = true) then 'edit'::text
                  else 'view'::text
             end
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      join public.tools t on t.id = rp.tool_id
      where ur.user_id = auth.uid()
      group by rp.tool_id;
  end if;
end;
$$;

commit;

-- ============================================================
-- 校验
-- ============================================================

-- 校验 1：函数属性未变
select proname, prolang::regproc::text as lang, prosecdef as definer,
       array_to_string(proconfig, ',') as search_path_cfg
from pg_proc where proname = 'get_my_tool_permissions';

-- 校验 2：trigger 存在且不会拒绝 view 级写入（只测存在性，不模拟 auth）
select tgname, tgtype::text from pg_trigger
where tgname = 'role_permissions_check_writable';

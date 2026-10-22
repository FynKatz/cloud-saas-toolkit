-- ============================================================
-- 修复多角色绑定时权限被降级
-- 日期：2026-10-22
--
-- 原实现（20261020010000_init_schema.sql:222）：
--   select rp.tool_id, max(rp.access_level)::text ... group by rp.tool_id
--
-- access_level 是纯 text 列（库中不存在任何 enum 类型），text 的 max() 走字典序：
--   实测 select max(x) from (values ('edit'),('view')) v(x)  →  'view'
--
-- 后果：用户同时绑定「授予 edit 的角色」与「授予 view 的角色」时，该工具最终
-- 拿到 view，编辑权被静默吞掉。与既定设计「一个用户可绑多个角色，取权限并集」相反。
--
-- 修法：用 bool_or 显式表达并集 —— 任一角色授予 edit 即为 edit。
-- 其余函数属性（plpgsql / security definer / search_path 含 pg_temp）保持原样，
-- 不顺手改动安全上下文。
-- ============================================================

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
             case when bool_or(rp.access_level = 'edit') then 'edit'::text
                  else 'view'::text
             end
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = auth.uid()
      group by rp.tool_id;
  end if;
end;
$$;

-- 校验 1：并集语义应为 edit（旧写法此处返回 view）
select 'new=' || (select case when bool_or(x='edit') then 'edit' else 'view' end
                    from (values ('edit'),('view')) v(x))
     || '  old=' || (select max(x) from (values ('edit'),('view')) v2(x)) as union_check;

-- 校验 2：函数属性未被误改
select prolang::regproc::text as lang, prosecdef as definer,
       array_to_string(proconfig, ',') as search_path_cfg
from pg_proc where proname = 'get_my_tool_permissions';

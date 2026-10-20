-- ============================================================
-- Cloud SaaS Toolkit — initial schema, security, RLS, seed
-- ============================================================

create extension if not exists pgcrypto with schema extensions;

-- ============================================================
-- 1. Core tables
-- ============================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text,
  status text not null default 'pending',
  prior_status text,
  reject_reason text,
  must_change_password boolean not null default false,
  password_changed_at timestamptz,
  last_registration_attempt timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  created_by uuid references auth.users(id),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  rejected_by uuid references auth.users(id),
  rejected_at timestamptz,
  constraint profiles_username_format check (
    username ~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$'
    and username not in ('root','system','owner','test')
  ),
  constraint profiles_status_check check (status in ('pending','approved','rejected','deleted')),
  constraint profiles_prior_status_check check (
    prior_status is null or prior_status in ('pending','approved','rejected','deleted')
  )
);

create table if not exists public.roles (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null unique,
  description text,
  is_system boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.tools (
  id text primary key,
  name text not null,
  category text not null,
  route text not null unique,
  icon text not null,
  description text,
  data_scope text not null check (data_scope in ('shared','private','none')),
  writable boolean not null default false,
  sort_order int not null default 0,
  status text not null default 'active' check (status in ('active','hidden')),
  created_at timestamptz not null default now()
);

create table if not exists public.role_permissions (
  role_id uuid not null references public.roles(id) on delete cascade,
  tool_id text not null references public.tools(id) on delete cascade,
  access_level text not null check (access_level in ('view','edit')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (role_id, tool_id)
);

create table if not exists public.user_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table if not exists public.user_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id text not null references public.tools(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

create table if not exists public.user_recent_tools (
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool_id text not null references public.tools(id) on delete cascade,
  last_used_at timestamptz not null default now(),
  primary key (user_id, tool_id)
);

create table if not exists public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  actor_id uuid references auth.users(id),
  action text not null,
  target_type text,
  target_id text,
  metadata jsonb,
  ip text,
  created_at timestamptz not null default now()
);

-- Business tables: shared/private data scope.
create table if not exists public.parking_info (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  province text,
  city text,
  district text,
  mall text,
  address text,
  free_duration int,
  charge_interval int,
  day_price numeric,
  night_price numeric,
  day_unit text,
  night_unit text,
  notes text,
  location jsonb,
  images text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.movies_library (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  tmdb_id int,
  title text,
  original_title text,
  poster_path text,
  backdrop_path text,
  overview text,
  release_date text,
  genres text[],
  rating numeric,
  watch_status text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  content text not null,
  status text not null default '进行中' check (status in ('进行中','已完成')),
  due_time timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- 2. Security-definer functions
-- ============================================================

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = auth.uid()
      and r.name = 'admin'
      and p.status = 'approved'
  );
$$;

create or replace function public.has_tool_permission(p_tool_id text, p_required_level text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.status = 'approved'
        and coalesce(p.must_change_password, false) = false
    )
    and (
      public.is_admin()
      or exists (
        select 1
        from public.user_roles ur
        join public.role_permissions rp on rp.role_id = ur.role_id
        join public.tools t on t.id = rp.tool_id
        where ur.user_id = auth.uid()
          and rp.tool_id = p_tool_id
          and (
            (p_required_level = 'view' and rp.access_level in ('view','edit'))
            or (p_required_level = 'edit' and rp.access_level = 'edit' and t.writable = true)
          )
      )
    );
$$;

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
      select rp.tool_id, max(rp.access_level)::text
      from public.user_roles ur
      join public.role_permissions rp on rp.role_id = ur.role_id
      where ur.user_id = auth.uid()
      group by rp.tool_id;
  end if;
end;
$$;

-- ============================================================
-- 3. Triggers
-- ============================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, status)
  values (new.id, split_part(new.email, '@', 1), 'pending')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists role_permissions_set_updated_at on public.role_permissions;
create trigger role_permissions_set_updated_at before update on public.role_permissions
  for each row execute function public.set_updated_at();
drop trigger if exists parking_info_set_updated_at on public.parking_info;
create trigger parking_info_set_updated_at before update on public.parking_info
  for each row execute function public.set_updated_at();
drop trigger if exists movies_library_set_updated_at on public.movies_library;
create trigger movies_library_set_updated_at before update on public.movies_library
  for each row execute function public.set_updated_at();
drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at before update on public.tasks
  for each row execute function public.set_updated_at();

create or replace function public.prevent_profile_sensitive_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() is distinct from 'authenticated' then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.username is distinct from old.username
     or new.must_change_password is distinct from old.must_change_password
     or new.password_changed_at is distinct from old.password_changed_at
     or new.approved_by is distinct from old.approved_by
     or new.approved_at is distinct from old.approved_at
     or new.rejected_by is distinct from old.rejected_by
     or new.rejected_at is distinct from old.rejected_at
     or new.reject_reason is distinct from old.reject_reason
     or new.prior_status is distinct from old.prior_status
     or new.deleted_at is distinct from old.deleted_at
     or new.created_by is distinct from old.created_by
     or new.last_registration_attempt is distinct from old.last_registration_attempt
  then
    raise exception 'Direct update of protected profile columns is not allowed';
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_profile_sensitive_update_trigger on public.profiles;
create trigger prevent_profile_sensitive_update_trigger
  before update on public.profiles
  for each row execute function public.prevent_profile_sensitive_update();

-- ============================================================
-- 4. Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.roles enable row level security;
alter table public.role_permissions enable row level security;
alter table public.user_roles enable row level security;
alter table public.tools enable row level security;
alter table public.user_favorites enable row level security;
alter table public.user_recent_tools enable row level security;
alter table public.audit_logs enable row level security;
alter table public.parking_info enable row level security;
alter table public.movies_library enable row level security;
alter table public.tasks enable row level security;

-- profiles
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select to authenticated
  using (public.is_admin());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- roles
drop policy if exists roles_select_admin on public.roles;
create policy roles_select_admin on public.roles
  for select to authenticated
  using (public.is_admin());

-- role_permissions
drop policy if exists role_permissions_select_admin on public.role_permissions;
create policy role_permissions_select_admin on public.role_permissions
  for select to authenticated
  using (public.is_admin());

-- user_roles
drop policy if exists user_roles_select_admin on public.user_roles;
create policy user_roles_select_admin on public.user_roles
  for select to authenticated
  using (public.is_admin());

-- tools
drop policy if exists tools_select on public.tools;
create policy tools_select on public.tools
  for select to authenticated
  using (public.is_admin() or (status = 'active' and public.has_tool_permission(id, 'view')));

-- user_favorites
drop policy if exists user_favorites_select_own on public.user_favorites;
create policy user_favorites_select_own on public.user_favorites
  for select to authenticated
  using (user_id = auth.uid() and public.has_tool_permission(tool_id, 'view'));

drop policy if exists user_favorites_select_admin on public.user_favorites;
create policy user_favorites_select_admin on public.user_favorites
  for select to authenticated
  using (public.is_admin());

drop policy if exists user_favorites_insert_own on public.user_favorites;
create policy user_favorites_insert_own on public.user_favorites
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_tool_permission(tool_id, 'view'));

drop policy if exists user_favorites_delete_own on public.user_favorites;
create policy user_favorites_delete_own on public.user_favorites
  for delete to authenticated
  using (user_id = auth.uid());

-- user_recent_tools
drop policy if exists user_recent_tools_select_own on public.user_recent_tools;
create policy user_recent_tools_select_own on public.user_recent_tools
  for select to authenticated
  using (user_id = auth.uid() and public.has_tool_permission(tool_id, 'view'));

drop policy if exists user_recent_tools_select_admin on public.user_recent_tools;
create policy user_recent_tools_select_admin on public.user_recent_tools
  for select to authenticated
  using (public.is_admin());

drop policy if exists user_recent_tools_insert_own on public.user_recent_tools;
create policy user_recent_tools_insert_own on public.user_recent_tools
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_tool_permission(tool_id, 'view'));

drop policy if exists user_recent_tools_update_own on public.user_recent_tools;
create policy user_recent_tools_update_own on public.user_recent_tools
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists user_recent_tools_delete_own on public.user_recent_tools;
create policy user_recent_tools_delete_own on public.user_recent_tools
  for delete to authenticated
  using (user_id = auth.uid());

-- audit_logs (append-only: no client insert/update/delete)
drop policy if exists audit_logs_select_admin on public.audit_logs;
create policy audit_logs_select_admin on public.audit_logs
  for select to authenticated
  using (public.is_admin());

-- parking_info (shared)
drop policy if exists parking_select on public.parking_info;
create policy parking_select on public.parking_info
  for select to authenticated
  using (public.has_tool_permission('parking', 'view'));

drop policy if exists parking_insert on public.parking_info;
create policy parking_insert on public.parking_info
  for insert to authenticated
  with check (public.has_tool_permission('parking', 'edit'));

drop policy if exists parking_update on public.parking_info;
create policy parking_update on public.parking_info
  for update to authenticated
  using (public.has_tool_permission('parking', 'edit'))
  with check (public.has_tool_permission('parking', 'edit'));

drop policy if exists parking_delete on public.parking_info;
create policy parking_delete on public.parking_info
  for delete to authenticated
  using (public.has_tool_permission('parking', 'edit'));

-- movies_library (shared)
drop policy if exists movies_select on public.movies_library;
create policy movies_select on public.movies_library
  for select to authenticated
  using (public.has_tool_permission('movie', 'view'));

drop policy if exists movies_insert on public.movies_library;
create policy movies_insert on public.movies_library
  for insert to authenticated
  with check (public.has_tool_permission('movie', 'edit'));

drop policy if exists movies_update on public.movies_library;
create policy movies_update on public.movies_library
  for update to authenticated
  using (public.has_tool_permission('movie', 'edit'))
  with check (public.has_tool_permission('movie', 'edit'));

drop policy if exists movies_delete on public.movies_library;
create policy movies_delete on public.movies_library
  for delete to authenticated
  using (public.has_tool_permission('movie', 'edit'));

-- tasks (private)
drop policy if exists tasks_select_own on public.tasks;
create policy tasks_select_own on public.tasks
  for select to authenticated
  using (user_id = auth.uid() and public.has_tool_permission('todo', 'view'));

drop policy if exists tasks_insert_own on public.tasks;
create policy tasks_insert_own on public.tasks
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_tool_permission('todo', 'edit'));

drop policy if exists tasks_update_own on public.tasks;
create policy tasks_update_own on public.tasks
  for update to authenticated
  using (user_id = auth.uid() and public.has_tool_permission('todo', 'edit'))
  with check (user_id = auth.uid() and public.has_tool_permission('todo', 'edit'));

drop policy if exists tasks_delete_own on public.tasks;
create policy tasks_delete_own on public.tasks
  for delete to authenticated
  using (user_id = auth.uid() and public.has_tool_permission('todo', 'edit'));

-- ============================================================
-- 5. Seed data
-- ============================================================

insert into public.roles (id, name, description, is_system) values
  ('00000000-0000-0000-0000-000000000001', 'admin', '系统管理员', true),
  ('00000000-0000-0000-0000-000000000002', '家庭成员', '家庭共享工具与电影管理', false),
  ('00000000-0000-0000-0000-000000000003', '测试员', '测试与基础工具', false),
  ('00000000-0000-0000-0000-000000000004', '访客', '只读访客', false)
on conflict (name) do nothing;

insert into public.tools
  (id, name, category, route, icon, description, data_scope, writable, sort_order)
values
  ('docker-k8s-cheatsheet', 'Docker & K8S 速查', '速查参考', 'tools/docker-k8s', 'Container', 'Docker 与 Kubernetes 常用命令速查', 'none', false, 1),
  ('sql-cheatsheet', 'SQL 速查', '速查参考', 'tools/sql', 'Database', 'SQL 常用语法速查', 'none', false, 2),
  ('redis-cheatsheet', 'Redis 速查', '速查参考', 'tools/redis', 'Zap', 'Redis 常用命令速查', 'none', false, 3),
  ('typora-shortcuts', 'Typora 快捷键', '速查参考', 'tools/typora', 'Keyboard', 'Typora 快捷键速查', 'none', false, 4),
  ('chrome-extension-packaging', 'Chrome 扩展打包', '速查参考', 'tools/chrome-extension', 'Puzzle', 'Chrome 扩展打包步骤', 'none', false, 5),
  ('markdown-heading', 'Markdown 标题工具', '速查参考', 'tools/markdown-heading', 'Heading', 'Markdown 标题层级处理', 'none', false, 6),
  ('parking', '停车收费', '交互工具', 'tools/parking', 'Car', '家庭停车收费信息', 'shared', true, 7),
  ('image-stitch', '图片拼接', '交互工具', 'tools/image-stitch', 'Image', '图片拼接工具', 'none', false, 8),
  ('word-count', '字数统计', '交互工具', 'tools/word-count', 'Hash', '文本字数统计', 'none', false, 9),
  ('pixabay-download', 'Pixabay 下载', '交互工具', 'tools/pixabay', 'Image', 'Pixabay 图片搜索下载', 'none', false, 10),
  ('movie', '家庭电影', '信息面板', 'tools/movie', 'Film', '家庭电影库', 'shared', true, 11),
  ('todo', 'Todo', '任务管理', 'tools/todo', 'ListTodo', '个人待办事项', 'private', true, 12)
on conflict (id) do update set
  name = excluded.name,
  category = excluded.category,
  route = excluded.route,
  icon = excluded.icon,
  description = excluded.description,
  data_scope = excluded.data_scope,
  writable = excluded.writable,
  sort_order = excluded.sort_order;

-- View-only tools shared by every non-admin seed role.
insert into public.role_permissions (role_id, tool_id, access_level)
select r.id, t.id, 'view'
from public.roles r
cross join public.tools t
where r.id in (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000004'
)
  and t.id in (
    'docker-k8s-cheatsheet',
    'sql-cheatsheet',
    'redis-cheatsheet',
    'typora-shortcuts',
    'chrome-extension-packaging',
    'markdown-heading',
    'image-stitch',
    'word-count',
    'pixabay-download'
  )
on conflict (role_id, tool_id) do update set access_level = excluded.access_level;

-- Writable / shared seed permissions.
insert into public.role_permissions (role_id, tool_id, access_level) values
  ('00000000-0000-0000-0000-000000000002', 'parking', 'edit'),
  ('00000000-0000-0000-0000-000000000002', 'movie', 'edit'),
  ('00000000-0000-0000-0000-000000000002', 'todo', 'edit'),
  ('00000000-0000-0000-0000-000000000003', 'parking', 'edit'),
  ('00000000-0000-0000-0000-000000000003', 'movie', 'view'),
  ('00000000-0000-0000-0000-000000000003', 'todo', 'view'),
  ('00000000-0000-0000-0000-000000000004', 'parking', 'view'),
  ('00000000-0000-0000-0000-000000000004', 'movie', 'view'),
  ('00000000-0000-0000-0000-000000000004', 'todo', 'view')
on conflict (role_id, tool_id) do update set access_level = excluded.access_level;

-- ============================================================
-- Cloud SaaS Toolkit — system notifications
-- Tables + RLS + indexes + triggers
-- ============================================================

-- 系统通知主表
create table public.system_notifications (
  id            uuid primary key default extensions.gen_random_uuid(),
  title         text not null,
  content       text not null,
  type          text not null check (type in ('maintenance','new_tool','announcement','alert')),
  priority      text not null default 'info' check (priority in ('info','warning','important')),
  target_route  text,
  status        text not null default 'draft' check (status in ('draft','published','archived','unpublished')),
  created_by    uuid not null references public.profiles(id),
  created_at    timestamptz not null default now(),
  published_at  timestamptz,                -- 发布时间（本版本发布时直接 now()）
  expires_at    timestamptz default now() + interval '30 days',
  updated_at    timestamptz not null default now(),
  read_count    integer not null default 0 check (read_count >= 0)
);

comment on table public.system_notifications is '系统通知：用户端横幅 + 通知中心 + Admin 管理';
comment on column public.system_notifications.status is 'draft / published / unpublished / archived';
comment on column public.system_notifications.read_count is '已读人数，由 SECURITY DEFINER 触发器维护';

-- 用户已读已关记录
create table public.user_notification_reads (
  id              uuid primary key default extensions.gen_random_uuid(),
  notification_id uuid not null references public.system_notifications(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  read_at         timestamptz,
  dismissed_at    timestamptz,
  created_at      timestamptz not null default now(),
  unique (notification_id, user_id)
);

comment on table public.user_notification_reads is '通知读取/关闭记录；read_at 由触发器递增 system_notifications.read_count';

create index system_notifications_active_idx
  on public.system_notifications (status, published_at, expires_at);

create index user_notification_reads_user_idx
  on public.user_notification_reads (user_id);

-- 让已身份验证用户读通知主表、读写自己的读取记录
grant select on public.system_notifications to authenticated;
grant select, insert, update on public.user_notification_reads to authenticated;

alter table public.system_notifications enable row level security;
alter table public.user_notification_reads enable row level security;

-- ============================================================
-- RLS 策略
-- ============================================================

-- 用户只能看到已发布、未过期、已到发布时间的通知
create policy users_read_published on public.system_notifications
  for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
  );

-- Admin 可全权管理
create policy admin_all on public.system_notifications
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy self_insert on public.user_notification_reads
  for insert
  with check (auth.uid() = user_id);

create policy self_update on public.user_notification_reads
  for update
  using (auth.uid() = user_id);

create policy self_select on public.user_notification_reads
  for select
  using (auth.uid() = user_id);

-- Admin 管理端需要读取 read_count / 已读用户列表
create policy admin_read_reads on public.user_notification_reads
  for select
  using (public.is_admin());

-- ============================================================
-- 触发器
-- ============================================================

drop trigger if exists system_notifications_set_updated_at on public.system_notifications;
create trigger system_notifications_set_updated_at
  before update on public.system_notifications
  for each row
  execute function public.set_updated_at();

-- 用户展开通知详情写入 read_at 时，递增已读人数
create or replace function public.trg_inc_notification_read_count()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.read_at is not null and (tg_op = 'INSERT' or old.read_at is null) then
    update public.system_notifications
    set read_count = read_count + 1
    where id = new.notification_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_inc_notification_read_count on public.user_notification_reads;
create trigger trg_inc_notification_read_count
  after insert or update of read_at
  on public.user_notification_reads
  for each row
  execute function public.trg_inc_notification_read_count();

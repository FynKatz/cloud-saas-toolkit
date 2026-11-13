-- ============================================================
-- Cloud SaaS Toolkit — notification RLS fixes (v2)
-- Fixes per spec §10.1 decisions #26, #29
-- 1. Add target_user_id column for targeted notifications
-- 2. users_read_published: add approved status + target_user_id check
-- 3. user_notification_reads.self_select: add approved status filter
-- 4. user_notification_reads.self_update: add WITH CHECK + REVOKE columns
-- ============================================================

-- 1. Add target_user_id column (nullable — NULL = broadcast)
alter table public.system_notifications
  add column if not exists target_user_id uuid references auth.users(id) on delete set null;

comment on column public.system_notifications.target_user_id is
  '定向通知目标用户；NULL 为广播通知，非 NULL 仅对该用户可见';

-- 2. Replace users_read_published to include approved status + target_user_id
drop policy if exists users_read_published on public.system_notifications;

create policy users_read_published on public.system_notifications
  for select
  using (
    status = 'published'
    and published_at is not null
    and published_at <= now()
    and (expires_at is null or expires_at > now())
    -- user must be approved to see notifications
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
    -- targeted or broadcast
    and (target_user_id is null or target_user_id = auth.uid())
  );

-- 3. Replace self_select on user_notification_reads with approved status filter
drop policy if exists self_select on public.user_notification_reads;

create policy self_select on public.user_notification_reads
  for select
  using (
    auth.uid() = user_id
    and exists (select 1 from public.profiles where id = auth.uid() and status = 'approved')
  );

-- 4. Replace self_update with WITH CHECK to prevent reassignment
drop policy if exists self_update on public.user_notification_reads;

create policy self_update on public.user_notification_reads
  for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and read_at is not null
  );

-- 5. Column-level REVOKE — prevent authenticated users from reassigning
--    notification_id or user_id (WITH CHECK can only validate NEW row, not
--    compare OLD.notification_id; column-level REVOKE is the reliable path)
revoke update (notification_id, user_id) on public.user_notification_reads from authenticated;

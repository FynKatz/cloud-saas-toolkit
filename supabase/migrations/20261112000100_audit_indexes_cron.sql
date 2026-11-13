-- ============================================================
-- Cloud SaaS Toolkit — audit_logs indexes + pg_cron (v2)
-- Per spec §10.1 decisions #27, #28
-- 1. Indexes on audit_logs for query performance
-- 2. pg_cron: purge old audit logs daily (90 days)
-- 3. pg_cron: archive expired notifications daily
-- PREREQUISITE: pg_cron extension must be enabled in Supabase Dashboard
--    (Dashboard → Extensions → pg_cron). This migration does NOT create the
--    extension because it requires superuser.
-- ============================================================

-- 1. Indexes on audit_logs (if not already present)
create index if not exists idx_audit_logs_created_at
  on public.audit_logs (created_at desc);

create index if not exists idx_audit_logs_action_created
  on public.audit_logs (action, created_at desc);

-- 2. pg_cron: purge audit logs older than 90 days (daily at 3 AM)
--    Will silently skip if pg_cron extension is missing
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'purge-audit-logs',
      '0 3 * * *',
      $$delete from public.audit_logs where created_at < now() - interval '90 days'$$
    );
  end if;
end;
$$;

-- 3. pg_cron: archive expired notifications (daily at 4 AM)
do $$
begin
  if exists (
    select 1 from pg_extension where extname = 'pg_cron'
  ) then
    perform cron.schedule(
      'archive-expired-notifications',
      '0 4 * * *',
      $$update public.system_notifications
        set status = 'archived'
        where status in ('published','unpublished')
          and expires_at is not null
          and expires_at < now()$$
    );
  end if;
end;
$$;

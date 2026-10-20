-- ============================================================
-- Cloud SaaS Toolkit — Phase 2 completion
-- Admin RBAC policies + audit helper
-- ============================================================

-- Admin needs to read every profile regardless of status (user management).
-- The existing profiles_select_admin policy already covers approved admins;
-- this keeps the read path explicit for status-filtered lists.
drop policy if exists profiles_select_admin_all on public.profiles;
create policy profiles_select_admin_all on public.profiles
  for select to authenticated
  using (public.is_admin());

-- ------------------------------------------------------------
-- audit_logs: append-only writer for Edge Functions running as
-- the authenticated user (service_role bypasses RLS anyway, but
-- this keeps the contract testable from the client role).
-- ------------------------------------------------------------
drop policy if exists audit_logs_insert_admin on public.audit_logs;
create policy audit_logs_insert_admin on public.audit_logs
  for insert to authenticated
  with check (public.is_admin() and actor_id = auth.uid());

-- ------------------------------------------------------------
-- is_admin_for(uuid): admin check for an explicit user id.
-- Edge Functions run with service_role, where auth.uid() is NULL, so the
-- RLS-oriented is_admin() cannot be reused there. This variant takes the
-- caller id resolved from the verified JWT.
-- ------------------------------------------------------------
create or replace function public.is_admin_for(p_user_id uuid)
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
    where ur.user_id = p_user_id
      and r.name = 'admin'
      and p.status = 'approved'
  );
$$;

-- ------------------------------------------------------------
-- Helper: list users with their role names in one round trip.
-- SECURITY DEFINER + explicit admin gate so it can never leak to
-- non-admins even if a policy is later loosened.
-- ------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id uuid,
  username text,
  display_name text,
  status text,
  prior_status text,
  reject_reason text,
  must_change_password boolean,
  created_at timestamptz,
  deleted_at timestamptz,
  roles text[]
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Caller authorisation is enforced by the Edge Function via is_admin_for().
  -- This function is granted to service_role only, so it never runs with a
  -- client-controlled auth.uid().
  return query
    select
      p.id,
      p.username,
      p.display_name,
      p.status,
      p.prior_status,
      p.reject_reason,
      p.must_change_password,
      p.created_at,
      p.deleted_at,
      coalesce(
        (
          select array_agg(r.name order by r.name)
          from public.user_roles ur
          join public.roles r on r.id = ur.role_id
          where ur.user_id = p.id
        ),
        array[]::text[]
      )
    from public.profiles p
    order by
      case p.status
        when 'pending' then 0
        when 'approved' then 1
        when 'rejected' then 2
        else 3
      end,
      p.created_at desc;
end;
$$;

-- ------------------------------------------------------------
-- Helper: role list with tool permission counts for the role admin page.
-- ------------------------------------------------------------
create or replace function public.admin_list_roles()
returns table (
  id uuid,
  name text,
  description text,
  is_system boolean,
  permission_count int,
  user_count int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  -- Caller authorisation is enforced by the Edge Function via is_admin_for().
  return query
    select
      r.id,
      r.name,
      r.description,
      r.is_system,
      (select count(*)::int from public.role_permissions rp where rp.role_id = r.id),
      (select count(*)::int from public.user_roles ur where ur.role_id = r.id)
    from public.roles r
    order by r.is_system desc, r.name;
end;
$$;

-- ------------------------------------------------------------
-- revoke_user_sessions(uuid): invalidate every refresh token for a user.
--
-- GoTrue exposes no "revoke all sessions for user id" REST endpoint, and a
-- stateless access token cannot be recalled before it expires. Deleting the
-- user's rows in auth.sessions makes all refresh tokens unusable immediately,
-- so the session dies at the next token refresh (default JWT lifetime <= 1h).
-- ------------------------------------------------------------
create or replace function public.revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from auth.sessions where user_id = p_user_id;
  delete from auth.refresh_tokens where user_id = p_user_id::text;
end;
$$;

-- ------------------------------------------------------------
-- count_active_admins(): how many approved admins exist. Used to block
-- deleting or demoting the final administrator.
-- ------------------------------------------------------------
create or replace function public.count_active_admins()
returns int
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select count(distinct ur.user_id)::int
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  join public.profiles p on p.id = ur.user_id
  where r.name = 'admin'
    and p.status = 'approved';
$$;

-- admin_list_users / admin_list_roles / is_admin_for are called from Edge
-- Functions (service_role) only. Revoke the implicit PUBLIC grant so a signed-in
-- non-admin cannot read the whole user table through PostgREST.
revoke all on function public.admin_list_users() from public, anon, authenticated;
revoke all on function public.admin_list_roles() from public, anon, authenticated;
revoke all on function public.is_admin_for(uuid) from public, anon, authenticated;
grant execute on function public.admin_list_users() to service_role;
grant execute on function public.admin_list_roles() to service_role;
grant execute on function public.is_admin_for(uuid) to service_role;
revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;
revoke all on function public.count_active_admins() from public, anon, authenticated;
grant execute on function public.count_active_admins() to service_role;

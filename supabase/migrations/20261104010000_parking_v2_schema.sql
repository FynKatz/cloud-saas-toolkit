-- ============================================================
-- Cloud SaaS Toolkit — 停车收费 V2：数据字典 + 停车场 + 权限
-- 新表与旧 parking_info 完全分离，旧表及其 RLS 不动。
-- ============================================================

-- ------------------------------------------------------------
-- 1. 全国省市行政区（扁平表：一次导入 + 级联下拉 + 简单维护）
-- ------------------------------------------------------------
create table if not exists public.regions (
  province_code text not null,
  province_name text not null,
  city_code text not null,
  city_name text not null,
  district_code text primary key,
  district_name text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  updated_at timestamptz not null default now()
);

comment on table public.regions is '全国省市行政区字典（不含港澳台）';

-- ------------------------------------------------------------
-- 2. 商场/停车场字典
-- ------------------------------------------------------------
create table if not exists public.parking_malls (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  province text,
  city text,
  district text,
  province_code text,
  city_code text,
  district_code text,
  address text,
  user_id uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, province_code, city_code, district_code)
);

comment on table public.parking_malls is '可维护商场/停车场字典，普通用户经 RPC 顺带补充';

-- ------------------------------------------------------------
-- 3. 停车场主表
-- ------------------------------------------------------------
create table if not exists public.parking_locations (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  province_code text,
  province text,
  city_code text,
  city text,
  district_code text,
  district text,
  mall_id uuid references public.parking_malls(id),
  mall text,
  address text,
  location jsonb,
  free_duration int,
  charge_interval int,
  day_price numeric,
  night_price numeric,
  day_unit text,
  night_unit text,
  notes text,
  images text[],
  status text not null default 'active' check (status in ('active','inactive')),
  user_id uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.parking_locations is '共享停车场 V2 主表；普通用户新增走 create_parking_location RPC，admin 直连维护';

-- ------------------------------------------------------------
-- 4. 个人收藏（停车场共享 + 收藏个人化）
-- ------------------------------------------------------------
create table if not exists public.user_parking_favorites (
  user_id uuid not null references auth.users(id),
  parking_location_id uuid not null references public.parking_locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, parking_location_id)
);

comment on table public.user_parking_favorites is '用户个人停车场收藏';

-- ------------------------------------------------------------
-- 5. 索引
-- ------------------------------------------------------------
create index if not exists parking_locations_status_created_idx
  on public.parking_locations (status, created_at desc);
create index if not exists parking_locations_region_idx
  on public.parking_locations (province_code, city_code, district_code);
create index if not exists parking_locations_mall_id_idx
  on public.parking_locations (mall_id);
create index if not exists user_parking_favorites_location_idx
  on public.user_parking_favorites (parking_location_id);
create index if not exists parking_malls_status_region_idx
  on public.parking_malls (status, province_code, city_code);
create index if not exists regions_region_idx
  on public.regions (province_code, city_code, district_code);

-- ------------------------------------------------------------
-- 6. updated_at triggers
-- ------------------------------------------------------------
drop trigger if exists regions_set_updated_at on public.regions;
create trigger regions_set_updated_at before update on public.regions
  for each row execute function public.set_updated_at();
drop trigger if exists parking_malls_set_updated_at on public.parking_malls;
create trigger parking_malls_set_updated_at before update on public.parking_malls
  for each row execute function public.set_updated_at();
drop trigger if exists parking_locations_set_updated_at on public.parking_locations;
create trigger parking_locations_set_updated_at before update on public.parking_locations
  for each row execute function public.set_updated_at();

-- ------------------------------------------------------------
-- 7. RLS
-- ------------------------------------------------------------
alter table public.regions enable row level security;
alter table public.parking_malls enable row level security;
alter table public.parking_locations enable row level security;
alter table public.user_parking_favorites enable row level security;

-- regions：普通用户只读 active，admin 全量读写
drop policy if exists regions_select_view on public.regions;
create policy regions_select_view on public.regions
  for select to authenticated
  using (public.has_tool_permission('parking', 'view') and active = true);

drop policy if exists regions_select_admin on public.regions;
create policy regions_select_admin on public.regions
  for select to authenticated
  using (public.is_admin());

drop policy if exists regions_insert_admin on public.regions;
create policy regions_insert_admin on public.regions
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists regions_update_admin on public.regions;
create policy regions_update_admin on public.regions
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists regions_delete_admin on public.regions;
create policy regions_delete_admin on public.regions
  for delete to authenticated
  using (public.is_admin());

-- parking_malls：普通用户只读 active；写仅 admin；普通用户新增停车场时经 RPC 补充
drop policy if exists parking_malls_select_view on public.parking_malls;
create policy parking_malls_select_view on public.parking_malls
  for select to authenticated
  using (public.has_tool_permission('parking', 'view') and status = 'active');

drop policy if exists parking_malls_select_admin on public.parking_malls;
create policy parking_malls_select_admin on public.parking_malls
  for select to authenticated
  using (public.is_admin());

drop policy if exists parking_malls_insert_admin on public.parking_malls;
create policy parking_malls_insert_admin on public.parking_malls
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists parking_malls_update_admin on public.parking_malls;
create policy parking_malls_update_admin on public.parking_malls
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists parking_malls_delete_admin on public.parking_malls;
create policy parking_malls_delete_admin on public.parking_malls
  for delete to authenticated
  using (public.is_admin());

-- parking_locations：普通用户读 active；写仅 admin 直连，普通用户新增走 RPC
drop policy if exists parking_locations_select_view on public.parking_locations;
create policy parking_locations_select_view on public.parking_locations
  for select to authenticated
  using (public.has_tool_permission('parking', 'view') and status = 'active');

drop policy if exists parking_locations_select_admin on public.parking_locations;
create policy parking_locations_select_admin on public.parking_locations
  for select to authenticated
  using (public.is_admin());

drop policy if exists parking_locations_insert_admin on public.parking_locations;
create policy parking_locations_insert_admin on public.parking_locations
  for insert to authenticated
  with check (public.is_admin());

drop policy if exists parking_locations_update_admin on public.parking_locations;
create policy parking_locations_update_admin on public.parking_locations
  for update to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists parking_locations_delete_admin on public.parking_locations;
create policy parking_locations_delete_admin on public.parking_locations
  for delete to authenticated
  using (public.is_admin());

-- user_parking_favorites：自己的行 + parking view
drop policy if exists user_parking_favorites_select_own on public.user_parking_favorites;
create policy user_parking_favorites_select_own on public.user_parking_favorites
  for select to authenticated
  using (user_id = auth.uid() and public.has_tool_permission('parking', 'view'));

drop policy if exists user_parking_favorites_insert_own on public.user_parking_favorites;
create policy user_parking_favorites_insert_own on public.user_parking_favorites
  for insert to authenticated
  with check (user_id = auth.uid() and public.has_tool_permission('parking', 'view'));

drop policy if exists user_parking_favorites_delete_own on public.user_parking_favorites;
create policy user_parking_favorites_delete_own on public.user_parking_favorites
  for delete to authenticated
  using (user_id = auth.uid() and public.has_tool_permission('parking', 'view'));

-- ------------------------------------------------------------
-- 8. 权限校验 + 新增停车场的 SECURITY DEFINER RPC
-- ------------------------------------------------------------
create or replace function public.can_write_parking()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin()
    or public.has_tool_permission('parking', 'edit');
$$;

revoke all on function public.can_write_parking() from public, anon;
grant execute on function public.can_write_parking() to authenticated;

-- 普通用户新增停车场：同一事务内 upsert 商场字典 + 写入停车场。
-- 函数强制 user_id = auth.uid()，并校验已审批/改密/停车 view 权限。
create or replace function public.create_parking_location(payload jsonb)
returns public.parking_locations
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_mall_id uuid;
  v_mall_province text;
  v_mall_city text;
  v_mall_district text;
  v_mall_name text;
  v_result public.parking_locations;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_tool_permission('parking', 'view') then
    raise exception 'PERMISSION_DENIED';
  end if;

  -- payload 必须由调用者提供名称和区域文本，函数把 auth.uid() 强制写入 user_id
  v_mall_name := nullif(trim(coalesce(payload ->> 'mall', '')), '');
  v_mall_province := nullif(trim(coalesce(payload ->> 'province', '')), '');
  v_mall_city := nullif(trim(coalesce(payload ->> 'city', '')), '');
  v_mall_district := nullif(trim(coalesce(payload ->> 'district', '')), '');

  if v_mall_name is not null then
    insert into public.parking_malls (
      name, province, city, district,
      province_code, city_code, district_code,
      address, user_id
    )
    values (
      v_mall_name,
      v_mall_province,
      v_mall_city,
      v_mall_district,
      nullif(trim(coalesce(payload ->> 'province_code', '')), ''),
      nullif(trim(coalesce(payload ->> 'city_code', '')), ''),
      nullif(trim(coalesce(payload ->> 'district_code', '')), ''),
      nullif(trim(coalesce(payload ->> 'address', '')), ''),
      v_user_id
    )
    on conflict (name, province_code, city_code, district_code)
    do update set
      province = excluded.province,
      city = excluded.city,
      district = excluded.district,
      address = coalesce(
        case when excluded.address is null or excluded.address = '' then null end,
        public.parking_malls.address,
        excluded.address
      ),
      status = 'active'
    returning id into v_mall_id;
  end if;

  insert into public.parking_locations (
    name, province_code, province, city_code, city, district_code, district,
    mall_id, mall, address, location, free_duration, charge_interval,
    day_price, night_price, day_unit, night_unit, notes, images, status, user_id
  )
  values (
    nullif(trim(coalesce(payload ->> 'name', '')), ''),
    nullif(trim(coalesce(payload ->> 'province_code', '')), ''),
    v_mall_province,
    nullif(trim(coalesce(payload ->> 'city_code', '')), ''),
    v_mall_city,
    nullif(trim(coalesce(payload ->> 'district_code', '')), ''),
    v_mall_district,
    v_mall_id,
    nullif(trim(coalesce(payload ->> 'mall', '')), ''),
    nullif(trim(coalesce(payload ->> 'address', '')), ''),
    (payload ->> 'location')::jsonb,
    nullif(coalesce((payload ->> 'free_duration')::int, 0), 0),
    nullif(coalesce((payload ->> 'charge_interval')::int, 0), 0),
    nullif(coalesce((payload ->> 'day_price')::numeric, 0), 0),
    nullif(coalesce((payload ->> 'night_price')::numeric, 0), 0),
    nullif(trim(coalesce(payload ->> 'day_unit', '')), ''),
    nullif(trim(coalesce(payload ->> 'night_unit', '')), ''),
    nullif(trim(coalesce(payload ->> 'notes', '')), ''),
    case
      when jsonb_typeof(payload -> 'images') = 'array'
      then array(select jsonb_array_elements_text(payload -> 'images'))
      else null
    end,
    'active',
    v_user_id
  )
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.create_parking_location(jsonb) from public, anon;
grant execute on function public.create_parking_location(jsonb) to authenticated;

-- ------------------------------------------------------------
-- 9. 收藏 RPC：统一校验权限 + 去重 + 返回收藏状态
-- ------------------------------------------------------------
create or replace function public.toggle_parking_favorite(p_location_id uuid, p_favorite boolean)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_exists boolean;
begin
  if v_user_id is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  if not public.has_tool_permission('parking', 'view') then
    raise exception 'PERMISSION_DENIED';
  end if;

  -- 收藏的停车场必须在 select 可见范围内（active），避免通过收藏探测停用/越权数据
  if not exists (
    select 1 from public.parking_locations
    where id = p_location_id and status = 'active'
  ) then
    raise exception 'LOCATION_NOT_FOUND';
  end if;

  select exists (
    select 1 from public.user_parking_favorites
    where user_id = v_user_id and parking_location_id = p_location_id
  ) into v_exists;

  if p_favorite then
    insert into public.user_parking_favorites (user_id, parking_location_id)
    values (v_user_id, p_location_id)
    on conflict (user_id, parking_location_id) do nothing;
    return true;
  else
    delete from public.user_parking_favorites
    where user_id = v_user_id and parking_location_id = p_location_id;
    return false;
  end if;
end;
$$;

revoke all on function public.toggle_parking_favorite(uuid, boolean) from public, anon;
grant execute on function public.toggle_parking_favorite(uuid, boolean) to authenticated;

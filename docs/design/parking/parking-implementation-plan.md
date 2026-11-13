# 停车收费 V2 实施计划

> 状态：Phase A-F 代码实施完成，浏览器回归与收尾中（2026-11-05）  
> 分支：`feature/2610`  
> 关联原型：`docs/design/parking/parking-combined.html`（已定稿，不得改动）  
> 目标：把生产页 `frontend/src/views/ParkingView.vue` 替换为已确认的「管理密度 + 地图联动」方案，并补上数据字典、数据管理、真实高德地图与符合权限模型的 RLS。

---

## 1. 范围与边界

### 1.1 本期做

- 停车场数据字典：全国省市行政区一次性导入（不含港澳台）+ 停车场/商场维护。
- 停车场页 V2：KPI、搜索/筛选、常用停车场表格、左侧卡片列表 + 右侧高德地图联动、详情抽屉、收藏。
- 管理面板新增「数据管理」，内分「省市行政区」「商场管理」「停车场管理」三个子页。
- 权限调整：普通已授权用户可新增停车场；admin 可编辑、删除、停用；游客/未授权用户不可见不可写。
- 停车图片仍走 `parking-images` Storage，但与 old schema 分离，写入新表。
- 地图与地理编码切换到高德（AMap JS Key + Web Key），旧百度 Key 不迁移。

### 1.2 本期不做

- 不做停车记录、账单、支付、预约、导航跳转。
- 不做停车场实时空闲/价格联动，不做第三方停车 API 接入。
- 不迁移旧 `parking_info` 数据（用户明确：旧停车数据不处理，只维护新数据）。
- 不做“只有创建者才能编辑自己记录”的行级权限；编辑/删除/停用统一为 admin 操作。
- 不在此期重构其他工具页；统一 UI/UX 继续沿用已定稿全局设计。

### 1.3 已确认决策（来自评审记录）

1. 页面结构：方案 A 管理密度（KPI + 筛选 + 表格）+ 方案 B 下半部分（左侧卡片列表 + 右侧地图标记）。
2. 普通用户可新增停车场；admin 才能编辑/删除/停用。
3. 省市行政区一次性导入国内数据（不含港澳台）；商场/停车场做成可维护下拉，下拉最后有“新增”入口。
4. “数据管理”作为管理面板新菜单，内含省市行政区管理 + 商场管理 + 停车场管理。
5. 停车数据以共享方式维护；常见停车场 + 收藏停车场为当前主要使用场景。
6. 地图交互（搜索、marker、缩放、定位、图例）按成熟产品实现，不强制复刻旧停车页 UX。
7. 地图 API 使用高德，JS Key / Web Key 已在本机密文件与旧库中有记录，实施时校验并写入 `.env.secrets` / `frontend/.env`。

---

## 2. 现状与差异

| 项 | 现状 | 目标 |
|---|---|---|
| 数据表 | `parking_info`（旧字段，`user_id` 审计，RLS 要求 edit 才能读写） | 新表 `parking_locations`（含名称、收藏关系、状态、位置；普通用户可新增，admin 管理） |
| 行政区 | 无字典，筛选来自已有记录 | `regions` 全国省市县准数据 + 级联筛选 |
| 商场/停车场 | 无字典，表单自由输入 | `parking_malls` 或复用停车场名称字典 + 下拉新增 |
| 页面 | 表格 + 简单过滤 + 旧表单 | 已定稿 A+B 组合原型 1:1 |
| 地图 | 无（旧站百度地图） | 高德 JS SDK 按需加载，Marker/P搜索/定位/缩放 |
| 权限 | `has_tool_permission('parking','edit')` 控制一切写 | insert=普通用户经 RPC，update/delete/状态变更=admin |
| 管理入口 | 无 | `/admin/data`（省市行政区 + 停车场管理） |
| Dashboard | `parking_info` 计数 | 切到新表；如需可按 active 计数 |

---

## 3. 总体架构

```text
Vue 3 ParkingView
 ├─ parking API composable（查询/筛选/收藏/新增/管理操作）
 ├─ AMap 加载器（load-on-demand，VITE_AMAP_JS_KEY）
 ├─ 级联行政区 + 停车场/商场下拉
 └─ 详情抽屉 / 表单抽屉 / 数据管理子页
        ↓
Supabase RLS：
 parking_locations  select=view，insert=普通用户经 RPC，update/delete=admin
 regions            select=view（admin 可维护 active），普通用户不可写
parking_malls      select=view，admin 可维护；普通用户新增停车场时经 RPC 辅助 upsert
 user_parking_favorites 按 user_id 隔离，RLS 校验 parking view 权限
        ↓
高德（可选 Edge Function 代理 Web Key，避免前端直接暴露服务端 Key）
```

---

## 4. 数据库迁移（新增 1 个主迁移 + 1 个种子迁移）

采用**新表而非在旧表上叠加**，避免旧字段语义、旧 RLS 和旧数据干扰。

> 权限口径统一为：**普通用户新增停车场走 RPC；admin 直连编辑/删除/停用；商场字典表不向客户端开放直接写入。** 本节 RLS 表以 RPC 方案为准。

### 4.1 `regions` 全国省市行政区

```sql
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
```

说明：

- 采用扁平表（province/city/district 三列），比 `parent_code` 递归结构更适合“全国一次导入 + 级联下拉 + 简单维护”。
- 省市代码只作稳定标识，不依赖行政区划代码的省直辖县级市层级处理；不含港澳台。
- 数据源：实现时从公开的全国行政区划 CSV/JSON（民政部标准数据或高德行政区接口）生成 `supabase/seed/regions/regions.sql`，一次导入约 3000+ 行。
- `active=false` 预留：未来遇行政区划调整可停用旧区，不影响已有停车场显示。

### 4.2 `parking_locations`

```sql
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
```

关键点：

- `name` 是展示主名（原型用 `name`），`mall` 保留为可维护字典文本，二者可不同（例如“陆家嘴中心 L+Mall 停车场” vs 商场“陆家嘴中心 L+Mall”）。
- 若后期要把“停车场名”和“商场”统一为单一实体，可以把 `name` 直接作为 `mall` 的展示名并在前端做区分，但建议保持两列，避免后续再拆。
- `location jsonb` 字段随高德选点写 `{lng,lat,address,poi?}`。
- `user_id` 保留审计（谁新增），RLS 不按行隔离。
- `status='inactive'` 支持 admin 停用；select 默认只返回 active（详情抽屉对已停用记录做只读展示，不进入主列表）。

### 4.3 `parking_malls`（可维护商场/停车场字典）

```sql
create table if not exists public.parking_malls (
  id uuid primary key default extensions.gen_random_uuid(),
  name text not null,
  province text, city text, district text,
  province_code text, city_code text, district_code text,
  address text,
  user_id uuid not null references auth.users(id),
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (name, province_code, city_code, district_code)
);
```

说明：

- 下拉选项来自该表；普通用户新增停车场时可用“+ 新增商场”，把新商场写入字典后回填。
- 普通用户**不直接写 `parking_malls`**：新增停车场时前端调用 `create_parking_location` RPC（或由 `parking_locations` insert 触发器），在同一个事务里插入停车场并 upsert 商场字典。这样字典表仍由 admin 维护，普通用户只需“顺手补充”不构成独立写入口。
- 同时保留省市文本与行政区代码：文本用于展示/兼容旧数据，代码用于去重与过滤。
- 商场停用后不在新增下拉出现，但已有停车场的 `mall` 文本保留展示。

### 4.4 `user_parking_favorites`

```sql
create table if not exists public.user_parking_favorites (
  user_id uuid not null references auth.users(id),
  parking_location_id uuid not null references public.parking_locations(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, parking_location_id)
);
```

设计原因：

- 若在共享表上放 `is_favorite` 布尔列，用户 A 收藏会改变所有人看到的“收藏”状态，不符合个人收藏语义。
- 独立偏好表使“停车场共享 + 收藏个人化”解耦；将来改私人/共享只需改 RLS，不迁数据。
- RLS：用户只能读/写自己的 `user_id` 行，且须 `has_tool_permission('parking','view')`。

### 4.5 RLS 策略

| 表 | select | insert | update/delete |
|---|---|---|---|
| `regions` | 普通用户：parking view 且 `active=true`；admin：全部 | admin | admin |
| `parking_malls` | 普通用户：parking view 且 `active`；admin：全部 | admin（RPC 辅助 upsert） | admin |
| `parking_locations` | 普通用户：parking view 且 `status='active'`；admin：全部（含 inactive） | admin 直连；普通用户仅经 `create_parking_location` RPC | admin |
| `user_parking_favorites` | 自己的行且 parking view | 自己的行且 parking view | 自己的行且 parking view |

补充 RLS 细节：

- 所有策略复用现有 `has_tool_permission()`（已含审批/改密/删除用户的门槛）。
- `parking_malls` 与 `parking_locations` 都不向普通用户开放直接 INSERT：普通用户统一走 `create_parking_location` RPC，函数内部强制 `user_id = auth.uid()`、校验 must_change_password/status、并 upsert 商场字典。
- `parking_locations` 的 update 除 `is_admin()` 外还校验 `status` 变更、关键字段，后续可在 migration 定义 CHECK/trigger 收口。
- `user_parking_favorites` 不能因为收藏了不可见记录而泄露数据：RLS + 前端过滤双重保证。
- 保留旧 `parking_info` 及其 RLS 不动（兼容 Dashboard 统计），新页面不再读写它。

### 4.6 需要的索引

- `parking_locations(province, city, district, status)` 支持筛选。
- `parking_locations(status, created_at desc)` 支持列表排序。
- `parking_locations(mall_id)`、`parking_locations(district_code)`。
- `user_parking_favorites(parking_location_id)`。
- `regions(province_code, city_code, district_code)`（主键已覆盖 district_code，其余按查询补充）。
- `parking_malls(status, province_code, city_code)` 支持下拉按区域过滤。

### 4.7 图片与公开 URL

- `parking-images` bucket 是 `public=false`（私有 Storage），不存在稳定的公开 URL；现有代码用 `getPublicUrl` 拼接，即使能打开也是靠 RLS 兜底，不严谨。
- 新方案：前端保存图片时拿到 Storage 对象路径（或签名 URL），列表页/详情页通过带 session 的受保护读取方式展示；admin/已授权用户才能看到图片。
- 具体实现候选：
  1. 表里 `images` 存对象路径，前端请求时用 `supabase.storage.from(...).createSignedUrl()` 或 RLS 直接读对象；
  2. 若仍存公开 URL，必须确认 bucket 确实公开；当前 bucket 是私有，应避免存公开 URL。
- 图片删除权限：admin 可删除任意图片；上传者本人可删除自己的上传（若 Storage 元数据能记录 owner）。若无 owner 元数据，实施时给上传对象写入 `user_metadata.owner_id` 并在 RLS delete 判断。

### 4.8 种子数据

- `regions.sql`：一次导入全国省市县（不含港澳台），来源固定在 `supabase/seed/regions/`；实施时校验总行数、省/市/区结构、重复 district_code。
- 停车场种子：不写假数据；首版以空状态上线，由用户/管理员后续维护。
- 可选：把高频商场（如陆家嘴 L+Mall 等）作为字典种子，避免首屏全空，但**不得写入虚构停车记录**。

---

## 5. 后端（Supabase + Edge Function）

### 5.1 已有能力复用

- `is_admin()`、`has_tool_permission()`、`user_id` 默认 `auth.uid()` 等已存在，不改公共函数。
- `parking-images` Storage 策略按新规则调整：
  - select：保持 view 权限。
  - insert：普通用户也要能上传图片（因为普通用户可新增停车场），改为 `has_tool_permission('parking','view')` + 已审批用户，而不是 edit。
  - delete：仅 admin 或上传者本人；若当前 bucket 无 owner 字段，可保留 admin 或按历史策略限制 admin 删除，实施时定。

### 5.2 新增/调整函数

- 若需要：`get_regions(province_code?, city_code?)` 聚合省市县树，减少客户端多次请求。
- 若需要：`toggle_parking_favorite(p_location_id, favorite bool)` RPC，统一校验权限、去重、返回最新状态。
- `create_parking_location(payload jsonb)` RPC（推荐）：SECURITY DEFINER，校验当前用户是已审批且有 parking view 权限；普通用户只能新增 parking_locations + upsert 商场字典 + 上传图片；admin 走同一入口或保留直接 update/delete 能力。
- `create_parking_location` 的图片上传由前端先调用 Storage 上传（带 RLS），把 `{path, url?}` 放进 payload；RPC 不直接保管图片二进制，避免函数体过大和慢调用。
- Edge Function `amap_geocode`（可选但建议）：
  - 输入地址 → 调 `AMap Web Key`（`restapi.amap.com/v3/geocode/geo`）→ 返回坐标与行政区信息。
  - Key 为 C 级，只在 Edge Function 环境变量中存在，前端不能直接拿 Web Key。
  - 地图 SDK 的 `AMap.PlaceSearch` 由 JS Key 直接在前端调用，不走 Edge Function。
- 若不需要 Edge Function，最低限度可用 JS Key 的 `AMap.Geocoder` 在前端完成；但 PRD 已定义 Web Key 走服务端，建议按 Edge Function 实现（不影响本阶段前端联调）。

---

## 6. 前端实施

### 6.1 新文件/目录

```text
frontend/src/
 ├─ lib/amap.ts                    # AMap SDK 动态加载 + 初始化 + geocode 封装
 ├─ lib/parking.ts（或 composables/useParking.ts）
 │                                 # 查询/筛选/收藏/新增/编辑/停用 API
 ├─ views/ParkingView.vue          # 全部按原型重写
 ├─ views/admin/DataManagementView.vue
 │                                 # /admin/data 入口，Tabs：省市行政区 / 商场管理 / 停车场管理
 ├─ components/parking/
 │  ├─ ParkingMetrics.vue          # KPI 卡片
 │  ├─ ParkingToolbar.vue          # 搜索/重置/只看收藏/新增
 │  ├─ ParkingFilters.vue          # 省市县/商场级联筛选
 │  ├─ ParkingTable.vue            # 常用停车场表格
 │  ├─ ParkingMapPanel.vue         # 左侧卡片列表 + 右侧 AMap
 │  ├─ ParkingDetailDrawer.vue     # 详情抽屉（收藏、编辑、停用、删除）
 │  └─ ParkingFormDrawer.vue       # 新增/编辑表单（级联、商场+新增、选点、单价）
 └─ views/admin/RegionManagementView.vue
 └─ views/admin/MallManagementView.vue
 └─ views/admin/ParkingLocationAdminView.vue
```

### 6.2 页面结构（对应已定稿原型）

1. 页头：标题“停车收费” + 说明 + “添加停车场”（有 view 权限即显示）。
2. KPI 条：收录停车场、覆盖省级、免费停车、收藏停车场（驱动为真实查询结果）。
3. 工具栏：搜索框 + 重置；右上角“只看收藏”切换（原型有 `favorite` 逻辑但没有 visible 控件，本次补上并保持视觉一致）。
4. 筛选条：省 / 市 / 区 / 商场，级联；次数统计。
5. 常用停车场表格：位置缩略图、名称、区域、地址、免费/计费、日间、夜间、操作（详情/编辑/删除，操作按 admin 显示）。
6. 地图总览：左卡片列表 + 右高德地图。
7. 详情抽屉：图片、价格、免费时长、计费周期、备注、收藏按钮、管理员编辑/停用/删除。
8. 表单抽屉：省市县级联、商场下拉 + “+ 新增”、地址、地图选点、免费/计费单位（元/小时、元/分钟、元/次、元/天）、图片上传、备注。

### 6.3 地图交互（真实高德）

- 动态加载 `https://webapi.amap.com/maps?v=2.0&key=VITE_AMAP_JS_KEY&plugin=AMap.Geolocation,AMap.PlaceSearch`。
- 无坐标记录：按当前筛选区域中心或全国视野显示空状态 + 引导新增。
- 有坐标记录：全部 marker，选中 marker → 高亮表格行/卡片，反向点击行/卡片 → 地图 `setCenter` + 信息窗。
- 地图搜索：`AMap.PlaceSearch`；定位：`AMap.Geolocation`（失败提示手动选点）。
- 选点：点击地图取纬经度，回填表单 `location` 与地址。
- 缩放/缩放按钮、图例保持原型布局；移动端地图与列表上下堆叠，保证不压文本。
- 高德域名白名单：本地 `localhost:5173`/`127.0.0.1` 与线上 `*.netlify.app`（当前域名）都要在高德后台配置；实施时校验。

### 6.4 权限在前端的呈现

- 菜单级：`tools` 表已控制停车入口；`/admin/data` 走 `requiresAdmin` 守卫。
- 页面按钮级：
  - 有 `view`：可看列表/地图/详情、收藏、查看图片。
  - 普通用户：可新增（含新增商场、上传图片，均经 RPC/Storage），不能编辑/删除/停用他人记录。
  - admin：编辑、删除、停用、数据管理全部可用（本地直连或 RPC）。
- 前端隐藏只做体验；最终防护在 RLS（表级 + 行级）。

### 6.5 状态与空状态

- 无数据：KPI 为 0，表格与地图显示“还没有停车场，点击添加第一个停车场”（仅普通用户有权限时显示添加 CTA）。
- 无搜索结果：显示“没有符合条件的停车场” + 清除筛选。
- 地图无坐标记录：显示地图空状态，而不是空白画布。
- 表单必填校验：name/省/市/区（或地图坐标至少一个）、价格单位合法性。

---

## 7. 管理面板「数据管理」

### 7.1 路由与菜单

- 新增：
- `/admin/data` → `DataManagementView.vue`（三个 Tab：省市行政区 / 商场管理 / 停车场管理）
  - `/admin/data/regions` → 省市行政区管理
  - `/admin/data/malls` → 商场管理
  - `/admin/data/parking-locations` → 停车场管理
- `AppShell.vue` 的 `adminNav` 增加 `数据管理`，图标可用 `Layers` 或 `Database`（与原型一致，保持现有风格）。
- 纯前端路由守卫：`meta.requiresAdmin`。

### 7.2 省市行政区管理

- 列表 + 搜索（名称/代码）+ 按省/市筛选。
- 支持：查看全国数据、停用/启用单个行政区（`active`）。
- 一次性导入由 migration 完成；管理页并发量不大，不提供批量上传（预留扩展点）。
- 行政区一般不可编辑名称/代码；如确有错误，走 migrations 修正（避免运行时篡改影响级联）。

### 7.3 停车场管理（admin）

- 独立管理视图（不复用停车页表格，避免不必要的联动逻辑）：字段含停车名称、区域、地址、价格、状态、创建人、创建时间。
- 可编辑、停用/启用、删除；admin 可查看已停用记录。
- 删除为物理删除？建议逻辑停用为主（避免删掉收藏外键、图片关联）；确实需要物理删除时二次确认，并级联删除收藏。
- 普通用户看不到此管理入口；admin 的编辑/删除操作与停车页按钮一致。

### 7.4 商场管理（admin）

- 与停车场管理同一组，允许 admin 增删改商场字典、停用/启用。
- 停用后新增下拉不出现，已有停车场的商场文本保留。

---

## 8. 密钥与环境文件

| 变量 | 级别 | 存放 | 备注 |
|---|---|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | A | 已在 `frontend/.env` | 不变 |
| `VITE_AMAP_JS_KEY` | B | `.env.secrets`（留痕）+ `frontend/.env` | 浏览器 SDK，F12 可见，靠高德域名白名单限控 |
| `AMAP_WEB_KEY` | C | `.env.secrets` + Edge Function env | 服务端地理编码，绝不进前端构建产物 |

实施动作：

1. 从旧库/已核验记录取真实 Key，写入 `.env.secrets` 对应位置。
2. 执行 `grep '^VITE_' .env.secrets > frontend/.env`（会同时带入 Supabase 公开变量）。
3. 若启用 `amap_geocode` Edge Function：`supabase secrets set AMAP_WEB_KEY=...`（或 `--env-file .env.secrets --project-ref ...`）。
4. 高德控制台配置 JS Key 安全域名：`localhost:5173`、`127.0.0.1:5173`、`*.netlify.app` 等。
5. 提交 `.env.secrets` 时注意：它本身是 git 跟踪、留痕文件；生产构建由 Vite 只内联 `VITE_` 变量，AMap Web Key 不会进入前端。
6. 不在任何前端代码中硬编码 Key。

---

## 9. 实施顺序（分阶段，可独立验收）

### Phase A — 数据层

1. `supabase/migrations/20261104010000_parking_v2_schema.sql`：新表 + RLS + 索引 + trigger。
2. `supabase/seed/regions/regions.sql` 与 `supabase/migrations/20261104020000_seed_regions.sql`：全国省市县导入。
3. Storage 策略调整（普通用户上传、owner 元数据、私有对象读取）。
4. 如采用 RPC/Edge Function：`toggle_parking_favorite`、`amap_geocode`。
5. 通过 `scripts/supa-sql.sh` 执行并校验表结构、行数、RLS。

验收：

- `regions` 约 3000+ 行，省市县完整、不含港澳台、无重复 district_code。
- 普通测试用户经 `create_parking_location` RPC 新增成功；直接 INSERT `parking_locations` / `parking_malls` 被拒。
- admin update/delete 成功；普通用户 update/delete 被拒。

### Phase B — 前端数据层

1. `lib/amap.ts`：SDK 加载器（单例、重试、挂载安全）。
2. `composables/useParking.ts`：查询/筛选/收藏/新增（走 `create_parking_location` RPC）/管理 action。
3. `useRegions.ts` / `useMalls.ts`：级联与下拉。
4. 类型定义：`ParkingLocation`、`RegionRow`、`ParkingMall`。

验收：

- `npm run build` 通过；未引地图组件时无内存泄漏。
- 各 composable 在 mock 网络或真实 Supabase 可返回正确结构。

### Phase C — 停车页 V2（主页面）

1. 按原型骨架重写 `ParkingView.vue`，先接真实数据 + 空状态。
2. KPI / 搜索 / 筛选 / 表格 / 列表 / 地图 / 详情 / 表单全部落地。
3. 收藏与“只看收藏”。
4. 真实 AMap 交互（marker、选中联动、搜索、定位、选点回填）。
5. 移动端适配。

验收：

- admin 与普通用户都能看页面；各自按钮集正确。
- 新增/编辑/停用/删除/收藏在测试环境真实走通。
- 地图加载成功、marker 与列表双向联动、空状态正确。

### Phase D — 数据管理面板

1. `/admin/data` 路由与菜单。
2. `RegionManagementView`：搜索/筛选/停用启用。
3. `MallManagementView`：商场字典增删改/停用启用。
4. `ParkingLocationAdminView`：列表/编辑/停用/删除。

验收：

- admin 可访问 `/admin/data`，普通用户跳转被守卫拦截。
- 行政区停用后新增下拉不再出现；停车场停用后主列表不再显示。
- 商场管理可增删改、停用/启用；停用后新增下拉不出现、已有停车场文本保留。
- admin 管理页能看到已停用记录并恢复。

### Phase E — 密钥、构建、联调

1. 写入 AMap Key 到 `.env.secrets` / `frontend/.env` / Edge Function env。
2. `npm run build` + `scripts/serve-dist.mjs` 本地生产包验证。
3. ego-browser（TaskSpace `cloud-saas-toolkit-parking-v2-final`）用 admin/普通用户/访客三身份全流程回归。
4. 高德域名白名单核对；验证线上 `*.netlify.app` 域名地图可加载。
5. 补文档：PRD §6.8、auth-permission-design、dashboard-layout-spec 中停车相关章节同步。

### Phase F — 收尾

1. 更新 `docs/ISSUES-20261022.md` 或新开 `docs/issues-parking-v2.md` 记录验证记录。
2. `git add` 全部变更，commit `feature/2610`，push GitHub + Gitee。
3. 后续按既定分支策略 `feature/2610 → dev → int → stg → prod` 合并（当前阶段只推 feature，不做 merge）。

---

## 10. 验证清单（ego-browser + 本地服务 + Supabase）

### 10.1 角色矩阵

| 动作 | admin（含已停用数据） | 普通用户(view) | 普通用户(edit) | 待审批 / 未授权 |
|---|---|---|---|---|
| 看到停车菜单 | ✔ | ✔ | ✔ | ✘ |
| 查看列表/地图/详情 | ✔（可含 inactive） | ✔ | ✔ | ✘（RLS 拒读） |
| 新增停车场/商场（经 RPC） | ✔ | ✔ | ✔ | ✘ |
| 收藏/只看收藏 | ✔ | ✔ | ✔ | ✘ |
| 编辑/删除/停用 | ✔ | ✘ | ✘ | ✘ |
| 数据管理（含停用恢复） | ✔ | ✘ | ✘ | ✘ |

### 10.2 功能清单

- [x] 搜索框按商场/地址/备注命中
- [x] 省市县级联 + 重置
- [x] 商场下拉 + “+ 新增”后回填
- [x] 只看收藏过滤正确
- [x] 表格行选中与详情抽屉联动
- [x] 地图 marker 与列表/表格双向高亮
- [x] 地图搜索/缩放/定位/选点
- [x] 新增保存后列表和地图即时出现
- [x] 编辑更新后行/卡片/marker 同步
- [x] 停用后主列表消失、可在地图总览外恢复
- [x] admin 管理页能看到已停用记录并恢复
- [x] 删除（admin，二次确认）后收藏级联清理
- [x] 图片上传成功、私有 bucket 图片按 RLS/签名 URL 可读、无公开 URL 泄漏
- [x] 普通用户只能经 RPC 新增，直接 INSERT parking_locations / parking_malls 被 RLS 拒绝
- [x] 无数据/无结果/无坐标空状态
- [x] 移动端（<900px）布局不重叠、地图可用

回归证据（2026-11-13，以构建产物 `serve-dist` + ego 实测，QA 数据统一 `QA_` 前缀、验后已全删）：

- 搜索/筛选/收藏/重置：`QA_` 五条样本命中备注（含新能源车位）、地址（申长路）、商场（望京SOHO）。
- 编辑同步：详情抽屉 → 编辑 → 日间价 10→18，卡片即时显示 18。
- 停用：主列表消失且 marker 由 5 减为 4；恢复入口在「管理台 / 停车场管理」的启用按钮。
- marker 双向：点行 → 列表与卡片同步高亮且地图视野位移；点 marker → 打开对应详情抽屉并回亮该行。
- 删除级联：`user_parking_favorites.parking_location_id` 为 `ON DELETE CASCADE`，删记录后收藏行归零。
- 图片：表单 `选择图片` → 本地预览 → 保存 → `images` 存对象路径（非签名 URL）；
  私有桶 public 端点返回 400；详情页 `<img>` 走签名 URL 且 `naturalWidth>0`。
- 移动端 390px：五个区块无重叠、无横向溢出、地图 356×520 且 4 个 marker 正常渲染。

> **本轮修出的真实缺陷**：`ParkingView` 的主列表此前只靠 RLS 过滤 `status`，
> 而 admin 的 SELECT 策略可见全部行，导致已停用记录仍然出现在 admin 的主列表与地图上，
> 与本节「停用后主列表消失」及 §5「select 默认只返回 active」矛盾。
> 已在 `filtered` 计算属性内加 `if (loc.status !== 'active') return false` 对齐口径，
> 恢复入口保持在 admin 数据管理页（那里可按状态筛选）。

### 10.3 安全清单

- [x] 普通用户经 `create_parking_location` RPC 新增成功；直接 INSERT 被 RLS 拒绝
- [x] 待审批用户读不到数据
- [x] 收藏不泄漏不可见停车场
- [x] `AMAP_WEB_KEY` 不在前端 bundle 中（`rg` 构建产物为空）
- [x] 旧百度 Key（`parking.html`、`js/parking-mgt.js` 硬编码）不再出现在新代码提交中
- [x] `frontend/.env` 不提交 Git；`.env.secrets` 留痕
- [ ] 高德 JS Key 域名白名单生效

> 去重说明：10.2 的「普通用户只能经 RPC 新增，直接 INSERT 被 RLS 拒绝」与本节第一条同义，
> 实测证据统一记在这里，10.2 只保留功能视角。

安全实测证据（2026-11-13，真实 Supabase 会话，非 DEV 离线种子）：

- 访客直连 INSERT `parking_locations` / `parking_malls` → 403 `42501`（RLS 拒绝）。
- 家庭成员（已恢复 parking/edit 授权）直连 UPDATE / DELETE → 生效 **0 行**，数据未被改动；
  同账号经 RPC 新增成功 —— 印证「普通用户新增走 RPC、编辑/删除/停用仍是 admin 专属」的既定口径。
- 待审批用户（把 tester 临时置 `pending` 实测，测后已还原 `approved`）：
  `parking_locations` 读为空、收藏读为空、写收藏 403、`tools` 读为空 —— 四项同时失效，
  与 `has_tool_permission` 要求 `status='approved'` 且 `must_change_password=false` 一致。
- 访客收藏表读为 `[]`，且按不可见记录 id 直查 `parking_locations` 亦为 `[]`，收藏不构成旁路。
- `rg 'AMAP_WEB_KEY' frontend/dist` 零命中；`rg 'jsapi.baidu|api.map.baidu|BMap' frontend/` 零命中。

> **待用户配合项**：「高德 JS Key 域名白名单生效」属账号侧 console 配置，代码里查不到，
> agent 无法闭环。目前 `net::ERR_CONNECTION_REFUSED` 之类的加载失败会被
> `.map-fallback` 兜住，地图不可用时其余列表功能不受影响。
---

## 11. 待确认/假设

以下为实施前的小决策；若不确定，按括号内的推荐值执行，不阻塞主流程：

1. 新表命名为 `parking_locations`，旧 `parking_info` 保留不迁移（推荐，沿用旧表更省事但会污染语义）。
2. “停车场名称”与“商场”两列都保留；`name` 是主展示名（推荐）。
3. 收藏关系走独立 `user_parking_favorites` 表（推荐，个人收藏与共享数据解耦）。
4. `parking_malls` 是否需要独立建表：需要，表单“+新增商场”会写入它（推荐）。
5. 行政区 active 停用后，历史旧记录的行政区文本保留展示（推荐，不影响历史数据）。
6. 图片插入权限放宽到普通用户，删除权限仅 admin（推荐；若需要可再放开上传者本人删除）。
7. Dashboard 停车记录 KPI 切到 `parking_locations`，旧表不再参与统计。
8. AMap 选点失败时允许手动填经纬度（推荐，作为降级输入）。

---

## 12. 交付物

- DB：新表、RLS、索引、种子数据、Storage 策略、RPC/Edge Function（如需）。
- 前端：停车页 V2、数据管理面板、AMap 加载器、composable、类型。
- 密钥：`.env.secrets` / `frontend/.env` / Supabase Edge Function env。
- 文档：实施后更新 PRD、权限设计、Dashboard 布局说明及本计划完成状态。
- 版本：`feature/2610` 提交并推 GitHub + Gitee；不建 merge。
- 部署：由 Netlify 从 GitHub 自动构建；本地先完成回归再推进。

# Cloud SaaS Toolkit 账号与权限设计

> 状态：待实施（DDL 与种子数据在方案确认后单独产出）
> 目标：把原来纯页面工具升级为有账号、角色、菜单和操作级权限的统一工作台。

## 1. 目标与边界

### 1.1 目标

- 用户通过「用户名 + 密码」登录，而不是真实邮箱。
- 菜单按角色权限动态生成，无权限的工具不展示。
- 有写操作的工具区分「查看 / 编辑」，只读工具只有「可见 / 不可见」。
- 私有工具数据按用户隔离，共享工具数据对所有已授权该工具的用户可见。
- admin 可管理用户、角色、工具权限，并有审计留痕。

### 1.2 明确不做（本期）

- 不接入真实邮箱、短信验证码、第三方 OAuth。
- 不支持自助「忘记密码」邮箱找回；密码修改只有两条路径：管理员重置、本人用旧密码自助修改。
- 不做按单条记录的行级细粒度权限（例如「只能删自己创建的停车记录」），操作级只到 `view/edit` 两档。
- 不做多租户。系统内所有用户属于同一个组织。

## 2. 账号模型

底层使用 Supabase Auth 的 email/password，但用户界面只暴露「用户名 + 密码」。

### 2.1 用户名到邮箱的映射

- 用户注册/登录只输入 `username`。
- 系统把用户名映射为虚拟邮箱：

  ```text
  {username}@toolkit.internal
  ```

- 虚拟域 `toolkit.internal` 不对外收发邮件，只用于复用 Supabase Auth 的唯一性和密码校验能力。
- `easyyhu@gmail.com` 不参与任何应用逻辑。

### 2.2 用户名规范

- 允许字符：`a-z`、`0-9`、`_`、`-`。
- 长度：3 到 32。
- 统一转小写，前后去空白。
- 保留字：`root`、`system`、`owner`、`test`。（`admin` 允许作为系统初始种子用户占位，但由 `check_username` Edge Function 对普通注册返回 `reserved`；DB CHECK `NOT IN ('root','system','owner','test')` —— `admin` 不在 CHECK 硬编码中，由应用层 + DB 种子流程独占用）
- 禁止用户名以 `-` 或 `_` 开头结尾。

这样保证映射出的邮箱 local part 合法，且同名用户不会因大小写产生歧义。

### 2.3 密码策略

- 最短 8 位，至少包含字母和数字。
- 注册/重置时二次确认。
- 临时密码（admin 创建、管理员重置）必须标记 `must_change_password = true`，首次登录强制改密。
- 自助修改密码必须校验旧密码。

## 3. 用户状态与生命周期

状态：

| 状态 | 含义 | 能否登录应用 |
|------|------|-------------|
| `pending` | 已注册，待审批 | 否，登录后看到「等待审批」 |
| `approved` | 已批准 | 是 |
| `rejected` | 已拒绝 | 否，登录后看到拒绝原因，可重新申请 |
| `deleted` | 已注销（软删除） | 否，登录后看到「账号已注销」 |

### 3.1 创建来源

- admin 直接创建：状态直接为 `approved`，分配角色，生成临时密码。
- 用户自助注册：状态为 `pending`，等待审批。

### 3.2 注册流程

1. 用户输入用户名、密码、确认密码。
2. 前端先做字符集、长度、强度、两次一致校验。
3. 调用 Supabase `signUp` 创建 auth 用户。
4. 数据库 `on_auth_user_created` trigger 自动在 `profiles` 写入 `pending` 状态（应用层不手工插入 profiles）。
5. 登录页回到「等待审批」提示。

Trigger 协作模式：

- `on_auth_user_created` trigger 执行 `INSERT INTO profiles (id, username, status) VALUES (NEW.id, split_part(NEW.email, '@', 1), 'pending') ON CONFLICT (id) DO NOTHING`。（Supabase `auth.users` 没有 `email_local_part` 列，用 `split_part` 从邮箱取 local part）
- `admin_create_user` Edge Function 先调用 `supabase.auth.admin.createUser({email, password})`（auth 用户创建触发上述 trigger），再显式 `UPSERT profiles SET status='approved' ...` 和 `INSERT INTO user_roles`。Trigger 的 `ON CONFLICT DO NOTHING` 保证不覆盖 Edge Function 的写入。

注意：自助注册会立刻创建一个真实 auth 用户，因此「重新申请」不能再次调用 `signUp`，必须走服务端更新状态的动作（见 3.4）。

### 3.3 登录流程与状态分支

1. 用户名归一化后映射为虚拟邮箱。
2. 调用 `signInWithPassword`。
3. 成功后读取 `profiles.status`：
   - `approved`：检查 `must_change_password`，需要则先强制改密；否则进入工作台。
   - `pending`：等待审批页。
   - `rejected`：展示拒绝原因，提供「重新申请」。
   - `deleted`：账号已注销页。
4. 登录失败统一返回「用户名或密码错误」，不区分用户名是否存在，避免枚举。

### 3.4 拒绝与重新申请

- 拒绝时记录 `reject_reason`，必须填写。
- 用户登录看到拒绝页后点击「重新申请」，服务端把状态改回 `pending`，并清空 `reject_reason`。
- 重复申请不会创建新的 auth 用户，只改状态。

### 3.5 删除与恢复

- 软删除：置 `deleted_at`，状态 `deleted`，保留记录。
- 删除同时吊销该用户的所有会话（服务端调用 admin 注销）。
- 软删除后用户名被保留，不能重新注册同名账号。
- admin 可以「恢复」用户（把 `deleted` 改回删除前的原始状态，原始状态不可追溯时回退到 `approved`）。不提供「彻底清除」auth 用户的操作，用户名永久保留以维持审计链路。

## 4. RBAC 权限模型

### 4.1 实体

- `roles`：角色。
- `role_permissions`：角色对工具的授权，含 `access_level`。
- `user_roles`：用户与角色的多对多绑定。

### 4.2 权限并集

- 一个用户可以绑定多个角色。
- 最终权限是所有角色权限的并集；同工具取较高等级（`edit` > `view`）。
- admin 角色绕过所有权限检查，始终拥有全部工具和 `edit`。

### 4.3 两个层级

#### 菜单级

- 决定工具是否出现在侧边栏/搜索/最近使用中。
- 由 `role_permissions` 中是否授权该工具决定。

#### 操作级

- `access_level`：
  - `view`：可查看数据、使用工具。
  - `edit`：可执行写操作（新增/修改/删除）。
- 只有 `tools.writable = true` 的工具才区分 `view/edit`。
- 只读工具（速查、纯前端计算类）授权只到 `view`，界面不出现「编辑」选项。
- DB 层约束：`role_permissions` 对 `tools.writable = false` 的工具写入 `edit` 时，由 `has_tool_permission()` 强制返回 `false`（或 `role_permissions` 加 CHECK 约束拒绝 `access_level='edit'` 与 `writable=false` 的组合）。前端勾选时也需禁用只读工具的 `edit` 选项，两端双重保证。

### 4.4 权限撤销的生效方式

- 服务端由 RLS 即时强制执行，任何数据读写都实时拦截，不依赖前端刷新。
- 前端菜单在下次导航或刷新后更新。
- 已打开的页面不强制踢出，但后续任何写操作会被 RLS 拒绝。

## 5. 数据隔离

### 5.1 全局约定

所有会落库的工具表，无论当前是 `shared` 还是 `private`，都强制包含：

```text
user_id UUID REFERENCES auth.users(id) NOT NULL
```

隔离程度只由 RLS 策略决定，不改表结构。这样未来在共享和私有之间切换时，只需修改策略，不需要迁移存量数据。

```text
private: USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'approved') AND user_id = auth.uid())
shared:  USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'approved') AND has_tool_permission(tool_id, 'view'))
         WITH CHECK (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'approved') AND has_tool_permission(tool_id, 'edit'))
```

`user_id` 同时承担审计职责，记录「这条数据是谁创建的」。

说明：`shared` 工具表不能使用 `USING (true)`，否则未审批、拒绝、注销用户或未授权该工具的用户都能读到数据。统一写为 `EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.status = 'approved')` 加 `has_tool_permission(tool_id, 'view')` 作为读取条件；写操作再叠加 `has_tool_permission(tool_id, 'edit')`。

### 5.2 data_scope 分类

每个工具仍标记 `data_scope` 表达默认隔离意图：

| data_scope | 说明 | 示例 |
|-----------|------|------|
| `shared` | 所有已授权用户看到同一份数据，`user_id` 仅作审计 | 家庭电影、停车收费 |
| `private` | 每个用户只能看到自己的行，`user_id = auth.uid()` | Todo |

### 5.3 private 工具表要求

- RLS 策略写 `user_id = auth.uid()`。
- `view` 角色只能 `SELECT`，`edit` 角色才可 `INSERT/UPDATE/DELETE`。

### 5.4 shared 工具表要求

- 允许所有已授权用户读取，写操作需要 `edit` 权限。
- RLS 通过安全函数判断当前用户对该工具的 `access_level`。

## 6. 表结构（概念级，DDL 后补）

### 6.1 profiles

- `id`：主键，等于 `auth.users.id`。
- `username`：唯一，小写。
- `display_name`：可选显示名。
- `status`：`pending | approved | rejected | deleted`。
- `prior_status`：删除前原始状态，restore 时回退至此（NULL 时默认 `approved`）。
- `reject_reason`：拒绝原因。
- `must_change_password`：临时密码标记。
- `password_changed_at`：最近改密时间。
- `last_registration_attempt`：上次注册尝试时间，用于限流。
- `created_at / updated_at / deleted_at`。
- `created_by / approved_by / approved_at / rejected_by / rejected_at`。

### 6.2 roles

- `id`、`name`（唯一）、`description`、`is_system`、`created_at`。
- 系统角色 `admin` 不可删除、不可改名、不可取消其全部权限。

### 6.3 role_permissions

- 联合主键 `(role_id, tool_id)`。
- `access_level`：`view | edit`。
- `created_at / updated_at`。

### 6.4 user_roles

- 联合主键 `(user_id, role_id)`。
- `granted_by`、`created_at`。

### 6.5 tools

- `id`、`name`、`category`、`route`、`icon`、`description`。
- `route` 格式：Vue Router path（不含前缀 `/`，如 `tools/parking`）；`icon` 格式：lucide-vue-next 图标名（如 `Car`、`Film`）。
- `data_scope`：`shared | private | none`。
- `writable`：是否区分 view/edit。
- `sort_order`、`status`（`active | hidden`）。

### 6.6 用户偏好（仪表盘）

- `user_favorites`：`(user_id, tool_id)`。
- `user_recent_tools`：`(user_id, tool_id, last_used_at)`。

### 6.7 audit_logs

- `id`、`actor_id`、`action`、`target_type`、`target_id`、`metadata(jsonb)`、`ip`、`created_at`。
- 记录：审批/拒绝/恢复/删除用户、创建/编辑角色、修改权限、重置密码等。
- `actor_id` 由 Edge Function 从调用方 JWT 的 `sub` 显式写入；`ip` 从 `x-forwarded-for` 首个可信值提取（该 header 可伪造，仅作参考审计字段，不作为安全控制）。
- 表启用 append-only 约束：RLS 拒绝客户端 INSERT；`UPDATE`/`DELETE` 对所有人（含 admin）拒绝，仅保留由 Edge Function 用 service role 写入。

### 6.8 业务数据表（概念级，DDL 后补）

所有业务表遵循 5.1 的 `user_id` 约定。Route 标准化为 `tools/{slug}`（如 `tools/parking`），前端实施时对齐。

#### 6.8.1 parking_info（shared）

停车收费记录，所有授权用户共享同一份数据，`user_id` 仅审计。

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id)
province text, city text, district text, mall text, address text
free_duration int               -- 免费时长（分钟）
charge_interval int             -- 计费周期
day_price numeric, night_price numeric
day_unit text, night_unit text -- 计费单位（元/小时 等）
notes text
location jsonb                  -- 高德地图返回的经纬度/地址结构化数据
images text[]                   -- parking-images storage 中的公开 URL 数组
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

关联 Storage：`parking-images` bucket——shared 工具图片：授权用户可读（`has_tool_permission('parking','view')`），edit 角色可上传/删除（`has_tool_permission('parking','edit')`）。RLS 策略与数据表隔离等级一致。

#### 6.8.2 movies_library（shared）

家庭电影库，所有授权用户共享同一份数据，`user_id` 仅审计。本期合并原 `movies`（TMDB 元数据）与 `user_movies`（用户评分/状态）为单表。

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id)
tmdb_id int                    -- TMDB 电影 ID
title text, original_title text
poster_path text, backdrop_path text
overview text, release_date text
genres text[]                  -- 类型标签
rating numeric                 -- 用户评分 (0-10)
watch_status text              -- 想看 / 已看 / 在看
notes text                     -- 个人备注
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

#### 6.8.3 tasks（private）

个人 Todo，每个用户只能看见自己的行。

```text
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
user_id UUID NOT NULL REFERENCES auth.users(id)
content text NOT NULL
status text NOT NULL DEFAULT '进行中'  -- 进行中 / 已完成
due_time timestamptz
completed_at timestamptz
created_at timestamptz DEFAULT now()
updated_at timestamptz DEFAULT now()
```

### 6.9 Storage RLS 原则

涉及 Supabase Storage 的工具（当前仅有停车收费的 `parking-images` bucket）遵循与数据表一致的 RLS 分层：`view` 角色只读 bucket 内容，`edit` 角色可写。Bucket 级别设置 `public=false`，所有访问通过 RLS 授权。

## 7. RLS 与安全函数

实施时需提供：

- `is_admin()`：当前用户是否绑定 admin 角色且 `profiles.status='approved'`。被逻辑删除的 admin（status='deleted'）即使残留 user_roles 也必须返回 false。
- `has_tool_permission(tool_id, required_level)`：
  - admin 直接返回 true。
  - 否则通过 `user_roles` 与 `role_permissions` 判断该工具的 `access_level`。
- `has_tool_permission()` 同样拒绝 `must_change_password=true` 的用户；被逻辑删除（status='deleted'）或未审批用户返回 false。
- `get_my_tool_permissions()`：返回当前用户的 `tool_id` + `access_level` 列表，供前端构建菜单（含 data_scope=none 的纯前端工具，仍需返回其 view 权限供路由守卫判断）。
- 上述函数使用 `SECURITY DEFINER SET search_path = public, pg_temp`，避免 RLS 递归和 search_path 劫持；函数标 `STABLE`。
- 所有业务表都启用 RLS，服务端权限是唯一可信边界，前端隐藏只做体验，不承担安全职责。
- Edge Function 鉴权：Edge Function 跑在 service role 上下文，`auth.uid()` 为 NULL，不能复用 RLS 版 `is_admin()`。必须显式从调用方 JWT 的 `sub` 提取 user_id，查 `user_roles + profiles.status` 判定 admin 身份。

### 7.1 RLS 策略矩阵（所有表）

| 表 | 匿名 | 普通用户 | admin | 写入口 |
|----|------|---------|-------|--------|
| `profiles` | 拒绝 | 只读自己的行；仅 `display_name` 可写 | 读全部；经 Edge Function 写 | trigger / Edge Function |
| `roles` | 拒绝 | 拒绝 | 读；经 Edge Function 写 | Edge Function |
| `role_permissions` | 拒绝 | 拒绝 | 读；经 Edge Function 写 | Edge Function |
| `user_roles` | 拒绝 | 拒绝 | 读；经 Edge Function 写 | Edge Function |
| `tools` | 拒绝 | 读 active 且授权可见的工具（`has_tool_permission(id,'view')`） | 读全部 | 种子 SQL |
| `user_favorites` | 拒绝 | 读写自己的行，且 `has_tool_permission(tool_id,'view')` | 读全部 | 客户端（RLS 校验 user_id） |
| `user_recent_tools` | 拒绝 | 读写自己的行，且 `has_tool_permission(tool_id,'view')` | 读全部 | 客户端（RLS 校验 user_id） |
| `audit_logs` | 拒绝 | 拒绝 | 只读，禁 INSERT/UPDATE/DELETE | Edge Function（service role） |
| 业务表（shared） | 拒绝 | `status='approved'` 且 `has_tool_permission(tool,'view')` 可读；`edit` 可写 | 全部 | 客户端（RLS 校验） |
| 业务表（private） | 拒绝 | `status='approved'` 且 `user_id=auth.uid()` | 全部 | 客户端（RLS 校验） |

## 8. 审计与安全补强

- 审批、拒绝、恢复、删除、改角色、改权限、重置密码都写 `audit_logs`。
- 自助注册限流：用户名维度 + 来源 IP 维度双限流。
- 保留字段 `last_registration_attempt` 支撑用户维度限流；IP 维度由 Supabase Auth 与边缘层共同兜底。
- 登录失败不泄露用户是否存在。
- 最后一个 active admin 不可删除、不可降级，避免系统锁死。
- 审批写操作使用 `WHERE status = 'pending'` 加受影响行数判断，避免两个 admin 并发重复审批。

## 9. 已确认（2026-10-19）

- 海南航空页面：删除，不纳入本次工程。
- 家庭电影：`shared` + 可编辑。
- 用户自助注册：长期开放。
- 彻底清除用户：逻辑删除 + 归档私有数据，不物理删除。

# Cloud SaaS Toolkit — 产品需求文档（PRD）

> 版本：v0.1（设计阶段定稿）
> 日期：2026-10-19
> 状态：待开发实施
> 作用：本文件是需求与产品决策的唯一事实来源，后续 DDL、页面、权限实现都以此为基准。

## 1. 背景与目标

### 1.1 背景

原项目是一组部署在 Netlify 的静态工具页面，没有账号体系，访问密码硬编码在前端文件里，工具之间视觉和交互不统一，也没有统一的数据存储策略。

### 1.2 目标

把静态工具页升级为一个统一的工作台：

- 用户用「用户名 + 密码」登录，不再使用硬编码密码。
- 菜单按角色权限动态生成，无权限的工具不展示。
- 有写操作的工具区分「查看 / 编辑」，只读工具只有「可见 / 不可见」。
- 私有工具数据按用户隔离，共享工具数据对所有已授权该工具的用户可见。
- 提供统一、有白天/暗夜两套主题的视觉风格。
- admin 可管理用户、角色、工具权限，并保留审计日志。

### 1.3 成功标准

- 任何用户从注册到登录到打开授权工具，全流程无硬编码密码。
- 权限变更在下一次导航或刷新后生效，写操作在数据库层即时拦截。
- 所有页面在桌面端和移动端可用，无文字溢出或控件重叠。

## 2. 范围

### 2.1 本期包含

- 账号注册、登录、审批、密码修改与重置。
- 用户、角色、菜单、操作级（view/edit）权限管理。
- 共享/私有两级数据隔离。
- 12 个工具统一迁移进工作台（清单见 5.6）。
- 统一 UI/UX（主题、侧边栏、首页、卡片）。
- 审计日志。

### 2.2 本期不包含

- 真实邮箱、短信验证码、第三方 OAuth。
- 自助「忘记密码」邮箱找回。
- 按单条记录的细粒度行级权限（例如「只能删自己创建的停车记录」）。
- 多租户。

## 3. 干系人与角色

| 角色 | 说明 |
|------|------|
| admin | 系统管理员，拥有全部工具和 edit 权限，负责用户审批、角色与权限管理 |
| 普通用户 | 绑定一个或多个角色，权限取并集 |
| 待审批用户 | 已自助注册但未审批，不能进入工作台 |

## 4. 技术选型

| 层 | 选型 |
|---|------|
| 前端 | Vue 3 + TypeScript + Vite |
| 样式 | Tailwind CSS 4 + lucide-vue-next 图标 |
| 路由/状态 | vue-router + Pinia |
| 后端 | Supabase Auth + Database + RLS |
| 部署 | Netlify（连接 GitHub 仓库） |
| 服务端能力 | Supabase Edge Functions（承载 service role 操作，密钥留在 Supabase 内部） |

## 5. 功能需求

### 5.1 账号与认证

#### 用户名

- 允许字符：`a-z`、`0-9`、`_`、`-`。
- 长度 3 到 32，统一转小写、去首尾空白。
- 保留字：`root`、`system`、`owner`、`test`。
- `admin` 作为系统初始种子用户名占用：普通自助注册由 `check_username` 返回 `reserved`，但不写入 DB `CHECK`（否则初始 admin 无法创建）。只有初始种子流程（Supabase Dashboard + service role SQL）可创建 `admin`。
- 禁止以 `-` 或 `_` 开头结尾。
- 系统把用户名映射为虚拟邮箱 `{username}@toolkit.internal`，仅复用 Supabase Auth 的唯一性和密码校验，不对外收发邮件。

#### 密码

- 最短 8 位，至少包含字母和数字。
- 复杂度校验分层：前端做 UX 校验；Supabase Auth 面板设置最短 8 位（平台层）；自助注册的「字母+数字」复杂度为软约束（Supabase Auth 原生只校验最小长度，无法由 Edge Function 拦截自助 `signUp`）；admin 创建的临时密码和 `user_change_password` 改密由 Edge Function 在服务端强校验字母+数字规则。
- 注册/重置时二次确认。
- 临时密码标记 `must_change_password = true`，首次登录强制改密。
- 用户自助修改密码必须校验旧密码。
- `must_change_password`、`password_changed_at` 两列禁止客户端直接写，只由 Edge Function 在真实改密后原子更新；`last_registration_attempt` 由注册 trigger `on_auth_user_created` 写入，客户端不得直接写。

#### 用户状态

| 状态 | 含义 | 登录工作台 |
|------|------|-----------|
| `pending` | 已注册待审批 | 否 |
| `approved` | 已批准 | 是 |
| `rejected` | 已拒绝，可重新申请 | 否 |
| `deleted` | 逻辑删除 | 否 |

#### 创建来源

- admin 直接创建：状态 `approved`，生成临时密码，强制首登改密。
- 用户自助注册：状态 `pending`，等待审批；**长期开放**。

#### Supabase Auth 配置要求

- 关闭邮箱确认（`Confirm email` = off）：注册后立即返回 session，由应用层用 `profiles.status` 拦截未审批用户。
- pending 状态下 session 合法有效——前端路由守卫展示等待审批页，同时所有数据表的 RLS 策略额外检查 `profiles.status = 'approved'`，拒绝未审批用户的读写操作。
- 开启新用户注册（`Allow new users to sign up` = on）：支撑长期自助注册。
- 关闭 Supabase 自动发送的邮件模板：本项目不依赖真实邮箱。
- 密码最短长度与密码策略一致（8 位）。


#### 登录态管理

- 使用 Supabase 默认的自动 refresh 机制：JWT 过期后 refresh token 自动续期。自动续期失败时，下次 API 调用返回 401，路由守卫捕获后跳转登录页并提示「登录已过期，请重新登录」。

### 5.2 注册 / 登录 / 审批

#### 注册

1. 用户输入用户名、密码、确认密码。
2. 前端校验字符集、长度、强度、两次一致。
3. 调用 `check_username` Edge Function 校验用户名可用性，返回结果码（`available` / `exists` / `deleted` / `reserved` / `invalid`），不直接查询 `profiles`。
4. 调用 Supabase `signUp` 创建 auth 用户。
5. 数据库 trigger 自动在 `profiles` 写入 `pending` 状态。
6. 页面进入「等待审批」。

注册防刷：

- 用户名维度：`profiles.last_registration_attempt`（由注册 trigger `on_auth_user_created` 写入时更新）记录上次注册时间，同用户名 60 秒内 `check_username` 拒绝（返回限流信号）；这是防误操作软措施，硬防线是 DB 用户名唯一约束 + Supabase Auth IP 限流。
- 来源 IP 维度：依赖 Supabase Auth 内置的 IP 级限流（具体限制参考 [Supabase Auth Rate Limits 官方文档](https://supabase.com/docs/guides/platform/rate-limits)），不额外自建。
- 限流在前端和后端各自独立生效：前端做用户名维度的快速拦截（避免无意义 API 调用），Supabase 负责最终防线。

注册防刷 DB 层补强：

- 保留字及格式校验在前端和 Edge Function（`check_username`）各执行一次，同时建一个 DB `CHECK` 约束 `username ~ '^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$'` 作为终极防线，防止绕过前端的直接 `signUp` 调用。
- 用户名 `NOT IN ('root','system','owner','test')` 通过 DB `CHECK` 约束兜底（`admin` 不在 DB CHECK 硬编码中，由 `check_username` Edge Function 对普通注册返回 `reserved`，种子流程走 service role 可创建）。

注册错误分支：

- 用户名已被使用（非删除状态）→「用户名已被使用」。
- 用户名已被逻辑删除 →「此账号已注销，无法重新注册，请联系管理员」。
- 触发限流 →「操作过于频繁，请稍后再试」。

#### 登录

1. 用户名归一化后映射为虚拟邮箱。
2. `signInWithPassword` 登录。
3. 成功读取 `profiles.status` 分支：
   - `approved`：检查 `must_change_password`，需要则先强制改密，否则进入工作台。
   - `pending`：等待审批页。
   - `rejected`：展示拒绝原因，提供「重新申请」。
   - `deleted`：账号已注销页。
4. 失败统一返回「用户名或密码错误」，不区分用户名是否存在。

#### 修改密码（已登录用户）

1. 用户在设置页输入旧密码、新密码、确认新密码。
2. 前端校验新密码强度、两次一致。
3. 调用 `user_change_password` Edge Function，在服务端校验旧密码、更新密码、清空 `must_change_password`、更新 `password_changed_at`；四项操作在同一个 Edge Function 调用内原子完成。客户端不调用 `reauthenticate` / `updateUser` 改密。
4. 改密成功后不吊销当前会话；临时密码首次改密后 `must_change_password` 被服务端清空，用户才能访问工具数据。
5. 强制首登改密与普通自助改密复用同一个 `user_change_password` 函数：强改密场景下 `old_password` 即临时密码，改密成功后 `must_change_password` 自动清空。

#### 审批

- 通过：记录 `approved_by / approved_at`，分配角色。`role_ids` 至少包含一个有效角色，否则 Edge Function 拒绝审批（已批准用户必须有至少一个角色）。
- 拒绝：必填 `reject_reason`，记录 `rejected_by / rejected_at`。
- 重新申请：用户通过 `user_reapply` Edge Function 把自身 `rejected` 改回 `pending`，清空 `reject_reason`。函数在服务端验证调用方 auth 身份，DB 层约束 `status` 只允许 `rejected → pending` 单向转换。
- 并发保护：审批更新带 `WHERE status = 'pending'` 并判断受影响行数。

#### 待审批提醒

- admin 登录后，侧边栏或首页显示待审批用户数量角标。
- 点击角标直接进入用户管理页，默认筛选 `pending` 状态。
- 无待审批用户时不显示角标。

### 5.3 用户管理

- admin 查看全部用户，按状态筛选。
- admin 直接创建用户、分配角色、生成临时密码。
- admin 重置用户密码，并吊销该用户全部会话。
- admin 删除用户：逻辑删除（`status='deleted'`，置 `deleted_at`，保存 `prior_status`），保留用户名占位；不删除 `user_roles` 绑定（恢复时保留原角色）；私有数据通过 RLS 屏蔽（该用户 `status='deleted'` 后，所有 `user_id` 对应的行在 RLS `USING` 中被排除），不建立单独的归档表或物理移动数据。
- admin 可恢复被删除用户。
- 最后一个 active admin 不可删除、不可降级。active admin 定义：`profiles.status = 'approved'` 且 `user_roles` 中绑定 `admin` 角色的用户。

### 5.4 角色与权限

#### 实体

- `roles`：角色。
- `role_permissions`：角色对工具的授权 + `access_level`。
- `user_roles`：用户与角色多对多。

#### 规则

- 一个用户可绑定多个角色，最终权限取并集，同工具取较高等级（`edit` > `view`）。
- admin 角色绕过所有检查，始终拥有全部工具和 `edit`；admin 无需在 `role_permissions` 中存储权限条目，`is_admin()` 短路判断即可，避免双份维护。
- 系统角色 `admin` 不可删除、不可改名；`role_permissions` 中不保存 admin 条目，因此「不可取消全部权限」由 `is_admin()` 的短路逻辑天然保证，不需要单独约束。
- 非系统角色删除：若仍有用户绑定，禁止直接删除，需先解除绑定（或改为解绑后删除并提示）。

#### 两级权限

1. **菜单级**：决定工具是否出现在侧边栏、搜索、最近使用中。
2. **操作级**：`view` 可读/可用，`edit` 可写。只有 `writable = true` 的工具才区分两档，只读工具只到 `view`。

#### 撤销生效

- 数据库 RLS 即时强制拦截写操作。
- 前端菜单在下次导航或刷新后更新。
- 已打开页面不强制踢出，后续写操作由 RLS 拒绝。

#### 前端获取当前用户有效权限

前端侧边栏、搜索、最近使用需要知道当前用户对每个工具的 `access_level`（view/edit/none）。提供 `get_my_tool_permissions()` SECURITY DEFINER SQL 函数（或等效的 `user_tool_permissions` 视图），返回当前用户的 `tool_id` + `access_level`。前端在应用初始化时调用此函数构建菜单；纯前端工具（data_scope=none）同样需要路由守卫校验菜单可见性。

`user_favorites` / `user_recent_tools` 的 RLS 策略需附加 `has_tool_permission(tool_id,'view')` 条件，防止用户收藏或记录无权限工具。

### 5.5 数据隔离

#### 全局约定

所有会落库的工具表，无论 shared 还是 private，都强制包含：

```text
user_id UUID REFERENCES auth.users(id) NOT NULL
```

隔离程度只由 RLS 决定，未来切换共享/私有只改策略，不迁移数据。`user_id` 同时承担审计职责。

| data_scope | 说明 | 工具 |
|-----------|------|------|
| `shared` | 所有已授权该工具的用户可见，`user_id` 仅审计 | 停车收费、家庭电影 |
| `private` | 只能看到自己的行 | Todo |
| 无 | 纯前端工具，无数据表，仅靠路由守卫控制访问 | Docker/SQL/Redis/Typora/Chrome 速查、Markdown 标题、图片拼接、字数统计、Pixabay |

### 5.6 工具清单

| # | 工具 | 分类 | 数据范围 | 可写 | 状态 |
|---|------|------|---------|------|------|
| 1 | SQL 速查 | 速查参考 | 无（纯前端） | 否 | ready |
| 2 | Redis 速查 | 速查参考 | 无（纯前端） | 否 | ready |
| 3 | Docker & K8S 速查 | 速查参考 | 无（纯前端） | 否 | ready |
| 4 | Typora 快捷键 | 速查参考 | 无（纯前端） | 否 | ready |
| 5 | 停车收费 | 数据应用 | shared | 是 | ready |
| 6 | Todo | 数据应用 | private | 是 | ready |
| 7 | 家庭电影 | 数据应用 | shared | 是 | ready |
| 8 | 图片拼接 | 图形工具 | 无（纯前端） | 否 | ready |
| 9 | Pixabay 下载 | 图形工具 | 无（纯前端） | 否 | ready |
| 10 | 字数统计 | 文本工具 | 无（纯前端） | 否 | ready |
| 11 | Chrome 扩展打包 | 文本工具 | 无（纯前端） | 否 | ready |
| 12 | Markdown 标题工具 | 文本工具 | 无（纯前端） | 否 | ready |

注：海南航空页面已删除，不纳入本期。

注（家庭电影 shared 语义）：原 Netlify 站点 `movie.html` 使用 `user_movies` 表按 `user_id` 隔离（每人独立的电影收藏/评分列表）。本次迁移后改为 shared（所有已授权用户共享同一份电影库）：原 `user_movies` 与 `movies` 表合并为统一的 `movies_library` 表，`user_id` 仅审计；所有授权用户对同一库有 view 或 edit 权限。

工具清单的元数据（名称、分类、data_scope、writable）存于 `tools` 表（种子数据），前端菜单与权限按 `tool_id` 关联；页面组件到 `tool_id` 的映射在代码中登记一次。

前端安全注意（Pixabay）：`pixabay_proxy` Edge Function 代理 Pixabay API，Key 为 §8.1 C 级机密，存放在 `.env.secrets`，不进入前端源码或构建产物。Edge Function 运行时从环境变量读取，前端仅调用 Edge Function，永远不接触 API Key。

前端安全注意（AMap）：高德地图分两级——AMap JS Key（§8.1 B 级，浏览器地图 SDK 必须加载，`VITE_` 前缀进 bundle，高德后台做域名白名单限控）；AMap Web 服务 Key（§8.1 C 级，服务端地理编码调用，走 Edge Function 代理，不进入前端）。两个 Key 均存于 `.env.secrets` 留痕。

前端安全注意（停车地图迁移）：旧 `parking.html` 与 `js/parking-mgt.js` 当前使用百度地图 Key（`BAIDU_MAP_AK`、`BAIDU_WEB_KEY`，同样硬编码在前端文件）。迁移时统一改为高德（AMap），删除百度 Key，不把百度 Key 带入新仓库。

前端安全注意（TMDB）：`tmdb_proxy` Edge Function 代理 TMDB API，Key 为 §8.1 C 级机密，存放在 `.env.secrets`，不进入前端源码或构建产物。Edge Function 运行时从环境变量读取，前端仅调用 Edge Function，永远不接触 API Key。

### 5.7 工作台与导航

- 四分类：速查参考、数据应用、图形工具、文本工具。
- 无权限工具的分类整个隐藏。
- 首页：搜索框 + 最近使用 + Bento 卡片网格。
- 收藏与最近使用按当前权限过滤，被撤权限的工具不再显示。
- 最近使用：用户进入工具页面时写入记录（去重，时间倒序）。
- 收藏：工具卡片提供收藏入口，写入 `user_favorites`。

### 5.8 审计

记录审批、拒绝、恢复、删除用户、创建/编辑角色、修改权限、重置密码等动作。
仅 admin 可查看审计日志；本期提供只读列表，不支持删除。

### 5.9 Edge Functions API 契约

以下函数运行在 Supabase Edge Functions 中，使用 service role key，不在前端直接调用 Supabase Admin API。

| 函数名 | 入参 | 出参 | 说明 |
|--------|------|------|------|
| `admin_create_user` | `{username, password, role_ids}` | `{user_id}` | admin 直接创建用户，写入 profiles + user_roles |
| `admin_reset_password` | `{user_id, new_password}` | `{success}` | 重置密码 + 吊销该用户全部会话 + 设置 `must_change_password=true` 强制下次登录改密 |
| `admin_delete_user` | `{user_id}` | `{success}` | 逻辑删除（status=deleted）+ 吊销会话 |
| `admin_restore_user` | `{user_id}` | `{success}` | 恢复已删除用户，恢复到删除前的原始状态（deleted → prior_status）。若原始状态不可追溯则默认回退到 `approved`；恢复后不清除审计信息 |
| `admin_approve_user` | `{user_id, role_ids}` | `{success}` | 审批通过，写入 user_roles |
| `admin_reject_user` | `{user_id, reason}` | `{success}` | 审批拒绝，写入 reject_reason |
| `user_reapply` | `{}` | `{success}` | 拒绝用户重新申请（rejected → pending），验证调用方 auth 身份后更新自己的 profile |
| `check_username` | `{username}` | `{result_code}` | 校验用户名可用性，返回 `available` / `exists` / `deleted` / `reserved` / `invalid`；Edge Function 入口检查 Authorization header：无有效 Supabase JWT 的才算匿名，已认证用户直接返回 `forbidden` |
| `admin_create_role` | `{name, description}` | `{role_id}` | admin 创建新角色 |
| `admin_update_role` | `{role_id, name?, description?}` | `{success}` | admin 修改角色名称/描述 |
| `admin_delete_role` | `{role_id}` | `{success}` | admin 删除非系统角色；仍有用户绑定时禁止删除 |
| `admin_set_role_permission` | `{role_id, tool_id, access_level}` | `{success}` | admin 设置角色对工具的操作权限（含移除：`access_level=null`） |
| `admin_assign_user_role` | `{user_id, role_ids}` | `{success}` | admin 为用户设置角色（全量替换，DELETE + INSERT 原子事务）；不保留旧角色，role_ids 为空数组时移除全部角色；单角色解绑同样通过本函数以「传入剩余 role_ids」实现；最后一个 active admin 的 admin 角色不可被移除 |

除 `user_reapply` 和 `check_username` 外，每个 Edge Function 在入口处验证调用方的 Supabase JWT，提取 `user_id`，显式查询 `user_roles` + `profiles.status` 判定 admin 身份后才执行操作，非 admin 调用返回 403。Edge Function 跑在 service role 上下文，`auth.uid()` 为 NULL，不能复用 RLS 版 `is_admin()`，必须手动查表鉴权（详见安全要求 §8）。`user_reapply` 校验 JWT `sub` 对应本人且 `status='rejected'`；`check_username` 只返回结果码（`forbidden` / `available` / `exists` / `deleted` / `reserved` / `invalid`），不返回其他用户数据。


所有函数返回统一错误格式 `{error: string}`，HTTP 状态码 4xx/5xx 对应业务错误/服务端错误。

补充函数（之前契约表缺失，现补全）：

| 函数名 | 入参 | 出参 | 说明 |
|--------|------|------|------|
| `user_change_password` | `{old_password, new_password}` | `{success}` | 已登录用户自助改密：Edge Function 先用 anon-key 客户端 `signInWithPassword` 校验旧密码，再用 service-role `auth.admin.updateUserById` 更新密码，随后清 `must_change_password`、更新 `password_changed_at`；`supabase.auth.admin` 没有「校验密码」方法，不能直接用于旧密码校验；客户端 `updateUser` 不用于此流程 |
| `pixabay_proxy` | `{query, page?, per_page?}` | `{results}` | 前端 → Edge Function → Pixabay API → 返回结果；Pixabay API Key 仅在 Edge Function 环境变量中，不进入浏览器 bundle |
| `tmdb_proxy` | `{query, type?, page?}` | `{results}` | 前端 → Edge Function → TMDB API → 返回结果；TMDB API Key（Bearer Token）仅在 Edge Function 环境变量中，不进入浏览器 bundle |

审计日志的 `actor_id` 必须在 Edge Function 内从调用方 JWT 的 `sub` 提取并显式写入，不能依赖 `auth.uid()` 在 service role 上下文的取值（service role 下 `auth.uid()` 为 NULL 或返回系统身份），否则审计会记录成 service role 而非真实操作者。


## 6. UI/UX 设计决策

以下均已通过交互原型确认：

- 主题：C 方向，支持白天/暗夜切换，暗夜为黑色调（非绿色）。
- 侧边栏头部：A。
- 抽屉内部样式：B。
- 侧边栏收起/展开：A2，可折叠抽屉式，图标 + 文字。
- 首页：搜索框 + 最近使用 + Bento 网格的完整 Dashboard。

原型位置：`~/.codex/visualizations/2026/10/16/01a14274-87c9-7733-9c04-c519306e9e29/`

## 7. 数据模型（概念级）

详细字段见 [auth-permission-design.md](./auth-permission-design.md)，核心表：

- `profiles`：用户扩展信息与状态。
- `roles` / `role_permissions` / `user_roles`：RBAC。
- `tools`：工具元数据与 `data_scope`、`writable`。
- `user_favorites` / `user_recent_tools`：用户偏好。
- `audit_logs`：审计。

业务数据表（停车、电影、Todo）遵循 5.5 的 `user_id` 约定。

## 8. 关键安全要求

- `profiles` 由 `on_auth_user_created` trigger 写入，客户端不得直接决定 `status`。
- `profiles` 表启用 RLS：普通用户只读自己的行；`status`、`reject_reason`、`must_change_password`、`password_changed_at`、`prior_status`、审批/拒绝相关列一律 DENY 客户端写，只能由 trigger 或 Edge Function（service role）更新。`display_name` 允许本人更新。
- `on_auth_user_created` trigger 默认只写 `status='pending'` 并执行 `ON CONFLICT (id) DO NOTHING`；`admin_create_user` 在 Edge Function 内先创建 auth 用户，再显式 UPSERT profiles（status='approved'）和 user_roles，trigger 与 Edge Function 之间不覆盖对方写入。
- admin 创建用户、重置密码、删除用户必须走服务端 service role，不能暴露在前端。
- 状态转换在数据库层用 RLS `WITH CHECK` 约束，不信任前端。
- RLS 策略同时检查 `profiles.status = 'approved'`，未审批、拒绝、注销用户一律拒绝读写。
- `must_change_password = true` 在服务端强制：`has_tool_permission()` 与业务表 RLS 除检查 `status='approved'` 外，同时拒绝 `must_change_password=true` 的数据读写；用户必须先完成改密（Edge Function 原子清标记）才能访问工具数据，不能只靠前端路由守卫。
- 登录失败不泄露用户是否存在。

### 8.1 密钥分级与管理

所有密钥统一收口到根目录 `.env.secrets`（**提交 Git 留痕**），按以下三级分发：

| 级别 | 密钥 | 存放 | VITE_ 前缀 | F12 可见 | 说明 |
|------|------|------|:---:|:---:|------|
| A - 前端公开 | `SUPABASE_URL`、`ANON_KEY` | `frontend/.env` | 是 | **是** | 项目地址与公开令牌本身即暴露于网络请求；靠 RLS 保护数据 |
| B - 浏览器 SDK | AMap JS Key | `frontend/.env` | 是 | **是** | 地图 SDK 必须浏览器加载；高德后台做域名白名单限控 |
| C - 服务端机密 | `SERVICE_ROLE_KEY`、Pixabay Key、TMDB Key、AMap Web Key | `.env.secrets` | **否** | **否** | Edge Function 运行时读取；不进入前端源码与构建产物 |

规则：

- `.env.secrets` 为本项目密钥唯一事实来源；Edge Function 环境变量（`supabase secrets set`）与 Netlify 环境变量均从此派生。
- 前端源码不引用任何 C 级密钥（不使用 `import.meta.env.SUPABASE_SERVICE_ROLE_KEY` 等），违者在 code review 阻断。
- Vite 构建仅内联 `VITE_` 前缀变量进 JS bundle，非 `VITE_` 变量对构建产物完全不可见。
- `initial_admin_password` 同样放入 `.env.secrets` 留痕（仅 bootstrap 使用，首次登录后需改密）。

各第三方密钥的具体发放路径见 §5.6 前端安全注意。

- `is_admin()` / `has_tool_permission()` 使用 `SECURITY DEFINER`，避免 RLS 递归。
- `is_admin()` 同时检查 `profiles.status='approved'`；被逻辑删除的 admin 即使残留 user_roles 也不得继续通过鉴权。Edge Function 使用 service role 客户端时，`auth.uid()` 为 NULL，必须显式从调用方 JWT 的 `sub` 提取 user_id，再查 `user_roles + profiles.status` 判定 admin，不能复用 RLS 版 `is_admin()` 在 service role 上下文的取值。

## 9. 实施阶段

0. **密钥文件初始化**：
   - 从本模板创建 `.env.secrets`（根目录），填入全部 A/B/C 三级密钥。
   - 将 `.env.secrets` 提交到 Git（已通过 `!.env.secrets` 例外规则排除 `.gitignore` 的拦截）。
   - 执行 `grep '^VITE_' .env.secrets > frontend/.env`，生成本地开发用的公开环境文件（`frontend/.env` 不提交 Git）。
   - Netlify 构建时由构建脚本或 Netlify 后台环境变量提供 `VITE_` 公开变量。
   - C 级密钥在部署 Supabase Edge Functions 前通过 `supabase secrets set --env-file .env.secrets` 注入。

1. Supabase 建表、RLS、种子数据、初始 admin。
   - 初始 admin（操作步骤）：
     1. Supabase Dashboard → Authentication → Add User → Email: `admin@toolkit.internal`，密码临时设置（满足 8 位字母+数字），`Confirm email` 不需要勾选。
     2. 通过 Supabase SQL Editor（service role）执行：
     ```sql
     INSERT INTO profiles (id, username, status, display_name, must_change_password)
     VALUES ('<auth_user_id>', 'admin', 'approved', '系统管理员', true)
     ON CONFLICT (id) DO UPDATE SET status='approved', must_change_password=true;

     INSERT INTO user_roles (user_id, role_id, granted_by)
     SELECT '<auth_user_id>', id, '<auth_user_id>' FROM roles WHERE name = 'admin';
     ```
     3. 首次登录强制改密（`must_change_password=true`）。
   - 种子 roles：管理员、测试员、家庭成员、访客。
   - 注：系统角色 `admin` 使用英文内部名 `admin`（保留 slug，用于 `is_admin()` 判定与 seed SQL `WHERE name = 'admin'`）；其余种子角色 `name` 直接使用中文名（如 `家庭成员`）。`roles` 表无独立 `display_name` 列，`name` 即为显示名，仅 `admin` 角色例外使用英文 slug。
   - 种子角色权限矩阵（本期默认值，实施时以此为准；admin 不写入 `role_permissions`）：

     | 角色 | 速查参考（只读） | 停车收费 | 图片拼接 | 字数统计 | Pixabay | 家庭电影 | Todo |
     |------|------|------|------|------|------|------|------|
     | 家庭成员 | view | edit | view | view | view | edit | edit |
     | 测试员 | view | edit | view | view | view | view | view |
     | 访客 | view | view | view | view | view | view | view |

     说明：所有只读工具（data_scope=none）只授权 `view`；只有 `writable=true` 的工具（停车、家庭电影、Todo）可以出现 `edit`。具体到实施时可在管理界面调整。
   - 种子 tools：12 个工具元数据。
   - Edge Functions 部署：函数代码存放于 `supabase/functions/`（每个函数一个子目录），通过 Supabase CLI 部署（`supabase functions deploy`）。本地开发使用 `supabase start`。部署前从 `.env.secrets` 取 `SUPABASE_SERVICE_ROLE_KEY`，通过 `supabase secrets set` 注入到 Edge Function 环境变量，不在前端源码中引用。`SUPABASE_SERVICE_ROLE_KEY` 为 §8.1 C 级机密，`.env.secrets` 已提交 git 留痕。
   - 存量数据迁移：停车收费、家庭电影空库启动，不导入旧 Netlify 站点数据（原数据为前端硬编码或 localStorage，无持久化后端）。各速查工具参考内容硬编码在前端组件。
   - 数据库命名规范：表名 `snake_case` 复数；列名 `snake_case`；主键 `id UUID DEFAULT gen_random_uuid()`；时间列 `TIMESTAMPTZ DEFAULT now()`；枚举值 `snake_case` 字符串；RLS 策略名 `{table}_{action}_{scope}`。

2. 前端账号/登录/审批/密码流程。
3. RBAC 管理与路由守卫。
4. 首页与侧边栏按锁定的 UI 重构。
5. 12 个工具逐个迁移。
6. 审计、收藏、最近使用收尾。

## 10. 验收标准

- [ ] 新用户自助注册 → 待审批 → admin 审批 → 登录进入工作台。
- [ ] admin 直接创建用户 → 临时密码首登强制改密。
- [ ] 拒绝用户看到原因并可重新申请。
- [ ] 角色权限勾选后，用户菜单实时对应变化。
- [ ] view 角色写操作在数据库层被拒。
- [ ] private 工具数据只对本人可见，shared 工具对所有已授权用户可见。
- [ ] 删除用户后其会话失效、数据逻辑归档（保留记录、RLS 屏蔽，不物理删除）。
- [ ] 白天/暗夜主题、可折叠侧边栏、搜索 + 最近使用 + Bento 首页全部可用。
- [ ] 桌面端与移动端无文字溢出、无控件重叠。

## 11. 决策记录

| 决策 | 结论 | 理由 |
|------|------|------|
| 工具元数据存储 | tools 表（DB 种子）+ 代码组件映射 | 权限按 tool_id 关联，新增工具只需种子 + 组件 |
| 服务端函数运行时 | Supabase Edge Functions | Service role 密钥留在 Supabase 内部，不跨平台 |
| 非系统角色删除 | 有绑定用户时禁止直接删除 | 防止权限真空 |
| 停车收费数据范围 | shared | 家庭共享，`user_id` 仅审计 |
| 家庭电影 | shared + 可编辑 | 家庭共享管理 |
| 海南航空 | 删除 | 不再需要 |
| 自助注册 | 长期开放 | 降低 admin 手工负担 |
| 用户清除 | 逻辑删除 + 归档 | 保留审计与数据 |
| 所有业务表带 user_id | 强制 | 共享/私有切换零迁移 |
| 部署平台 | Netlify | 公司网关可达，Cloudflare 受限 |

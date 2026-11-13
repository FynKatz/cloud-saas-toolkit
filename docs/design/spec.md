# Cloud SaaS Toolkit v2 — 系统规格书

> 版本：2.0.0-draft | 日期：2026-11-11 | 状态：等待实施

## 1. 概述

V2 是一次前端架构升级：引入 ClickUp+Remote 双层导航，重构 AppShell 为四组件模型，统一深浅色主题与语言偏好管理，而不改变现有工具页面的功能和权限模型。

- **上一版本**：v1.0.0（tag: `1.0.0`），单层侧栏 (220/56px)，AppShell 单文件 ~560 行。
- **目标**：L1 PrimaryRail (40px 黑条，固定)+ L2 ContextSidebar (232px 白/灰，可折叠到 0) + 内容区。

## 2. 架构总览

```text
┌──────────┬────────────┬────────────────────────┐
│ L1       │ L2         │ 内容区                  │
│ 40px     │ 232↔0px   │ flex:1                 │
│ #13151f  │ #ffffff    │ #f4f5f7                │
│          │            │                        │
│ [Logo]   │ 分组导航   │ Topbar (面包屑 + 汉堡按钮) │
│ [工作台] │ 概览       │ RouterView             │
│ [搜索]   │ 最近使用   │                        │
│ [通知]   │ 收藏       │                        │
│ [管理台] │ 工具分组…  │                        │
│          │ 管理面板   │                        │
│ [用户]   │            │                        │
│ [偏好]   │            │                        │
└──────────┴────────────┴────────────────────────┘
```

## 3. 组件树

```text
App.vue
 ├─ AppShellV2.vue         (--v2-* token 作用域容器，仅在 VITE_NAV_V2=1 时渲染)
 │    ├─ PrimaryRail.vue   (L1 — 40px, 全局上下文切换)
 │    │    └─ LabelPanel.vue  (标签浮层, 绝对定位在 PrimaryRail 右侧、叠加于 L2 之上; 不 Teleport)
 │    ├─ ContextSidebar.vue(L2 — 232↔0px, 当前上下文导航)
 │    │    ├─ NavGroup.vue (可折叠分组)
 │    │    └─ NavItem.vue  (单个导航项)
 │    ├─ Topbar.vue        (面包屑 + 汉堡按钮)
 │    ├─ NotificationBanner.vue (全局通知横幅，全宽；z-index --v2-z-notification-banner 90；消费 online/offline/全局 alert；Phase 4 实现)
 │    ├─ ErrorBoundary.vue (onErrorCaptured 封装，包裹 RouterView)
 │    ├─ DashboardBanner.vue    (由 AppShellV2 在 <main id="main-content"> 容器内、<RouterView> 之上、Topbar 之下统一渲染；随内容流，无独立 z-index；关闭交互由 AppShellV2 管理)
 │    └─ <RouterView>
 ├─ SearchPalette.vue      (Teleport to="body", 与 RouterView 平级, 全局搜索 overlay)
 ├─ Toast.vue              (Teleport to="body", 全局 toast 容器，z-index 80)
 ├─ Modal.vue              (Teleport to="body", 确认弹窗，z-index 60)
 ├─ Drawer.vue             (Teleport to="body", 侧边抽屉，z-index 55)
 ├─ Skeleton.vue           (共享组件，骨架屏，多个页面引用)
 ├─ AvatarPopover.vue      (L1 底部，由 PrimaryRail 内部渲染；popover 自身 Teleport to body；对齐 PrimaryRail 左侧)
 └─ EmptyState.vue         (共享组件，多个页面引用)
```

## 4. L1 (PrimaryRail) 入口清单

| # | 图标 | ID | 含义 | 权限 |
|---|------|----|------|------|
| 1 | Logo/首字母 | `workspace` | 工具工作台 | 所有已审批用户 |
| ☰ | 三条横线 | `label-toggle` | 展开/收起标签浮层 | 所有已审批用户 |
| 2 | 放大镜 | `search` | 全局搜索 (command palette) | 所有已审批用户 |
| 3 | 铃铛 | `notifications` | 通知中心 | 所有已审批用户 |
| 4 | 盾牌 | `admin` | 管理控制台（显示待审批用户数角标） | 仅 admin |
| B | 用户头像 | `user` | 账户菜单（退出/改密） | 所有已审批用户 |
| B | 齿轮 | `prefs` | 偏好（主题/语言） | 所有已审批用户 |

“B” 表示底部固定区，空余空间用 `flex:1` 弹性推底。

## 5. L2 (ContextSidebar) 渲染规则

| L1 active | L2 内容 |
|-----------|---------|
| `workspace` | 概览(/) + 最近使用 + 收藏 + 工具四分组(速查参考/数据应用/图形工具/文本工具) |
| `search` | L2 保持当前上下文内容不变，搜索 overlay 独立渲染（不改变 L1 激活状态）；搜索结果按角色过滤：管理操作入口仅 admin 用户可见 |
| `notifications` | 通知列表导航项 → `/notifications` |
| `admin` | 管理面板(数据管理/用户管理/通知管理/角色权限/审计日志) |

- 工具分组按 `tools.category` + `sort_order` 排序。
- 无权限的工具整分组隐藏。
## 5.1 权限模型（来自 PRD §5.4/5.5，auth-permission-design.md §4/5/7）

本系统采用 RBAC 多角色并集模型，以下四条为核心安全规则，不可降级：

1. **多角色并集**：一个用户可绑定多个角色，取 `bool_or` 并集；同一工具多角色授权时，取较高权限等级（edit > view）。
2. **view/edit 两级操作权限**：仅对 `writable=true` 的工具区分 view（只读）和 edit（编辑）；`writable=false` 的工具只有 view 一种有效权限。
3. **must_change_password 防御机制**（v2 废弃 PRD §5.1 强制改密条款）：`must_change_password` 列和 RLS 检查（`coalesce(must_change_password, false)=false`）作为防御性代码保留，但产品行为上所有 Edge Function（admin-create-user、admin-reset-password、user-change-password）均写入 `must_change_password=false`，正常路径下用户不会触发此阻断。（详见 migration `20261110000000_drop_must_change_password_flow.sql`）。PRD §5.1/§10 中"临时密码首登强制改密"的表述已被 v2 废弃
4. **私有/共享数据隔离**：私有工具（`data_scope=private`）数据按 `user_id` 隔离，RLS `USING` 严格匹配；共享工具（`data_scope=shared`）数据对所有已授权该工具的用户可见。

- 最近/收藏数据源不变：`useRecent` (localStorage) + 收藏 Supabase 表。
- `useRecent` 上限 8（`MAX_RECENT=8`），数据保留在 localStorage。
- L2 侧栏搜索框：即时 computed 过滤工作台工具列表，无 debounce。当前 12 工具规模下纯客户端过滤无性能压力；工具数超过 50 时考虑虚拟滚动或节流优化（后续迭代）。

## 6. Store 变更

| Store | 变更 | 来源 |
|-------|------|------|
| `toolsStore` | 不变 | 现有 |
| `authStore` | 不变 | 现有 |
| `preferencesStore` (新) | 管理 `sidebar-collapsed`、`l1ActiveContext`、`theme`、`locale` 偏好 | 收编 `useTheme` + localStorage 项 |

`useRecent`、`useNotifications`、`useFavorites` 保持 composable，不进入 Pinia。

### 6.1 preferencesStore 接口与初始化

```ts
interface PreferencesState {
  sidebarCollapsed: boolean  // 默认 false，持久化 localStorage 'v2.sidebar-collapsed'
  l1ActiveContext: 'workspace' | 'notifications' | 'admin'  // 注：search 不改变此值，保持当前上下文（§7.1）

  theme: 'light' | 'dark'    // 延迟初始化，见下
  locale: 'zh' | 'en'        // Phase 1 建 vue-i18n 壳层字典（zh/en），实际切换
}
```

- **初始化时序**：`theme` 保留现有 `useTheme` 的延迟初始化语义。`preferencesStore.init()` 由 `main.ts` 显式调用，不在 Pinia `state()` 工厂里直接读 `localStorage`，避免暗色偏好被 `watchEffect` 提前触发而 clobber。
- **双壳互斥**：`VITE_NAV_V2=1` 时 `preferencesStore` 全权管理 `theme`/`locale`，`main.ts` 跳过 `useTheme.init()` 调用；`VITE_NAV_V2=0`（旧壳）走原有 `useTheme` 路径。两条 init 路径互斥，不同时写 `theme` key，避免竞态覆盖。
- **持久化**：`sidebarCollapsed`、`l1ActiveContext`、`theme`、`locale` 全部存 `localStorage`。**首次读取一次性迁移**：`preferencesStore.init()` 时若旧 key 存在且新 key 不存在，将旧值复制到新 key 后删除旧 key；后续只读写新 key `v2.*`。
- **locale**：Phase 1 建 vue-i18n + zh/en 壳层字典。工具页内容翻译不在范围。

## 7. 路由

**本轮不改 URL 结构。** 保持现有路由路径 (`/parking`、`/todo`、`/admin/users` 等)。上下文分为三类：纯视图型（`search`）仅切换 L2 overlay 不触发路由变更；混合型（`workspace`）同路由下仅切换 L2，跨上下文时 `router.push(`/`)`；路由型（`admin`/`notifications`）点击 L1 图标 → `router.push` 到对应根路由。

- `/` (dashboard) → `workspace` 上下文
- `/admin/*` → 自动映射 `admin` 上下文
- `/change-password` → 不绑定 L1 上下文，独立全屏/模态
- `/notifications` → `notifications` 上下文

### 7.1 上下文与路由映射决策表

| 用户行为 | L1 context | L2 内容 | RouterView |
|---|---|---|---|
| 点击 workspace 图标 | `workspace` | 概览/最近/收藏/工具分组 | 当前路由不变（若有）；若非 workspace 路由则 `router.push(`/`)` |
| 点击 admin 图标 | `admin` | 管理面板 | 若当前不在 `/admin/*`，navigate 到 `/admin/data/regions`（避免二次 redirect） |
| 点击 notifications 图标 | `notifications` | 通知列表 | navigate 到 `/notifications` |
| URL 直接进入 `/admin/users` | 自动设为 `admin` | 管理面板 | 正常渲染 |
| URL 直接进入 `/parking` | 自动设为 `workspace` | 工具分组 | 正常渲染 |
| 点击 search 图标 | **保持当前上下文（不改变 L1 激活状态）** | L2 保持当前上下文内容不变 | RouterView 不变，搜索 overlay 独立渲染 |

- **检测方式**：`router.afterEach` 内 `watch(route.path)` 同步 `l1ActiveContext`，不阻塞导航。
- **workspace 切换**：若用户当前在非 workspace 路由（如 `/notifications`），点击 workspace 图标 → `router.push(`/`)` 回到 Dashboard。
- **search 切换**：L1 搜索图标触发 command palette overlay，不影响路由。
- **`/admin/data` 子路由**（regions/malls/parking-locations）：L2 管理面板展开"数据管理"子项，当前 active 子项高亮。

### 7.2 路由配置变更

- `AppShellV2` 负责渲染 L1/L2/Topbar 外壳，`RouterView` 放在 `AppShellV2` 内层 `main-content` 容器（`id="main-content"`）中，外层加 `onErrorCaptured` 的 error boundary。
- 现有 `router/index.ts` 的嵌套路由 children 结构保持不变，仅把顶层 shell 组件从旧 `AppShell.vue` 切换为 `AppShellV2.vue`（由 `VITE_NAV_V2` 条件决定）。
- `/change-password` 作为独立顶级路由（不在 `AppShellV2` 内），全屏渲染，不绑定 L1 上下文。
- 路由守卫不因 v2 变更逻辑，继续复用现有 `authStore` 与 `profiles.status` 检查。

## 8. 响应式断点

| 断点 | L1 | L2 |
|------|----|----|
| ≥769px | 40px 固定黑条 | 232px ↔ 0 推挤 |
| ≤768px | 底部 Tab Bar (48px, 管理员 5 项 / 普通用户 4 项) | overlay drawer 从左侧滑入 |

- **内容区 padding**：桌面 `24px 28px 48px`；移动端 `16px 16px 32px`。
- **移动端单独分阶段实施**（Phase 5），不与桌面 L1/L2 重构一起上线。

## 9. 键盘快捷键

| 快捷键 | 行为 |
|--------|------|
| `Ctrl+K` / `Cmd+K` | 打开搜索 command palette。`keydown` 处理需 `preventDefault()` 阻止浏览器默认行为（聚焦地址栏）；文本编辑区（textarea/input/contenteditable）内不拦截 Ctrl+K |
| `Ctrl+\` / `Cmd+\` | 切换 L2 收折 |
| `Esc` | AppShellV2 全局 Esc 总线：维护打开组件栈（LIFO），按栈顶分发。栈优先级：search palette → modal → drawer → label panel → avatar popover → prefs popover。Phase 5 在栈头插入 mobile drawer（高于 search palette） |

- `Cmd+B` 与文本工具的加粗快捷键冲突，故改用 `Cmd+\`。文本编辑区内捕获并阻止侧栏快捷键冒泡。
- `Esc` 由 AppShellV2 的单一 keydown handler 统一管理（LIFO 栈），各组件向栈注册/注销打开状态，不再各自监听

## 9.1 全局搜索索引

新建 `useSearchIndex` composable，聚合：
- `toolsStore.allowedTools`（工具名 + 分类）
- 静态路由配置（页面名）
- admin 操作入口（仅 admin）

输出扁平 `SearchItem[]` 供 `SearchPalette.vue` 消费。搜索防抖 200ms。v2 command palette 仅搜索元数据，不搜索工具内容（内容搜索为后续迭代）。
- **搜索历史格式**：`v2.search-history` 为 `Array<{ query: string, toolId?: string, timestamp: number }>`，toolId 可选（仅搜索结果条目携带），过滤时移除 toolId 不在 `toolsStore.allowedTools` 中的条目。
- **侧栏搜索**：仅在 workspace L2 渲染，独立 computed 即时过滤，不与全局搜索联动。
- **搜索历史清理**：每次打开 command palette 时，`v2.search-history`（localStorage）中的条目若对应工具已被撤销权限，自动过滤移除，避免点击后被路由守卫拦截的体验缝隙。

## 10. Feature Flag

环境变量 `VITE_NAV_V2=1` 控制使用旧壳还是新双壳。默认 `0`（旧壳），开发时可手动切换。

### 10.1 实施顺序

| 阶段 | 内容 | 前提 |
|---|---|---|
| Phase 0 | 建立 `VITE_NAV_V2` flag + `App.vue` 条件加载新旧壳 | Phase DB（migration 须在 Phase 0 代码部署前先行执行） |
| Phase 1 | 新建 `--v2-*` CSS token + `preferencesStore`（vue-i18n zh/en 壳层字典） | Phase 0 |
| Phase 2 | 拆分 `PrimaryRail.vue` + `ContextSidebar.vue` + `Topbar.vue`（桌面 ≥769px）+ 全局 Esc 总线（AppShellV2 单一 keydown handler，维护 LIFO 打开组件栈） | Phase 1 |
| Phase 3 | 新建 `SearchPalette.vue` + L1/L2 上下文切换 + 路由映射表 + 键盘快捷键 `Ctrl+K`（打开搜索）/`Ctrl+\`（切换 L2 收折） | Phase 2 |
| Phase 4 | 动效 + 可访问性打磨（参见 uiux §12，含 WCAG AA 对比度、aria 标注、role、skip link）+ 空状态 | Phase 3 |
| Phase 5 | 移动端（底部 Tab Bar + overlay drawer） | Phase 3-4 稳定后 |
| Phase DB | 以下迁移须在 Phase 0 代码部署前先行执行，按编号顺序： | Phase 0 之前先行执行 |
| | ① migration `20261112000000`：`system_notifications` 补 `target_user_id` 可空列 + RLS 状态检查（`profiles.status='approved'`）+ `user_notification_reads.self_update` 补 `WITH CHECK` + `REVOKE UPDATE (notification_id, user_id)` + `user_notification_reads.self_select` 补 `status='approved'` 过滤 | |
| | ② migration `20261112000100`：`audit_logs.created_at DESC` 索引 + `action, created_at DESC` 联合索引 + pg_cron `purge-audit-logs`（每日清理 90 天前）+ pg_cron `archive-expired-notifications`（每日归档过期通知） | |
| | ③ `ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles` + `ALTER TABLE public.profiles REPLICA IDENTITY FULL`（使 Realtime 订阅可触达 profiles 变更事件） | |
| | 前提：Supabase Dashboard 已手动开启 pg_cron 扩展；profiles 表在 `supabase_realtime` publication 中 | |

### 10.2 CSS Token 命名隔离

- v2 新 token 统一加 `--v2-` 前缀（`--v2-l1-bg`、`--v2-l2-bg`、`--v2-accent` 等）。通过 `--v2-*` 命名前缀隔离，旧页面（800+ 引用）不引用 v2 token；L1 token 通过 `html {}` 规则块常量定义，不随主题覆写。
- 旧 token（`--violet`、`--ink`、`--line`、`--page`、`--card`）保持不动，12 个工具页 + admin + auth 的 800+ 处引用不被洗色。
- 主题无关 L1 常量放在 `html { --v2-l1-*: ... }` 规则块，L1 恒暗不随主题变化。深色主题由 `preferencesStore` 在 `<html>` 上挂 `class="dark"`，仅 L2/内容区通过 `html.dark` 选择器切换到深色 token；L1 常量不参与覆写。
- 等全站迁移完成后再做归一化。

## 11. 构建与部署

- 构建：`grep '^VITE_' .env.secrets > frontend/.env && cd frontend && npm run build`
- 部署：`SUPA_PROXY=http://127.0.0.1:18899 node scripts/netlify-deploy.mjs --publish`
- 推送：双推 GitHub + Gitee，GitHub 走 `scripts/push-retry.sh`


## 12. 不在此范围

- 工具页内部 UI 翻新（停车 V2 已完成，其他页暂不重写）。例外：移动端工具页的最小适配（横向滚动 `overflow-x-auto`、筛选栏折叠为抽屉/下拉）在 v2 scope 内，但不包括功能逻辑修改和视觉翻新
- Widget 可自定义 Dashboard
- 工具页内容中英文翻译（壳层文案翻译在 scope 内）
- 数据库 schema 变更（停车 V2 数据表 `regions`/`malls`/`parking_locations`/`user_parking_favorites` 已在 Phase DB 前完成迁移，不在 v2 scope；本轮随 v2 仅补 Phase DB 所列 migration：通知 RLS + 审计索引/cron，属例外）
- 管理页面的细粒度 RBAC（v2 管理子页面统一由 admin 角色控制，不按子页面拆分 view/edit 权限；审计员/半管理员为已知限制，后续版本扩展）
- 管理控制台总览仪表盘（uiux §22.0 标注为已知限制，后续版本扩展）

## 13. 实施需补齐的前置决策

| # | 决策点 | 结论 |
|---|--------|------|
| 1 | 旧 AppShell 是否冻结 | 是。`VITE_NAV_V2=0` 路径下旧壳保持只读，新功能不 backport |
| 2 | ContextSidebar 收藏区数据源 | 直接复用 `useFavorites(userId)`，不重写 |
| 3 | 通知角标语义 | 角标 = 未读通知数。进入通知中心后当前视口内可见项标记已读，其余滚动/hover 逐条标记已读（不全局 markAllRead，避免一次性清零用户未逐条查看的通知）。Dashboard banner 关闭 = 同时 dismiss+已读该条；若此前未读，未读角标同步减一（详见 uiux §9 通知交互） |
| 4 | L1 标签浮层触发 | hover 触发（默认），300ms 延迟；首次登录桌面端默认展开一次并显示 onboarding tooltip |
| 5 | 通知管理页命名 | 全系统统一使用"通知管理"。页面 title、L2 分组项、user-manual 表格名、uiux 章节标题一致 |
| 6 | L1 顶部 Logo | 沿用紫色方块 "C" logo，不换 |
| 7 | 最后 active admin 保护 | 在 admin-delete-user（逻辑删除）、admin-restore-user、admin-assign-user-role、admin-delete-role、admin-update-role（若编辑 admin 角色掏空其权限）中增加计数器检查，拒绝使 active admin 数归零的操作。active admin 定义：status='approved' 且绑定 admin 角色的用户。DB 层 `count_active_admins()` 为辅助函数（service_role 调用），无 DELETE 触发器——last-admin 保护在 Edge Function 层强制执行；admin-update-role 掏空权限场景由 Edge Function 在写入前校验 |
| 8 | 停车场管理新建入口 | 数据管理 → 停车场管理新增"新建停车场"按钮 + `insert` 路径 |
| 9 | 通知管理完整功能 | 编辑表单暴露 `expires_at` 日期选择器，默认 30 天后，支持"永不过期"。通知管理支持：列表页筛选（草稿/已发布/已撤销/已过期/已归档），其中"已过期"对应即时查询 `status='published' AND expires_at < NOW()`（已归档由 pg_cron 写入 `status='archived'`，两者互斥：archived 的通知不再出现在"已过期"筛选中）、编辑通知内容/过期时间、撤销通知（状态 published→unpublished，已读用户记录保留，未读用户不再看到）、删除通知（软删除，将 status 置为 `archived` + 级联 dismiss 所有 `user_notification_reads`）、发布通知（draft→published）。通知类型枚举：maintenance / new_tool / announcement / alert（`system` 语义由 `announcement` 承载，审批通过等系统事件用 `announcement` 类型）。**定向投递**：`system_notifications` 新增可空 `target_user_id UUID REFERENCES auth.users(id)` 列，支持"仅对单个用户可见"的通知（如审批结果）；广播通知 `target_user_id IS NULL`。RLS 见决策 26 |
| 10 | 修改密码入口 | L1 用户头像 popover 增加"修改密码"按钮 → `/change-password` |
| 11 | 移动端触摸目标 | 移动端所有可点击项最小 44×44px；桌面 L1 图标可点击区域 40×40px（图标自然宽度），桌面不做 44px 硬性要求 |
| 12 | 侧栏滚动行为 | active 工具 `scrollIntoView({ block: 'nearest' })` |
| 13 | 语言切换 scope | 壳层文案翻译在 v2 scope 内（vue-i18n + zh/en 字典）；工具内容不在范围 |
| 14 | 移动端工具页最小适配 | 横向滚动 + 筛选折叠在 v2 scope 内；不改功能逻辑和 UI 翻新 |
| 15 | 注册拒绝反馈 | 被拒绝的注册者登录时提示"你的注册申请未被通过{：管理员填写的拒绝原因}。如有疑问请联系管理员"（有原因时附带原因，无原因时仅显示前半部分） |
| 16 | 管理员审批主动发现 | L1 盾牌图标显示待审批用户数角标。进入管理控制台后角标清零，离开管理控制台（无论进入 workspace / notifications / search / 工具页）后重新拉取 pending 计数并恢复角标。admin 停留在管理控制台内部时，有新用户注册通过 Supabase Realtime `postgres_changes` on `profiles.status='pending'` 实时更新角标 |
| 17 | 审计日志字段 | 每条记录包含 `actor_id`、`action`、`target_type`、`target_id`、`ip`、`metadata`(jsonb，含 before/after)、`created_at`，保留期 ≥90 天。写入：审计日志主写入路径为 Edge Function（service_role，绕过 RLS）；当前 DB 已有 `audit_logs_insert_admin` 策略允许 admin 客户端直插（`with check (public.is_admin() and actor_id = auth.uid())`），本方案保留该策略作为兼容路径，但产品约定优先走 Edge Function 以保证 IP/metadata 完整。SELECT：admin 角色通过 RLS 读取全部行。客户端无 UPDATE/DELETE 策略。IP 获取：Edge Function 从 `req.headers.get('x-forwarded-for')` **第一段**取（最左端为原始客户端 IP），不可用时降级 `req.ip`。清理机制：pg_cron 每日 DELETE `created_at < NOW() - INTERVAL '90 days'`，`created_at` 建索引（需随 v2 新增 migration） |
| 18 | 逻辑删除登录拦截 | `authStore` 初始化时检查 `profiles.status = 'deleted'`（非 `deleted_at IS NOT NULL`），匹配则显示"账号已注销"并阻止进入工作台。恢复用户时 `admin_restore_user` 将 `deleted_at` 置 NULL、`status` 改为 `prior_status`，避免恢复后仍被拦截 |
| 19 | 恢复已删除用户 | admin 可将 `deleted` 状态用户恢复为删除前的原始状态（`prior_status`），不可追溯时回退到 `approved`。Edge Function `admin_restore_user` 执行：`status := prior_status`、`deleted_at := NULL`、`prior_status := NULL`，写 audit_log。恢复后用户可直接登录（决策 18 检查 `status='deleted'`，已不再拦截） |
| 20 | vue-i18n 依赖 | Phase 1 在 `frontend/package.json` 新增 `vue-i18n` 依赖并安装；仅壳层字典（zh/en）在 scope 内 |
| 21 | 自助改密/管理员重置密码登出语义 | 用户自助修改密码成功后前端主动登出并跳转 `/login`（覆盖 PRD §5.2 旧表述）。管理员重置任意用户密码后，Edge Function **服务端吊销**该用户 JWT（调用 `supabase.auth.admin.signOut(userId)`）；前端同时保留 Supabase Realtime `postgres_changes` 订阅 `profiles.password_changed_at` 变更事件 + 401 fallback 作为多端/网络延迟兜底，弹出模态框"你的密码已被管理员重置"后登出跳转 `/login`。**前提迁移**：需 `ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles` + `ALTER TABLE public.profiles REPLICA IDENTITY FULL` |
| 22 | 管理页面 RBAC 粒度 | v2 管理子页面不纳入细粒度 RBAC，统一由 admin 角色（`is_admin`）控制访问。审计员/半管理员为已知限制，后续版本扩展 |
| 23 | 关键表 RLS 策略摘要 | `audit_logs`：SELECT admin 全部、INSERT admin 客户端直插（`audit_logs_insert_admin`，兼容路径）+ service_role 主路径、无 UPDATE/DELETE；`system_notifications`：SELECT 当前仅过滤 published/过期/发布时间，待决策 26 补 `profiles.status='approved'` 检查 + `target_user_id` 定向投递过滤 + admin 全量读、INSERT/UPDATE/DELETE admin 客户端直写（`admin_all` for all）；`user_notification_reads`：SELECT 本人 + admin 全部、INSERT 本人、UPDATE 本人（read/dismiss）。含自我不一致项见决策 26/29 |
| 24 | 审批通过通知 + 角色分配 | 管理员审批通过用户时，必须在审批抽屉内选择至少一个角色（角色多选器，未选至少一个时"审批通过"按钮 disabled）。Edge Function `admin_approve_user` 接收 `role_ids[]`，将 `status` 置为 `approved`、绑定所选角色，并自动向该用户发送一条定向通知（`target_user_id=auth.uid()` 目标用户、类型 `announcement`、铃铛角标+1），用户无需重新登录即可感知状态变更。角色收集与审批提交必须是同一原子操作，不得拆分为独立按钮 |
| 25 | reject_reason 落地与清空 | 管理员拒绝注册时填写的 `reject_reason` 写入 `profiles.reject_reason` 列；被拒绝用户点击"重新申请"时 Edge Function `user_reapply` 将 `status` 重置为 `pending` 并清空 `reject_reason`；登录错误提示展示拒绝原因文本 |
| 26 | `system_notifications.users_read_published` RLS 需补 status + `target_user_id` 检查（migration `20261112000000`） | 当前策略仅过滤 published/过期/发布时间，未限制审批状态，也没有定向投递能力。修复 SQL：用 `(select status from profiles where id = auth.uid()) = 'approved'` 替代内联 `exists` 子查询以避免 RLS 递归风险；或封装为 `SECURITY DEFINER` 辅助函数 `is_approved_user()`。同时新增 `target_user_id` 过滤：`(target_user_id IS NULL AND status='approved') OR target_user_id = auth.uid()`。一并修复 `user_notification_reads.self_select` 缺少的 `status='approved'` 过滤 |
| 27 | `audit_logs` 索引 + pg_cron 清理 migration（编号 `20261112000100`） | `created_at DESC` 索引不存在，审计日志分页/筛选全表扫描。新 migration 包含：`CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC)`、`CREATE INDEX idx_audit_logs_action_created ON audit_logs(action, created_at DESC)`。pg_cron 扩展需在 Supabase Dashboard 预先开启（Extensions → pg_cron），migration 中不写 `CREATE EXTENSION`（需 superuser），仅注释"确保 pg_cron 已在 Dashboard 启用"后添加 `SELECT cron.schedule('purge-audit-logs', '0 3 * * *', $$DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '90 days'$$)` |
| 28 | 通知过期 pg_cron 归档调度（并入 migration `20261112000100`） | 每日将 `published` 且 `expires_at < NOW()` 的通知标记为 `archived`（pg_cron SQL 调度，非 Edge Function）。扩展条件含 `status IN ('published','unpublished')` 以防 unpublished 过期通知永不归档。SQL：`SELECT cron.schedule('archive-expired-notifications', '0 4 * * *', $$UPDATE system_notifications SET status = 'archived' WHERE status IN ('published','unpublished') AND expires_at IS NOT NULL AND expires_at < NOW()$$)` |
| 29 | `user_notification_reads.self_update` 补 `WITH CHECK` + 列级撤销（migration `20261112000000`） | 当前策略 `using (auth.uid() = user_id)` 无 `with check` 子句，允许用户修改 `notification_id` 重关联到其他通知。修复分两步：① 追加 `WITH CHECK (auth.uid() = user_id AND read_at IS NOT NULL)` 保护 `read_at` 列；② 追加 `REVOKE UPDATE (notification_id, user_id) ON user_notification_reads FROM authenticated` 从列级阻止重关联（`WITH CHECK` 只能校验 NEW 行，无法对比 OLD.notification_id；列级 REVOKE 是唯一可靠方案） |
| 30 | 通知软删除语义澄清 | 本周期暂不扩充表结构：删除操作将 `status` 设为 `archived`（复用归档状态），所有关联 `user_notification_reads` 记录批量置 `dismissed_at`。批量 dismiss 经 Edge Function（service_role 绕过 RLS）执行，不依赖客户端策略。后续版本如需区分"手动删除"与"过期归档"，再引入 `deleted_at` 列 |
| 31 | 通知状态枚举补 `expired` | `expired` 不作为独立 DB 状态持有；UI "已过期"行实际由 RLS `expires_at < now()` 即时过滤 + pg_cron 写入 `archived` 联动表现。pg_cron 归档调度覆盖 `status IN ('published','unpublished')`，确保两种状态的过期通知均被归档（见决策 28） |
| 32 | `system_notifications.created_by` 默认值 | 列无 `default auth.uid()`，`admin_all` 策略不强制 `created_by = auth.uid()`。本级不增加硬约束（admin 为受信用户），但前端创建通知时需显式传 `created_by = auth.uid()`；后续版本可改为 `default auth.uid()` + 重写迁移 |

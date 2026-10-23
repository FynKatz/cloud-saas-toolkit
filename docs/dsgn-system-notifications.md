# 系统通知 — 设计定稿

> 本文档定义系统通知的完整设计：UI 复用 Dashboard banner 块、用户交互、Admin 管理、数据模型、状态机、RLS。  
> 确认后即进入实施。

---

## 1. 设计原则

1. **复用已有 UI** — 不新建组件模式，通知横幅直接使用 Dashboard banner 块的结构与样式。
2. **一次关闭 = 永久不弹** — 点击 ✕ 记 `dismissed_at`，同一通知不再出现于横幅。
3. **优先级驱动排序** — `important > warning > info`，高优先级优先展示。
4. **不阻塞用户体验** — 横幅非 modal、不居中、不阻断页面操作。

---

## 2. 展示层 UI

### 2.1 Dashboard 横幅（用户端）

```
┌──────────────────────────────────────────────────────┐
│ [⚡] │ 重要：停车收费接口切换                  2026-10-23 │
│      │ 停车计费接口将于 11/1 迁移至新版本...        [查看详情 →] │
│      ───────────────────────────────────── 还有 2 条 → │
└──────────────────────────────────────────────────────┘
```

**样式映射（完全复用 Dashboard banner 现有 CSS token）**：

| 元素 | 现有 banner 对应 | Token/值 |
|---|---|---|
| 外层容器 | `.banner` | `border-radius: var(--radius)` = 14px |
| 背景色 | `background: var(--violet-soft)` = `#f0f0ff` |
| 左方块 | `.banner-badge` | `36×36px, border-radius: 10px, background: var(--violet-solid)` |
| 标题 h4 | `.banner-main h4` | `font-size: 13.5px, font-weight: 650` |
| 描述 p | `.banner-main p` | `font-size: 12px, color: var(--ink-2)` |
| CTA 按钮 | `.banner-cta` | 浅底紫字 `padding: 7px 13px, border-radius: 9px` |
| 关闭按钮 | ✕ 在右上角 | 新增：`28×28px, border-radius: 8px, color: var(--ink-3)` |
| 下方多通知引导 | — | `12px, color: var(--violet), cursor: pointer` |

**关闭按钮位置**：

```
┌──────────────────────────────────────────────────────┐
│ [⚡] │ 重要：停车收费接口切换                   ✕    │
│      │ 停车计费接口将于 11/1 迁移...        [查看详情 →] │
└──────────────────────────────────────────────────────┘
```

拒绝了以下方案：
- ✕ 在顶部右（与现有 banner 不对称）
- ✕ 在 banner 右下（难找）
- ✕ 在左侧 icon 里面（太小）

### 2.2 多通知堆叠

- 最多同时显示 **1 条横幅**
- 取 `priority DESC, published_at DESC` 的第一条
- 下方浅灰分割线 + "还有 N 条未读通知 →"（点击跳 `/notifications`）
- 未读通知数 = `published - dismissed - read` 的剩余条数

```
┌──────────────────────────────────────────────────────┐
│ [⚡] │ 重要：停车收费接口切换                   ✕    │
│      │ 停车计费接口将于 11/1 迁移...        [查看详情 →] │
│      ───────────────────────────────────── 还有 2 条 → │
└──────────────────────────────────────────────────────┘
```

### 2.3 无通知状态

```
┌──────────────────────────────────────────────────────┐
│ [✓] │ 无新通知                               ✕    │
│      │ 当前没有未读的系统通知。                         │
└──────────────────────────────────────────────────────┘
```

此状态不常出现，仅在需要消除历史通知 banner 的"空位"时可选。

### 2.4 通知中心 `/notifications`

采用与 Dashboard banner **无关**的列表布局，水平空间更高效：

```
系统通知                    全部 / 未读    [全部已读]

● 重要：停车收费接口切换       维护    2026-10-23  高
  停车计费接口将于 11/1 迁移...

● 系统维护通知               维护    2026-10-23  中
  今晚 2:00-4:00 数据库升级...

○ 新工具上线：SQL 速查       新工具   2026-10-22  低
  SQL 速查工具已上线...
```

点击展开详情：
```
┌─ 展开后 ──────────────────────────────────┐
│ 停车计费接口（API v1.0）将于 2026 年 11 月 1 日 │
│ 00:00 停止服务。届时使用旧接口的收费功能...   │
│                                            │
│ ┌────────────────────────────────────┐    │
│ │ 前往配置 ›                          │    │
│ └────────────────────────────────────┘    │
└───────────────────────────────────────────┘
```

- 展开 = 自动标记已读（蓝点转灰）
- 底部可跟随 `target_route` 跳转
- 右上"全部已读"按钮

---

## 3. 数据模型

```sql
-- 系统通知主表
create table public.system_notifications (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  content         text not null,
  type            text not null check (type in ('maintenance','new_tool','announcement','alert')),
  priority        text not null default 'info' check (priority in ('info','warning','important')),
  target_route    text,                       -- 可选：点击跳转页面路径
  status          text not null default 'draft' check (status in ('draft','published','archived','unpublished')),
  created_by      uuid not null references profiles(id),
  created_at      timestamptz not null default now(),
  published_at    timestamptz,                -- 发布时间（now() 时为立即发布）
  expires_at      timestamptz default now() + interval '30 days',
  updated_at      timestamptz not null default now()
);

-- 用户已读已关记录
create table public.user_notification_reads (
  id                uuid primary key default gen_random_uuid(),
  notification_id   uuid not null references public.system_notifications(id) on delete cascade,
  user_id           uuid not null references auth.users(id) on delete cascade,
  read_at           timestamptz,              -- 在通知中心展开详情时记录
  dismissed_at      timestamptz,              -- 点击横幅 ✕ 时记录
  created_at        timestamptz not null default now(),
  unique(notification_id, user_id)
);

-- 由现有 public.set_updated_at() 函数维护 updated_at（init_schema 已定义）
create trigger system_notifications_set_updated_at
  before update on public.system_notifications
  for each row
  execute function public.set_updated_at();
```

索引：`(notification_id, user_id)` 唯一索引用于 upsert。  
`(status, published_at, expires_at)` 复合索引用于横幅查询。

### read_count 计算方案

**已读人数改用「触发器」维护**，在用户展开通知详情时触发，确保安全（不绕过 RLS）且可避免滥用：

```sql
create or replace function public.trg_inc_notification_read_count()
returns trigger
language plpgsql security definer set search_path = ''
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

create trigger trg_inc_notification_read_count
  after insert or update of read_at
  on public.user_notification_reads
  for each row
  execute function public.trg_inc_notification_read_count();
```

Administrator 在管理端查看通知详情时可通过
`select count(*) from user_notification_reads where notification_id = $1 and read_at is not null`
获取已读人数。

> **迁移说明**：上述 DDL 全部合并进单一迁移文件
> `20261023010000_system_notifications.sql`（建表 + set_updated_at trigger + RLS + 索引 + read_count trigger），
> 不再拆分第 2 个 RLS 迁移。

---

## 4. 状态机

```
                  ┌─ 可随时撤回 ─→ 撤回(unpublished) ─→ 重编辑(回到 draft) ─→ 再发布
                  │
  draft ──→ published ──→ archived (手动或 expires_at 到期)
                  │
                  └─ published_at > now() → 定时发布（v1 不实现，直接 now()）
```

| 状态 | 含义 | 用户可见 | 可编辑 | 操作 |
|---|---|---|---|---|
| draft | 草稿 | 不可见 | 是 | 编辑 / 删除 / 发布 |
| published | 已发布 | 可见 | 否 | 撤回 / 归档 |
| unpublished | 已撤回 | 不可见 | 是 | 编辑 / 删除 / 再发布 |
| archived | 归档 | 不可见 | 否 | 无 |

---

## 5. 用户路径（Dry Run 完整版）

### 5.1 用户收到通知

```
1. 用户登录 → AppShell.onMounted → 查未读通知
2. SELECT ... WHERE status='published' AND published_at<=now()
   AND (expires_at IS NULL OR expires_at>now())
   AND NOT EXISTS (SELECT 1 FROM user_notification_reads r
         WHERE r.notification_id = n.id AND r.user_id = auth.uid() AND r.dismissed_at IS NOT NULL)
3. 如果有未读 → 显示横幅
4. 按 priority DESC, published_at DESC 取第一条
5. 如果 total_unread > 1 → 显示"还有 N 条未读 →"
6. 横幅在 Dashboard 顶部，路由 '/ 时显示；切换路由时消失
7. 页面返回 Dashboard 时重新检查
```

### 5.2 用户关闭通知

```
1. 用户点击 ✕
2. UPSERT user_notification_reads (notification_id, user_id)
   SET dismissed_at = now()
3. 横幅淡出动画（opacity 0 → transform translateX 40px → 移除 DOM）
4. 同会话同通知不再显示
5. 下次登录也不再显示（dismissed_at IS NOT NULL 已被 SELECT 排除）
6. 用户仍可在 /notifications 通知中心找到并阅读
```

### 5.3 用户阅读通知

```
1. 用户点击横幅"查看详情 →" 或下方"还有 N 条 →"
2. 跳转 /notifications
3. 列表展示所有未过期通知（未读优先排序）
4. 用户点击某条 → 展开详情
5. 展开时：UPDATE user_notification_reads SET read_at = now()
              （system_notifications.read_count 由 SECURITY DEFINER 触发器自动递增，见 §3 read_count 计算方案）
6. 蓝点 → 灰点
7. 如果关联了 target_route → 底部按钮"前往配置 ›"
```
> 用户路由不会直接写 `system_notifications` 表；read_count 自动递增由
> §3 的 `trg_inc_notification_read_count` 触发器（SECURITY DEFINER）在写入
> `user_notification_reads.read_at` 时自动处理，没有 RLS 权限冲突。

### 5.4 Admin 发布通知

```
1. Admin 登录 → 管理面板 → 系统通知
2. 列表页显示全部通知（含草稿、已发布、已归档）
3. 点击"新建通知"
4. 填写：标题、内容、类型、优先级、target_route(可选)
5. 点击"保存草稿" → 状态 draft
6. 预览按钮 → 模拟用户端横幅（与真实横幅完全一致）
7. 点击"发布" → 确认弹窗 → 状态 published + published_at = now()
8. 发布后内容字段变为只读
9. 已发布通知保留"撤回"按钮
   点击撤回 → 确认弹窗 → 状态 unpublished
   撤回后可重新编辑 → 再次发布
10. 点击归档 → 状态 archived → 用户端不再显示
```

---

## 6. RLS 策略

```sql
-- system_notifications
create policy "users_read_published" on system_notifications
  for select using (
    status = 'published' 
    AND (expires_at IS NULL OR expires_at > now())
    AND published_at <= now()
  );

create policy "admin_all" on system_notifications
  for all using (public.is_admin()) with check (public.is_admin());

-- user_notification_reads
create policy "self_insert" on user_notification_reads
  for insert with check (auth.uid() = user_id);
create policy "self_select" on user_notification_reads
  for select using (auth.uid() = user_id);
create policy "self_update" on user_notification_reads
  for update using (auth.uid() = user_id);

-- Admin 管理端需要读取 read_count / 已读用户列表
create policy "admin_read_reads" on user_notification_reads
  for select using (public.is_admin());
```

---

## 7. 实施清单（v1 范围）

| # | 内容 | 文件 |
|---|---|---|
| 1 | 建表 + RLS + 索引 + 触发器（单一迁移）`20261023010000_system_notifications.sql` | `supabase/migrations/` |
| 2 | 查询 composable `useNotifications.ts`（在 AppShell onMounted 初始化，向后代 inject 状态） | `frontend/src/composables/` |
| 3 | Dashboard 横幅组件 `NotificationBanner.vue`（注入 useNotifications 状态，仅 DashboardView 渲染） | `frontend/src/components/notification/` |
| 4 | 通知中心页面 + 路由 `/notifications` | `frontend/src/views/NotificationCenterView.vue` |
| 5 | Admin 通知管理页面 + 路由 `/admin/notifications` | `frontend/src/views/admin/NotificationManagementView.vue` |
| 6 | adminNav 添加「系统通知」条目（管理面板分组下，指向 `/admin/notifications`） | `frontend/src/components/AppShell.vue` |
| 7 | 全局 CSS：将 `.banner` 系列样式从 `DashboardView.vue` 移至 `src/style.css`，以便 `NotificationBanner.vue` 使用 | `frontend/src/style.css` |
| 8 | 注册路由 `/notifications`（requiresAuth: true）和 `/admin/notifications`（requiresAdmin: true） | `frontend/src/router/index.ts` |

**不做**：定时发布、push 推送、定向角色。

---

## 8. 异常处理

| 场景 | 策略 |
|---|---|
| 发布时网络失败 | 状态保持 draft，可重试 |
| 发布成功但前端超时 | 幂等：已 published 则提示"已发布" |
| 新用户登录 | read_record 不存在 → 未读 → 显示横幅 |
| 并发关闭 | unique 约束防重复 |
| 频繁撤回/重发 | 撤回后回到可编辑状态，可反复操作 |
| expires_at 到期 | 前端 SELECT 加 `expires_at > now()` 过滤 |

---

## 9. 定稿记录

- UI 复用 Dashboard banner 块，CSS 从 DashboardView 提取至全局 style.css。
- 加载时序：useNotifications 在 AppShell onMounted 初始化（只查一次）→ provide/inject 状态 → NotificationBanner.vue 渲染于 DashboardView。
- read_count 改用 SECURITY DEFINER 触发器，用户不直接 UPDATE system_notifications。
- 迁移合并为单一文件。
- 2026-10-23 二次审查修复：--radius 12→14px、updated_at 补 default+trigger、admin_all 补 with check、5.1 改 NOT EXISTS、实施清单补路由注册。
- UI 交互原型验证通过。
- Dry Run 路径全部闭环。
- 异常场景覆盖 6 项。
- 待确认后进入实施。


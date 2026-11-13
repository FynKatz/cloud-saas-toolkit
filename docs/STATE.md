# STATE.md — 项目当前状态

> 自动由 agent 维护，记录当前阶段、分支、未提交改动和待办清单。
> 更新时间：2026-11-13

## 当前分支

```
feature/2610（HEAD）
```

## 已完成 Phase

| Phase | 名称 | 状态 |
|---|---|---|
| 1 | 数据层（建表/RLS/种子） | ✅ 已完成 |
| 2 | 认证与权限（注册/登录/审批/RBAC） | ✅ 已完成 |
| 3 | 前端重构（AppShell/抽屉/主题/Dashboard） | ✅ 已完成 |
| 4 | 工具迁移（12 工具页进 Vue） | ✅ 已完成 |
| 5 | 设计系统 + 全站 UI/UX 统一 | ✅ 已完成 |
| 6 | 数据驱动 Dashboard + 脚手架清扫 | ✅ 已完成 |
| 7 | 系统通知 | ✅ 已完成 |
| 8 | v2 双层导航 + ClickUp 导航 1:1 复刻 | ✅ 已完成（`9fdde6f` 已提交） |
| 9 | 内容区圆角/线宽统一 + 数据修复 + 停车 V2 回归 | ✅ 已完成（未提交） |

## 正在进行

| 工作项 | 状态 | 详情 |
|---|---|---|
| 停车收费 V2 | ✅ 回归全通过 | [parking-implementation-plan.md](docs/design/parking/parking-implementation-plan.md) §10.2/10.3 |
| 数据管理三页（省市/商场/停车场） | ✅ 完成 | admin 面板；停用记录的恢复入口在此 |
| 内容区圆角/线宽统一 | ✅ 完成 | [content-radius-spec.md](docs/design/content-radius-spec.md) |
| 高德 JS Key 域名白名单 | ⏸ 需用户配合 | 账号侧 console 配置，agent 无法闭环 |
| 本批次提交 / 推送 / 部署 | ⏸ 等用户明确下令 | AGENTS §3：不得自行 commit |

## 本批次未提交改动（feature/2610）

```text
修改：PROCESS_LOG.md, AGENTS.md, ROADMAP.md, docs/STATE.md,
  docs/design/{content-radius-spec(新增),nav-clickup-spec,dashboard-layout-spec,uiux}.md,
  docs/design/parking/parking-implementation-plan.md,
  frontend/src/style.css,
  frontend/src/views/{ParkingView,DashboardView,NotificationCenterView}.vue,
  frontend/src/views/admin/NotificationManagementView.vue,
  frontend/src/components/auth/AuthShell.vue,
  scripts/nav-ego-check.mjs
新增：supabase/migrations/20261113000000_restore_family_role_permissions.sql,
      supabase/migrations/20261113000100_parking_images_bucket_and_select.sql
```

## 本轮修出的两个真实缺陷

1. **已停用停车场仍出现在 admin 主列表与地图**。`ParkingView` 过去只靠 RLS 过滤 `status`，
   而 admin 的 SELECT 策略可见全部行，与实施计划「停用后主列表消失」矛盾。
   已在 `filtered` 内加 `status !== 'active'` 短路，恢复入口保留在 admin 数据管理页。
2. **`parking-images` 桶此前根本不存在**。`20261020030000_storage.sql` 写了 SELECT 策略但
   当时只执行了一半，`storage.buckets` 为空 —— 「图片上传 + 私有桶签名 URL 可读」在此之前
   必然失败。已补 `20261113000100_parking_images_bucket_and_select.sql` 并执行。

另记一条**非缺陷**：`家庭成员`(0002) 的 5 条授权是 2026-11-04 被人从 RBAC 界面连续点掉造成的
漂移（`audit_logs` 有 13 次 `admin_set_role_permission`），Edge Function 逻辑本身正确。
已按种子恢复为 12 条 / 3 edit，并把「种子是唯一事实源」写进 AGENTS §7。

## v1 冻结分支的被动变化

`--radius` / `--radius-sm` 重值会连带改掉 v1 `AppShell.vue` 的 `.side-card`、收缩态图标格、
`.user-pop` 圆角。生产配置 `VITE_NAV_V2=1` 下 v1 不可达，`scripts/` 无 radius/stroke 断言，
故**接受该被动变化，不手工对齐**。

## 数据基线（回归收尾已核对）

`parking_locations` 1（北京SKP停车场，active，`images: []`）/ `parking_malls` 0 /
`user_parking_favorites` 1（admin→SKP）/ `regions` 2850 / `user_recent_tools` 0 /
`storage.objects` 0 / `家庭成员` 授权 12 条（3 edit）。
QA 数据统一 `QA_` 前缀，验证后已按 `AGENTS §7` 全删；
`localStorage` 的 `cloud-saas-toolkit:recent-tools` 已清回 `[]`。

## 下一步

1. 高德 JS Key 域名白名单需用户在 console 配置后才能真正闭环。
2. `ParkingView` 表单里「解析地址到地图」只回填坐标，不会自动选中省/市/区下拉
   （保存仍要求手选区划）。属可选优化，未在本批次范围。
3. 提交 / 双推 / Netlify 直传：等用户明确下令。

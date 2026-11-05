# STATE.md — 项目当前状态

> 自动由 agent 维护，记录当前阶段、分支、未提交改动和待办清单。
> 更新时间：2026-11-05

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

## 正在进行

| 工作项 | 状态 | 详情 |
|---|---|---|
| 停车收费 V2 | 代码完成，回归中 | [parking-implementation-plan.md](docs/design/parking/parking-implementation-plan.md) |
| 数据管理三页（省市/商场/停车场） | 代码完成 | admin 面板新增菜单 |

## 未提交改动（feature/2610）

```text
修改（13 文件）：
  .env.secrets, PROCESS_LOG.md, ROADMAP.md, docs/ISSUES-20261022.md,
  docs/design/dashboard-layout-spec.md, docs/runbook-corporate-network.md,
  frontend/src/components/AppShell.vue, frontend/src/router/index.ts,
  frontend/src/views/DashboardView.vue, frontend/src/views/ParkingView.vue,
  scripts/net-doctor.sh, scripts/supa-sql.sh

新增（16 文件/目录）：
  docs/design/parking/（设计原型+实施计划）
  frontend/src/composables/useMalls.ts, useParking.ts, useRegions.ts
  frontend/src/lib/amap.ts
  frontend/src/types/parking.ts
  frontend/src/views/admin/DataManagementView.vue, MallManagementView.vue,
    ParkingLocationAdminView.vue, RegionManagementView.vue
  frontend/src/vite-env.d.ts
  scripts/build-regions-seed.mjs, supa-ego-cli.sh, supa-ego.mjs
  supabase/functions/amap_geocode/
  supabase/migrations/20261104010000_parking_v2_schema.sql,
    20261104020000_seed_regions.sql, 20261104030000_parking_storage.sql
  supabase/seed/

删除：
  scripts/supabase-cdp.mjs（Test Chrome CDP 废弃）
```

## 停车 V2 待办（来自实施计划 §10.2/10.3）

### 功能回归（未勾 = 待验证）
- [ ] admin：搜索/筛选/只看收藏全链路
- [ ] admin：地图 marker 双向联动
- [ ] admin：地图搜索/定位/缩放
- [ ] admin：编辑/停用/删除停车场
- [ ] admin：数据管理三页全功能
- [ ] 普通用户：权限边界（不能直接 INSERT/UPDATE/DELETE）
- [ ] 普通用户：收藏切换与持久化
- [ ] 移动端响应式

### 安全回归
- [x] 普通用户经 RPC 新增成功
- [x] 直接 INSERT 被 RLS 拒绝
- [ ] 旧百度 Key 不再出现在新代码中
- [ ] amap_geocode Edge Function 部署并可用

### 收尾（Phase F）
- [ ] npm run build 通过
- [ ] git commit + push（feature/2610 → GitHub + Gitee）
- [ ] 更新实施计划勾选状态

## 阻塞项

- `AMap.Geocoder` 回调在前端不触发（已走通服务端高德 Web API 直连替代方案）。
- 建议方案：部署 `supabase/functions/amap_geocode` Edge Function，前端用 `supabase.functions.invoke` 调用。

## 下一步

1. ~~创建 AGENTS.md（repo agent 入口）~~ ✅ 已完成
2. 停车 V2 回归跑完（ego-browser 自动化）
3. 部署 amap_geocode Edge Function
4. npm run build → 提交 → 推送

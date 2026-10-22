# Cloud SaaS Toolkit — 路线图

> 需求以 [PRD](./docs/PRD.md) 为唯一事实来源。

## Current State

- 静态工具页面已从原 Netlify 站点恢复到本仓库。
- Git 远端：`origin` (GitHub) / `gitee` (Gitee 镜像)。
- 分支策略：`feature/2610 → dev → int → stg → prod`。
- `prod` 分支通过 Netlify 自动部署到 https://cloud-saas-toolkit.netlify.app。
- Supabase 密钥存于 `frontend/.env`（已 gitignore），`.env.example` 供参考。
- 密钥按 A/B/C 三级管理（见 [PRD §8.1](docs/PRD.md)）：`.env.secrets`（git 跟踪）为单一事实源，`frontend/.env`（gitignore）存公开 `VITE_` 变量，C 级机密不进入前端产物。
- **Phase 1–4 已完成**（功能层面：数据层 / 认证权限 / 前端骨架 / 12 工具迁移）。
- **UI/UX 尚未达标**，单列 Phase 5 重建；设计已定稿，见
  [docs/design/dashboard-layout-spec.md](./docs/design/dashboard-layout-spec.md) v1.1。
- 运维通道：复用 git config 里带域凭据的代理后，shell 可直达 Supabase / Netlify / Gitee，
  migration 用 `sh scripts/supa-sql.sh --file <path>`；浏览器 CDP 仅作兜底。
  GitHub 在本网络不稳定，详见 [docs/runbook-corporate-network.md](./docs/runbook-corporate-network.md)。
- **部署现状**：线上仍是旧静态站，Phase 1–4 的 Vue 版本从未成功上线
  （2026-10-20 两次 prod 构建 error）。见 runbook §4。

## Target Architecture

```
Browser
  |-> Netlify: Vue 3 + Vite 前端
  |-> Supabase Edge Functions (service role 操作)
         |-> Supabase Auth / Database / RLS
```

## Phases

### Phase 1: 数据层

- Supabase 建表、RLS、触发器、安全函数。
- 种子数据：admin 角色、初始 admin 用户、tools 表。

### Phase 2: 认证与权限

- Supabase Auth 接入（用户名/密码 → 虚拟邮箱）。
- 注册、登录、审批、密码修改/重置、路由守卫。
- RBAC 管理界面（用户、角色、权限勾选）。

### Phase 3: 前端重构

- 首页 + 侧边栏按锁定的 UI 方案重写。
- 白天/暗夜主题、可折叠抽屉、搜索 + 最近使用 + Bento。

### Phase 4: 工具迁移

- 12 个工具逐个迁移进 Vue 应用。
- 私有工具 RLS 隔离、共享工具对所有已授权用户可见。
- 审计日志、收藏、最近使用收尾。

### Phase 5: 设计系统 + 全站 UI/UX 统一 — ✅ 已完成并上线（2026-10-22）

定性为**重建**，不是打补丁。依据 `docs/design/dashboard-layout-spec.md` v1.1（含 §11 偏离清单）与
只读基线 `docs/design/baseline/dashboard-layout.html`。

- 5.1 ✅ `src/style.css` 换成定稿 Cake token（浅色 + 暗夜双份）。
  过程中挖出全站根因：未分层的 `* { padding:0 }` 压掉了 Tailwind 所有 padding/margin
  工具类，是「UI 一塌糊涂」的主因；另修 `useTheme` 导致暗夜无法持久化。
- 5.2 ✅ `AppShell.vue` 复刻基线导航骨架：220↔56 收缩、抽屉分组、汉堡常驻、
  固定项走滚动锚点；scoped 普通 CSS，不走 Tailwind 工具类。CDP 交互 10/10。
- 5.3 ✅ `DashboardView.vue` 按 8 个 block 重建；KPI 接真实计数，空状态分级。
- 5.4 ✅ 暗夜模式一并交付（黑底 `#0C0C0E` + 紫强调，禁绿）。双主题 16 页审计全通过。
- 5.5 ✅ 全页面验收：构建产物回归 36/36、生产检查 9/9、无 JS 异常。

验证工具已入库：`scripts/serve-dist.mjs`（带 SPA 回退地测产物）。

已完成前置：DB 分组 migration 已执行（`20261021010000_tool_categories_b_grouping.sql`）。
已完成前置：`router/index.ts` 的 DEV 离线 seed 已按真实库重生成（含修正错误的 id）。

### Phase 6: 数据驱动 Dashboard + 脚手架清扫 ✅ 已完成（2026-10-22）

- 6.1 ✅ Dashboard 活动流从 static demo → 真实 `audit_logs`，趋势面积图/折线图近 7 天实时。
- 6.2 ✅ 删除未使用的 shadcn/reka-ui 脚手架：`components.json`、`lib/utils.ts`、
  4 个 npm 包(class-variance-authority/clsx/reka-ui/tailwind-merge)、`style.css` 43 行死 CSS。
- 6.3 📝 停车/电影/待办数据由用户自行录入后 KPI 与占比表自动生效（无需代码改动；空环/引导已完备）。

## Repository Rules

- `prod` 是唯一的部署分支。
- 合并流水线：`feature/2610 → dev → int → stg → prod`。
- 密钥管理：`.env.secrets`（git 跟踪）为唯一事实源，按三级分发（§8.1）；前端产物仅含 `VITE_` 前缀的公开变量。

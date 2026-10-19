# Cloud SaaS Toolkit — 路线图

> 需求以 [PRD](./docs/PRD.md) 为唯一事实来源。

## Current State

- 静态工具页面已从原 Netlify 站点恢复到本仓库。
- Git 远端：`origin` (GitHub) / `gitee` (Gitee 镜像)。
- 分支策略：`feature/2610 → dev → int → stg → prod`。
- `prod` 分支通过 Netlify 自动部署到 https://cloud-saas-toolkit.netlify.app。
- Supabase 密钥存于 `frontend/.env`（已 gitignore），`.env.example` 供参考。
- 密钥按 A/B/C 三级管理（见 [PRD §8.1](docs/PRD.md)）：`.env.secrets`（git 跟踪）为单一事实源，`frontend/.env`（gitignore）存公开 `VITE_` 变量，C 级机密不进入前端产物。

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

## Repository Rules

- `prod` 是唯一的部署分支。
- 合并流水线：`feature/2610 → dev → int → stg → prod`。
- 密钥管理：`.env.secrets`（git 跟踪）为唯一事实源，按三级分发（§8.1）；前端产物仅含 `VITE_` 前缀的公开变量。

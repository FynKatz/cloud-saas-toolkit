# AGENTS.md — Cloud SaaS Toolkit

> 本文件是 AI 代理操作本仓库的入口协议，所有 agent/skill/subagent 在读写仓库前必须理解。

## 1. 仓库身份

- **项目名**：Cloud SaaS Toolkit
- **类型**：Vue 3 + Vite 前端 + Supabase 后端个人工作台
- **需求事实源**：[docs/PRD.md](docs/PRD.md)
- **技术设计**：[docs/auth-permission-design.md](docs/auth-permission-design.md)
- **路线图**：[ROADMAP.md](ROADMAP.md)
- **当前状态**：[docs/STATE.md](docs/STATE.md)

## 2. 分支策略（强制）

```text
feature/2610 → dev → int → stg → prod
```

- `prod` 是唯一部署分支，经 Netlify 自动部署。
- 合并只做 fast-forward（`git merge --ff-only`）。
- 推送：**双推 GitHub（origin）+ Gitee（gitee）**，两者必须对齐。

## 3. 密钥规则（PRD §8.1）

- `.env.secrets`（git 跟踪）是全部密钥的**唯一事实源**。
- 构建前执行：`grep '^VITE_' .env.secrets > frontend/.env`
- `frontend/.env` 不提交 Git，只放 `VITE_` 前缀公开变量。
- 服务端密钥（Supabase service_role、Pixabay、TMDB、AMap Web Key）永不进前端源码或构建产物。
- **严禁把 `.env.secrets` 的 C 级密钥复制到 `frontend/.env` 之外的任何文件。**

## 4. 文件归属与并发边界

| 目录/文件 | 归属 | 规则 |
|---|---|---|
| `supabase/migrations/` | 数据层 agent | 串行，每次加新文件不修改已有 migration |
| `frontend/src/views/` | 按工具页拆分 agent | 每个 `*View.vue` 独立，不跨页修改 |
| `frontend/src/components/` | 全局 shell agent | AppShell 只归一个 agent |
| `frontend/src/router/` | 全局 shell agent | 与 AppShell 同一 agent |
| `frontend/src/stores/` | 状态 agent | Pinia store 串行修改 |
| `docs/` | 中心 agent / reviewer | PRD 修改需 reviewer 审批 |
| `scripts/` | 工具链 agent | 独立，不跨脚本修改 |
| `ROADMAP.md` | 中心 agent | 阶段推进后逐项勾选 |

## 5. 构建与验证硬门槛

- **每轮收尾必须真跑** `npm run build`（在 `frontend/` 目录）。
- 只跑 `npm run dev` 不算数；dev server 按需编译会漏掉 TS 错误和构建失效。
- 浏览器回归必须以**构建产物**为基准（`scripts/serve-dist.mjs`），不以 dev server 为准。

## 6. 运维通道

- **Supabase SQL/migration**：`sh scripts/supa-sql.sh --file <path>`（复用 git config 代理凭据）。
- **浏览器兜底**：`scripts/supa-ego-cli.sh`（ego-browser 在已登录 Supabase 的标签页内注入 SQL）。
- **Test Chrome CDP 已废弃**，脚本 `scripts/supabase-cdp.mjs` 已删除。
- **GitHub 推送必须走 `sh scripts/push-retry.sh origin <branch>...`，禁止裸 `git push origin`。**
  GitHub 走 git 专用代理 `http.https://github.com.proxy`（`172.30.243.124:8080`，Basic Auth），
  与 ego/浏览器的 relay（`proxy-mac.bmwbrill.cn:8080`，NTLM）是两条不同网络路径。
  `push-retry.sh` 里 `lowSpeed` 超时 + 重试逻辑是为了应对间歇性 503；它 retry 全失败
  之前，不得根据 curl/ego relay 的结果、或上下文里"GitHub 被封锁"的旧结论跳过推送。
- 代理防线：shell 依赖 `proxy-mac.bmwbrill.cn:8080`（AD 域认证），浏览器持有已登录 Supabase/netlify 会话。本机 `no_proxy` 不含 Supabase 域名时不要裸连。

## 7. 测试卫生

- 自动化测试会污染真实数据，每次回归收尾清点并回滚自己写入的行（收藏/最近/停车/电影/任务）。
- DEV 模式的离线 seed 必须与 `public.tools` 表一致（`SELECT id,name,category,icon,data_scope,writable,sort_order ORDER BY sort_order`）。
- **权限种子是 RBAC 的唯一事实源。** `supabase/seed/` 里的 `role_permissions` 定义必须与线上表一致：
  通过 Admin「角色管理」界面增删授权时，同一轮要把改动同步回种子，否则视为**待恢复漂移**，
  后续任何按种子的核对都会得出错误结论。漂移实例与恢复记录见
  `supabase/migrations/20261113000000_restore_family_role_permissions.sql`。
- **权限种子是 RBAC 的唯一事实源。** 它不在 `supabase/seed/`（那里只有 `regions`），
  而在 `supabase/migrations/20261020010000_init_schema.sql` 末尾的两段 upsert：
  9 个只读工具 × 3 个非 admin 种子角色，外加各角色的 `parking`/`movie`/`todo` 授权。
  通过 Admin「角色管理」界面增删授权时，同一轮要把改动同步回该种子段，否则视为**待恢复漂移**，
  后续任何按种子的核对都会得出错误结论。漂移实例与恢复记录见
  `supabase/migrations/20261113000000_restore_family_role_permissions.sql`。

## 8. 项目公约

- 所有业务表带 `user_id UUID NOT NULL REFERENCES auth.users(id)`。
- 共享/私有隔离只改 RLS，不改表结构。
- 权限采用多角色并集（`bool_or`），支持 view/edit 两级操作粒度。
- 系统通知采用黑名单模型，关闭后不重复出现。

## 9. Ego-browser（遵循全局 `ego-workbench` skill）

ego 操作遵循全局 `ego-workbench` skill，TaskSpace `Cloud SaaS Toolkit`。详细规则与 SOP 见 `~/.codex/skills/ego-workbench/SKILL.md`。

## 10. 部署（Netlify 直传）

**不依赖 GitHub 自动触发。** Netlify Continuous Deployment 需升级付费计划，本工程使用 API 直传部署。

**每次上线步骤：**

```bash
# 1. 构建（密钥需预填充 frontend/.env）
grep '^VITE_' .env.secrets > frontend/.env
cd frontend && npm run build

# 2. 直传 + 上线（走 ego relay，免费；不带 --publish 只传草稿）
SUPA_PROXY=http://127.0.0.1:18899 node scripts/netlify-deploy.mjs --publish
```

- 凭据来源：`.env.secrets` 中的 `NETLIFY_AUTH_TOKEN`。
- 传输层：curl 走 ego relay（`127.0.0.1:18899`），`SUPA_PROXY` 注入代理地址。
- 脚本位置：`scripts/netlify-deploy.mjs`。
- 线上主域：`https://cloud-saas-toolkit.netlify.app`。
- 查询部署记录：`GET /api/v1/sites/{site_id}/deploys`（同一个 token）。

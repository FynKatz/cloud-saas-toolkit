# 公司网络下的运维通道 Runbook

> 适用：本机在「PAC 代理 + Active Directory 域认证」环境下访问外部平台。
> 首次记录 2026-10-21，**2026-10-22 重大纠正**：本文初版结论是错的，
> 错在把「代理要求认证」当成「平台不可达」，又用浏览器绕了远路。
> 保留这段历史作为反面教材，正确做法见 §1–§3。

---

## 0. 一句话原则

**407 只说明「你没带凭据」，不说明「你到不了」。**
查网络必须走完四步 ladder（`scripts/net-doctor.sh`），在第 4 步之前不得下任何结论。

---

## 1. 四步判定 ladder

```sh
sh scripts/net-doctor.sh <host> [<host> ...]
```

| 步 | 动作 | 判读 |
|---|---|---|
| 1 | 看 shell 有无 `http_proxy`/`https_proxy` | 只有 `no_proxy` 时 curl 在**直连**；直连超时 ≠ 被墙 |
| 2 | `scutil --proxy` 读 PAC 与默认出口 | 本机默认出口 `proxy-mac.bmwbrill.cn:8080` |
| 3 | `-x <proxy>`（不带凭据）试探 | `407 ... NTLM/NEGOTIATE/BASIC realm="Active_Directory"` = **缺认证**，到此不能收工 |
| 4 | **找现成内嵌凭据的代理复测** | 通了 → shell 可自助；不通 → 才谈浏览器或换网络 |

第 4 步的凭据来源（本机实测存在）：

```sh
git config --get-regexp '^http\..*\.proxy$'   # 值形如 http://user:pass@host:port
```

仓库的 git 配置里早就存了带域账号的代理，所以 git 能推 Gitee；
把同一份值给 curl 用，Supabase / Netlify 的 API 也就直接通了。
**当初只要多问一句「git 为什么能通」，就不会有后面两轮误判。**

---

## 2. 通道优先级

### 2.1 首选：shell + 带凭据代理

```sh
sh scripts/supa-sql.sh "select count(*) from public.tools"   # 语句
sh scripts/supa-sql.sh --file supabase/migrations/xxx.sql    # 迁移文件
echo "select 1" | sh scripts/supa-sql.sh -                   # 管道
```

走 Supabase Management API `POST /v1/projects/<ref>/database/query`；
token 取 `supabase_token.txt`，代理取 git config，二者均不回显。

### 2.2 兜底：已登录浏览器 + CDP

仅当 token 过期或 Management API 不可用时使用：

```sh
node scripts/supabase-cdp.mjs tabs
node scripts/supabase-cdp.mjs sql --file supabase/migrations/xxx.sql
```

原理：Test Chrome 的 CDP 端口（默认 9231）→ 找已登录的
`supabase.com/dashboard/project/<ref>/sql/new` 标签页 → `window.monaco` 注入 SQL
→ 点 Run → 读 react-data-grid。依赖浏览器登录态，这是它唯一的短板。

### 2.3 通用套路（驱动别的平台时照抄）

1. `GET http://127.0.0.1:<port>/json/list` 取 `webSocketDebuggerUrl`。
2. `Runtime.evaluate` 带 `{ returnByValue: true, awaitPromise: true }`。
3. 优先用页面已暴露的全局对象注入内容，别模拟键盘。
4. 状态变更后**轮询完成信号**，不要固定 `sleep`。

---

## 3. 实测 host 矩阵（2026-10-22，公司网络）

| Host | 带凭据代理 | 结论 |
|---|---|---|
| `api.supabase.com` | 根路径 404；查询接口 **201** | **可达，首选通道** |
| `<ref>.supabase.co` | 200（RLS 对 anon 返回 `[]`） | 可达 |
| `supabase.com` | 200 | 可达 |
| `api.netlify.com` | 无 token 401 → 带 token 正常列站点/部署 | 可达 |
| `gitee.com` | 200；`git ls-remote gitee` 成功 | **可达，可自助推送** |
| `github.com` | 5 次 curl 全 `000`；`git ls-remote origin` 2 次失败（更早成功过一次） | **不稳定，按不可用规划** |

要点：GitHub 时通时不通，**不要把依赖它的流程当成可靠路径**。

---

## 4. 部署链路现状（同日实测）

- Netlify 站点 `cloud-saas-toolkit`（id `5dfce952-d106-48b3-a9b2-dc621ab0af55`，account `easyyhu`）。
- 构建配置：`npm run build` → 发布目录 `frontend/dist`。
- 部署记录：最后成功 `2026-10-16`；`2026-10-20` 两次 `prod` 构建 **state=error**（日志已过期取不到）。
- 线上实际内容：`HTTP 200`、`<title>开发者工具箱</title>`、**无 Vue 挂载点** →
  仍是恢复后的旧静态站，**Phase 1–4 的 Vue 版本从未上线**。
- 含义：git 触发的构建依赖 GitHub，而 GitHub 在本网络不稳定；
  已确认 **Netlify Deploy API 可达且鉴权通过**，必要时可直接上传产物绕开 git 触发。

---

## 5. 踩过的坑（全部实测）

| 坑 | 现象 | 正确做法 |
|---|---|---|
| 误判平台封锁 | 一次 curl `000` 就断言「被墙」 | 走完四步 ladder |
| 误判「只能走浏览器」 | 测到 407 就收工去做 CDP | 第 4 步先找现成凭据 |
| 绕远路做了浏览器工具 | CDP 能跑但依赖登录态、SPA 要等 | 能用 API 就用 API，CDP 只作兜底 |
| SPA 加载时间 | 固定 `sleep 8` 后编辑器还没挂载 | 轮询 `window.monaco` + Run 按钮 |
| 读不到表格文本 | `.rdg-cell` 的 `innerText` 全空 | react-data-grid 虚拟化，用 **`textContent`** |
| 抓不到查询请求 | `Network` 域里没有任何 SQL 请求 | 查询走 WebSocket，改读 DOM |
| 猜 dashboard 内部 REST | `/dashboard/api/...` 回 `Endpoint not supported on hosted`；`/api/projects/...`、`/api/platform/projects/...` 回 404 HTML | 别猜，用 Management API |
| Netlify 站点详情按名字取 | `/sites/cloud-saas-toolkit` 返回 `{code,message}` | 先 `/sites?filter=all` 拿 **id** 再查 |
| 结果被截断 | 面板写 `Limited to only 100 rows` | 校验类查询自己聚合成少量行 |

---

## 6. 安全

- **本机 git 配置里以明文存着公司 AD 域账号与代理密码**（`http.<url>.proxy`）。
  任何能读该文件的人都能拿它出网并冒用身份。建议改用系统钥匙串
  （`git config --global credential.helper osxkeychain`）或环境变量注入，并考虑改密。
  本仓库文档与脚本一律**不回显**该值，只按 key 名引用。
- 脚本只从 `git config` / `supabase_token.txt` / `.env.secrets` 读取，不打印、不写日志。
- DDL/DML 前先跑同条件 `select` 记基线，执行后再读一次做前后对比。
- 迁移一律先落成 `supabase/migrations/*.sql` 再执行，保证 Git 有痕迹、可重放。

---

## 7. 已执行记录

| 日期 | 语句 | 结果 |
|---|---|---|
| 2026-10-21 | `20261021010000_tool_categories_b_grouping.sql`（经浏览器 CDP） | `tools.category`/`sort_order` 改为定稿 B 分组 |
| 2026-10-22 | 同一文件经 `supa-sql.sh` 重放（幂等 UPDATE） | `速查参考\|4 数据应用\|3 图形工具\|2 文本工具\|3`，与规格 §3.0 一致 |

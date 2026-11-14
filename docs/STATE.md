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

## 本轮修出的三个真实缺陷

1. **已停用停车场仍出现在 admin 主列表与地图**。`ParkingView` 过去只靠 RLS 过滤 `status`，
   而 admin 的 SELECT 策略可见全部行，与实施计划「停用后主列表消失」矛盾。
   已在 `filtered` 内加 `status !== 'active'` 短路，恢复入口保留在 admin 数据管理页。
2. **`parking-images` 桶此前根本不存在**。`20261020030000_storage.sql` 写了 SELECT 策略但
   当时只执行了一半，`storage.buckets` 为空 —— 「图片上传 + 私有桶签名 URL 可读」在此之前
   必然失败。已补 `20261113000100_parking_images_bucket_and_select.sql` 并执行。

另记一条**非缺陷**：`家庭成员`(0002) 的 5 条授权是 2026-11-04 被人从 RBAC 界面连续点掉造成的
漂移（`audit_logs` 有 13 次 `admin_set_role_permission`），Edge Function 逻辑本身正确。
已按种子恢复为 12 条 / 3 edit，并把「种子是唯一事实源」写进 AGENTS §7。

3. **`netlify-deploy.mjs --publish` 的发布步骤恒失败**。它调 `POST /sites/{id}/main`，
   而该端点不存在（实测 404）。但直传 deploy 会落在 site 的 `prod` 分支上、上传完自动
   `state=ready` 并成为 `published_deploy`，**线上其实已经更新成功** —— 异常只是把成功
   掩盖成失败。已改为轮询 deploy 状态 + 以 `published_deploy.id === 本次 deploy.id`
   为唯一成功判据，仅在真的是 lock/draft 时才 unlock/restore。
   另注：`node scripts/netlify-deploy.mjs ... | tail` 会把退出码换成 tail 的 0，
   判断成败必须看脚本自身输出，不能信管道退出码（AGENTS §6 对 push 有同样警告）。

### 一处文档结论被实测否证（已纠正）

上一轮写的「`stroke-width` 必须无单位，写 `1.5px` 会钉死绝对线宽」**是错的**：
SVG 内 CSS 的 px 就是用户单位，线宽仍按 viewBox 缩放 —— 实测 16px 图标 1.0 设备像素、
15px→0.938、14px→0.875（= 1.5 × 尺寸 / 24）。且 minifier 本就把源码的 `1.5` 输出成
`1.5px`，构建产物带 px 属正常。`style.css` 注释、`content-radius-spec.md` §3、`uiux.md`
三处已同步纠正，避免下一个人拿这条假约束去「修」它。

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

## 存量工单收尾（2026-11-15）

上一轮列为「本次不做、另开工单」的四条，实测情况与处置：

| 工单 | 结论 |
|---|---|
| `/` 壳级与页内两条通知横幅同屏 | **已在 `9fdde6f` 修好**。`DashboardView` 的 `NotificationBanner` 带 `v-if="!isNavV2 && ..."`。本轮新建一条 published 通知实测：壳级 1 条、页级 0 条。 |
| profile 拉取失败带 0 工具进壳 | **已在 `9fdde6f` 修好**。守卫在 `!auth.profile` 时用 `loadProfileChecked()` 重试（8s 超时兜底），仍失败退回登录页，而不是渲染坏壳。 |
| `target_route` 缺白名单校验 | **已实现**。`lib/navTarget.ts` 的 `isSafeNavTarget` 挡掉协议头、协议相对 URL、空白与反斜杠绕过，`/admin/*` 按 admin 放行；三个消费点加管理表单提示全部接线。 |
| Dashboard「停车记录」KPI 语义 | **本轮修好**。计数改为 `status='active'`（与停车页主列表同口径），标签改「停车场条目 / 在用」，环形图图例同步改名。本工程没有停车记录表，真正的停车记录功能仍另开工单。 |

另完成一条可选优化：表单「解析地址到地图」现在除回填坐标外，还会自动选中省/市/区下拉。
区划反查优先用 `(province_name, district_name)` 定位整行 —— 直辖市在高德返回「上海市」，
而字典里上海唯一的市级行叫「上海城区」（重庆还分「重庆城区 / 重庆郊县」），按 city_name
直接匹配会落空；区名能唯一确定所属市，故以它为准，city_name 与「该省仅一个市」作降级兜底。
只填表单里空着的项，不覆盖已手选的值。实测上海地址解析后自动得到 `310000 / 310100 / 310112`。

## 下一步

1. 高德 JS Key 域名白名单需用户在 console 配置后才能真正闭环（无开放 API，不能脚本化）。
2. 真正的「停车记录」功能（新表 + 页面）仍是空白，按工单另起。

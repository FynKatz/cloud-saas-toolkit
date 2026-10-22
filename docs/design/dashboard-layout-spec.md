# Dashboard 布局定稿规格 (v1.0)

> 状态：**已定稿 (FINAL)** — 2026-10-21
> 基线文件：`docs/design/baseline/dashboard-layout.html`（只读参照，实现时 1:1 复刻，不得改动）
> 上游基线：`~/.codex/visualizations/2026-10-21-linear-prototype/dashboard-cake-v3.html`（视觉语言来源，同样只读）
> 适用范围：本文档只锁定 **右侧内容区（Dashboard）的 block 分布与规格**。
> 左侧导航结构已在「思路 1 + B」轮次确认，本文档第 3 节一并固化尺寸，避免实现时二次讨论。

---

## 1. 设计 Token（锁死，实现时写入 `src/style.css`）

### 1.1 色彩

| Token | 值 | 用途 |
|---|---|---|
| `--violet` | `#5533ff` | 主色：选中态、按钮、图表主线、进度条 |
| `--violet-soft` | `#eeeeff` | 主色浅底：选中背景、banner 底、tag 底 |
| `--violet-line` | `#ddddff` | 主色浅边：banner 边框、hover 边框 |
| `--lime` | `#ddff55` | 强调点缀：增长 chip（仅浅色模式） |
| `--ink` | `#191b1f` | 主文字 |
| `--ink-2` | `#5a6068` | 次级文字 |
| `--ink-3` | `#939aa4` | 三级文字 / label / 坐标轴 |
| `--line` | `#eceef2` | 通用分隔线、卡片描边 |
| `--page` / `--card` | `#ffffff` | 页面底 / 卡片底 |

图表辅助色（固定，不随主题变）：`#8b78ff`、`#d0ccff`、`#e8e8f2`。
活动流图标底色：`#f4ffd0`(文)/`#e9f7ef`(绿)。

### 1.2 圆角 / 字体 / 间距

| Token | 值 | 用途 |
|---|---|---|
| `--radius` | `14px` | 卡片、panel、banner、side-card |
| `--radius-sm` | `10px` | 输入框、小卡、图标底座 |
| 圆角胶囊 | `99px` | chip、分类标签、迷你进度条 |
| 字体 | `Inter, "SF Pro Text", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | 全局 |
| 基准字号 | `13.5px` | body |
| 字距 | 标题 `-.3px` ~ `-.5px`，正文 `0`（禁止负字距用于正文） |

---

## 2. 整体骨架尺寸

| 区域 | 规格 |
|---|---|
| 侧栏（展开） | `width 220px`，底色 `#fbfbfd`，右描边 `1px --line`，上下内边距 `16px 0` |
| 侧栏（收缩） | `width 56px`，图标格 `44×44`，图标 `20px`，圆角 `10px` |
| 顶栏 topbar | `height 56px`，左右内边距 `0 28px`，下描边 `1px --line`，白底 |
| 内容区 content | `padding 24px 28px 48px`，纵向滚动 |

---

## 3. 左侧导航结构 = 思路 1 + B（定稿，此处固化）

> **方向声明（重要）**：导航分组以本节为准。Supabase `tools.category` 现值与此不一致时，
> **由 DB 迁移向导航对齐，不得反向把导航改回旧分类**。
>
> 「思路 1」= 搜索 + 频率 + 收藏作为底层机制，故顶部固定三项；
> 「B」= 在此之上保留按工具使用方式划分的细粒度抽屉分组，作为浏览维度。

### 3.0 分组与工具映射（唯一权威表）

| 层级 | 项 | 路由 | 对应 `tools.id` |
|---|---|---|---|
| 固定项 | 概览 | `/` | — |
| 固定项 | 最近使用 | `/`（锚点/筛选） | 读 `user_recent_tools` |
| 固定项 | 收藏 | `/`（锚点/筛选） | 读 `user_favorites` |
| 速查参考 | SQL 速查 | `/sql` | `sql-cheatsheet` |
| 速查参考 | Redis 速查 | `/redis` | `redis-cheatsheet` |
| 速查参考 | Docker & K8S 速查 | `/docker` | `docker-k8s-cheatsheet` |
| 速查参考 | Typora 快捷键 | `/typora` | `typora-shortcuts` |
| 数据应用 | 停车收费 | `/parking` | `parking` |
| 数据应用 | Todo | `/todo` | `todo` |
| 数据应用 | 家庭电影 | `/movie` | `movie` |
| 图形工具 | 图片拼接 | `/collage` | `image-stitch` |
| 图形工具 | Pixabay 下载 | `/pixabay` | `pixabay-download` |
| 文本工具 | 字数统计 | `/text-stats` | `word-count` |
| 文本工具 | Chrome 扩展打包 | `/chrome-pack` | `chrome-extension-packaging` |
| 文本工具 | Markdown 标题工具 | `/markdown-heading` | `markdown-heading` |
| 管理面板(admin) | 用户管理 / 角色权限 / 审计日志 | `/admin/*` | — |

迁移后 `tools.category` 目标值：`速查参考`(4)、`数据应用`(3)、`图形工具`(2)、`文本工具`(3)。

### 3.1 视觉与交互规格

顺序自上而下：

1. **Brand 行**：logo `30×30` 圆角 `9px` 紫底白字 `C` + 名称 `14.5px/650` + 汉堡按钮 `28×28`（`margin-left:auto`，三条线图标）。汉堡按钮在收缩态保留并居中。
2. **固定项（不进抽屉）**：`概览` `/`、`最近使用`、`收藏`。
3. **分隔标签**：`工具分组`（`10.5px/600` 大写 字距 `.5px`）。
4. **抽屉分组（B 细粒度）**，每组 header = 圆点 `5×5` + 组名 `12px/600` + 右侧箭头 `12×12`（展开时 `rotate(90deg)`）：
   - `速查参考` → SQL 速查、Redis 速查、Docker & K8S 速查、Typora 速查
   - `数据应用` → 停车管理、Todo、Movie
   - `图形工具` → Image Collage、Pixabay Downloader
   - `文本工具` → Text Statistics、Chrome 扩展打包、Markdown Heading
5. **系统管理（仅 admin 可见）**：组名 `管理面板` → 用户管理、角色权限、审计日志。
6. **装饰性 side-card**：紫色渐变 `linear-gradient(160deg,#5533ff,#7a5cff)`，白字，收缩态隐藏。
7. **用户页脚**：上描边分隔，头像 `22×22` 紫底 + `用户名 · 角色`。

交互规则：
- 收缩态：分组 header 只显示圆点占位（点击=展开侧栏），组内条目平铺为 `44×44` 图标格。
- 抽屉收起：`.nav-group.closed` 隐藏 `.nav-items`，箭头归零度、透明度降至 `.5`。
- 导航项：`padding 8px 10px`、圆角 `9px`、字号 `13.5px`、图标 `16px`、`gap 10px`；子项整体左移 `margin-left 14px`。

---

## 4. Dashboard Block 分布（本文档核心）

内容区共 **8 个 block，纵向单列排布**，块间距见下表 `margin-top`。

| # | Block | 栅格 | margin-top | 内容 | 数据源 | 空状态 |
|---|---|---|---|---|---|---|
| ① | Hero | flex 两端 | `0` | 左：`概览 · Dashboard` `22px/680` + 副标题 `13px --ink-2`；右：时间下拉（装饰） | 静态 | 无 |
| ② | Banner 通知条 | 全宽 flex | `18px` | 图标块 `36×36` 圆角`10px` + 标题`13.5px/650` + 描述`12px` + 右侧 CTA | 静态装饰 | 无 |
| ③ | 搜索 + 分类 | flex `gap 12px` | `18px` | 搜索框 `height 42px` `max-width 480px` 左内边距`42px`；右侧 5 个分类 chip | `tools` + 权限过滤 | 无 |
| ④ | KPI 卡片 ×4 | `grid repeat(4,1fr)` `gap 14px` | `20px` | label `11px/600` 大写 + 数值 `26px/680` + 脚注 chip `11px` | 见 §5 | 数值显示 `0`，脚注 chip 隐藏 |
| ⑤ | 图表行 | `grid 1.5fr 1fr` `gap 16px` | `20px` | 左：面积图（绘图高 `180px` + 7 刻度轴 `10px`）；右：环形图 `128×128` + 4 行图例 | 演示数据 | 整行透明度降至 `0.15`，保留骨架 |
| ⑥ | 收藏 | 全宽 panel | `20px` | 内部 `grid auto-fill minmax(200px,1fr)` `gap 10px`；卡片 `padding 10px 12px` 圆角`10px`，图标座 `32×32` | `user_favorites` × `tools` | **整块隐藏**（`v-if`） |
| ⑦ | 最近使用 | 全宽 panel | `16px` | 同⑥规格 | `user_recent_tools` × `tools` | **整块隐藏**（`v-if`） |
| ⑧ | 底部双栏 | `grid 1fr 1fr` `gap 16px` | `20px` | 左：活动流（行 `padding 13px 18px`，图标块 `32×32`）；右：工具使用占比表（表头 `10.5px` 大写，单元格 `12px 18px`，迷你条 `5×72`） | 演示数据 + `tools` 前 5 | 整行透明度降至 `0.15` |

### 4.1 通用 panel 规格（⑤⑥⑦⑧ 均适用）

```
.panel      background --card / border 1px --line / radius --radius
.panel-head padding 14px 18px / border-bottom 1px --line
            h3 14px/650 ；右侧 .tag 11px 紫色，底 --violet-soft，胶囊 padding 3px 9px
.panel-body padding 14px 18px
```

### 4.2 分类标签（Block ③）

固定 5 个：`全部`(默认 active)、`速查参考`、`数据应用`、`图形工具`、`文本工具`。
规格：`padding 5px 13px`、圆角 `99px`、字号 `12px`、底色 `#f5f5f8`；active 态换 `--violet-soft` 底 + `--violet-line` 边 + `--violet` 字 + `font-weight 600`。
点击行为：等价于把该组名写入搜索框（复用现有 `searchByCategory`）。

### 4.2.1 固定项「最近使用」「收藏」的行为（已定：滚动锚点）

点击侧栏 `最近使用` / `收藏` 不新建路由，而是**滚动到 Dashboard 对应区块**（Block ⑥ / ⑦）：
- 目标 `id`：`#favorites`、`#recent`；用 `scrollIntoView({ behavior:'smooth', block:'start' })`。
- 若目标区块因空状态被隐藏，则不滚动、不报错（保持当前视口）。
- 侧栏高亮仍归 `概览`，这两项只作快捷入口，不参与 `route.path` 匹配。

### 4.3 顶栏（Block 区之外，但同属右侧）

左：面包屑 `Cloud Toolkit / <当前页>`（`13px`，当前页 `--ink/650`）。
右：仅保留头像 `30×30`（主题切换、用户菜单沿用现有实现）。
**v1 去掉 `分享` 与 `新建记录` 两个按钮** —— 无对应行为，空按钮比没有更糟。
`演示数据/空状态` 切换是原型自测工具，工程不实现。
备用规格：ghost `padding 7px 14px` 圆角`9px` 字号`12.5px`；primary `padding 8px 16px` 紫底白字 `600`。

### 4.4 演示数据块的处置（已定：保留静态）

Block ⑤ 面积图与 Block ⑧ 活动流按用户决定**保留静态演示数据**，形态与原型一致。
代价已知悉：与同屏真实 KPI 混排可能引起误读，后续接 `audit_logs` 时一并替换。

---

## 5. KPI 数据源映射（对齐真实 Supabase 表）

实际库中存在的业务表：`parking_info`、`movies_library`、`tasks`、`tools`、`user_favorites`、`user_recent_tools`、`audit_logs`。

| KPI | 标签 | 取值 | 表 |
|---|---|---|---|
| 1 | 工具总数 | 当前用户有权限的工具数 | `tools` ∩ `get_my_tool_permissions()` |
| 2 | 停车记录 | 行数 | `parking_info` |
| 3 | 电影条目 | 行数 | `movies_library` |
| 4 | 待办任务 | 行数 | `tasks` |

脚注 chip 规则：增长用 `--lime` 底（`.chip`），中性/权限类用 `--violet-soft` 底（`.chip.up`），下降用 `#fdf2f2` 底红字（`.chip.down`）。
第一版脚注统一显示「可用 / 本周 / 已归档」等静态文案，待接入 `audit_logs` 后再改真实增量。

> **注意**：原型里的「通讯录」是从 cake-v3 沿用装饰数据，**库中无对应表，工程实现时替换为「待办任务」**。

环形图（Block ⑤ 右）构成 = 上述 KPI 2/3/4 之和，第 4 段固定为「其他 = 0」占位。

---

## 6. 响应式断点

| 断点 | 变化 |
|---|---|
| `> 1024px` | 全规格：KPI 4 列、图表 `1.5fr:1fr`、底部 `1fr:1fr` |
| `≤ 1024px` | KPI 2 列、图表单列堆叠、底部单列堆叠 |
| 侧栏 | 独立于断点，仅由汉堡按钮切换 220px ↔ 56px |

---

## 7. 工程落地映射

| 原型部分 | 目标文件 | 说明 |
|---|---|---|
| Token §1 | `frontend/src/style.css` | 替换 `:root` 与 `.dark` 变量块 |
| 骨架 §2 §3 | `frontend/src/components/AppShell.vue` | 用普通 scoped CSS 复刻，不走 Tailwind 工具类 |
| Block ①–⑧ §4 | `frontend/src/views/DashboardView.vue` | 保留现有 `DASHBOARD_SEARCH_KEY`、`useRecent`、`useFavorites`、`toolsStore` 接线 |
| 路由/分组 | `toolsStore.groupedTools` | 分组名改为 §3 的 4 组，见 §8 待办 |

**暗夜模式：本轮与浅色一并实现**（token 本轮整体重写，一次做完比事后回补便宜）。
底色 `#0C0C0E` + 灰阶 + 紫色强调，**禁止出现绿色**。
要点：`--violet` 在暗底上需提亮（建议 `#8b78ff` 一档）保证对比度；
`--lime` chip 在暗色下改用紫色系等价物，避免荧光绿；图表辅助色与渐变需各自校验，
不得直接沿用浅色档数值。

---

## 8. 定稿遗留项（实施前需处理）

1. ~~DB 分类与定稿分组不一致~~ **已完成 2026-10-21**：
   `supabase/migrations/20261021010000_tool_categories_b_grouping.sql` 已执行到线上库，
   实测返回 `速查参考|4`、`数据应用|3`、`图形工具|2`、`文本工具|3`，组序与 §3.0 一致。
2. ~~`Chrome 扩展打包`、`Markdown 标题工具` 归类修正~~ **已随第 1 条完成**（现均属 `文本工具`）。
3. **KPI 第 4 卡「通讯录」无对应表**，改为 `tasks` 「待办任务」。
4. Block ⑤ 面积图、Block ⑧ 活动流保留静态演示（用户选定，见 §4.4）。
5. **导航显示名以 DB `tools.name` 为准**：侧栏文字来自 `tools.name`，与原型手写标签存在差异
   （原型「停车管理 / Movie / Image Collage / Text Statistics / Typora 速查 / Pixabay Downloader /
   Markdown Heading」↔ DB「停车收费 / 家庭电影 / 图片拼接 / 字数统计 / Typora 快捷键 /
   Pixabay 下载 / Markdown 标题工具」）。实现时按 §3.0 表采用 DB 名称，原型文字视为占位。
   若要改成别的叫法，改 DB 而非改前端硬编码。
6. **`tools.route` 列是死字段**：实测导航路由由 `frontend/src/types/tools.ts` 的
   `TOOL_ROUTE_MAP[tool.id]` 决定，DB 里的 `route`（形如 `tools/xxx`）未被任何代码读取。
   12 个 id 已全部覆盖且与 §3.0 路由一致，故 migration **无需**处理 `route`。
   维护约定：新增工具必须同时加 `TOOL_ROUTE_MAP` 条目 + 路由 + 视图，否则 `toolPath()` 回退 `/`。

---

## 9. 变更记录

| 日期 | 版本 | 内容 |
|---|---|---|
| 2026-10-21 | v1.0 | Dashboard block 分布定稿；基线 HTML 入库 `docs/design/baseline/`；修复导航项缺失基础样式导致的图标撑爆问题 |
| 2026-10-21 | v1.0.1 | 补 §3.0 分组·路由·`tools.id` 权威映射表；明确「DB 向导航对齐」方向；登记导航显示名以 DB 为准；查清 `tools.route` 为死字段（撤销一条误记的待办） |
| 2026-10-21 | v1.1 | 固定项行为定为滚动锚点(§4.2.1)；v1 去掉顶栏两个空按钮；演示数据块定为保留静态(§4.4)；暗夜模式并入本轮；§8 第 1、2 条已由 migration 完成；新增 §10 迁移执行通道 |

---

## 10. Migration 执行通道

不在本文重复维护。运维事实、判定方法、脚本用法与踩坑清单统一见
**[docs/runbook-corporate-network.md](../runbook-corporate-network.md)**。

要点摘要（细节以 runbook 为准）：本机 shell 到 Supabase **是通的**，
只要复用 git config 里那份带域凭据的代理即可 —— 之前两轮「Supabase 被封锁 /
只能走浏览器」的判断都是误判。

- 首选：`sh scripts/supa-sql.sh --file supabase/migrations/xxx.sql`（Management API）
- 兜底：`node scripts/supabase-cdp.mjs sql --file <path>`（已登录浏览器 CDP）
- 需要用户介入的情况：Supabase token 过期、Gitee 凭据失效、或 GitHub 相关操作
  （本网络下 GitHub 不稳定，详见 runbook §3）


# Cloud SaaS Toolkit v2 — UI/UX 设计说明书

> 设计基线：`prototype.html`（ClickUp Activity Bar + Remote.com Sidebar + 腾讯云控制台双层导航）
> 参考源：ClickUp Activity Bar + Remote.com Sidebar + 腾讯云控制台双层导航
> **v2 新 token 统一使用 `--v2-` 前缀**，避免与现有 800+ 处旧 token（`--violet`/`--ink`/`--line`/`--page`/`--card`）冲突。

## 1. 色彩系统


### 1.0 主题切换 CSS 选择器机制

- **浅色主题**：所有 v2 token 定义在 `:root` 伪类下，作为默认值。
- **深色主题**：由 `preferencesStore` 在 `<html>` 元素上挂载 `class="dark"`。
  CSS 使用 `html.dark` 选择器覆写 L2/内容区 token。
  L1 常量不参与覆写，L1 恒暗。
- **实现模板**：
  ```css
  :root {
    --cu-nav-rail-bg: #f9f9f9;
    --v2-content-bg: #f4f5f7;
    /* ... 其余浅色 token */
  }
  html.dark {
    --cu-nav-rail-bg: #1a1d27;
    --v2-content-bg: #0f1119;
    /* ... 其余深色 token */
  }
  ```
- **恒暗命名空间（导航改造后定稿）**：真正恒暗的只有 L1 黑色面板一族 ——
  `--cu-l1-panel-*` / `--cu-l1-item*` / `--cu-l1-badge` / `--cu-l1-glow*`，它们只允许出现在
  `html { }` 规则块内，`:root` 与 `html.dark` 一律不得重声明（`html.dark` 特异度 0,1,1 高于
  `html` 的 0,0,1，一旦重声明恒暗语义就反转）。
  注意 `--cu-l1-rail-*` 这类**尺寸**不属于恒暗集，因此改名 `--cu-rail-width`，避免与机检前缀冲突。
  机检：`grep -nE '^\s*--cu-l1-' frontend/src/style.css` 只允许命中 `html {` 块。
- L1 那条 `#f9f9f9` 沟槽底**不属恒暗集**：它改名 `--cu-nav-rail-bg`，随主题覆写，并与 L2 面板底
  合并成同一个 token。暗色下若仍留 `#f9f9f9`，会在深色 L2 旁边形成一条刺眼亮带。
  黑面板在暗色下保持纯 `#000`（不改成 `#0d0f16`）：与 `#1a1d27` 轨道差 26 级灰阶，边缘仍然清晰，
  且 ClickUp 自己的暗色也是纯黑轨。

### 命名规则

- v2 新壳层所有 CSS 变量统一加 `--v2-` 前缀。
- 旧 token 体系保持不变，12 个工具页 + admin + auth 不受影响。

### 主题无关常量

| Token | 值 | 用途 |
|-------|-----|------|
| `--v2-l1-bg` | #13151f | L1 底色（不随深色/浅色主题变化） |
| `--v2-l1-hover` | #2a2d3a | L1 图标悬停背景 |
| `--v2-l1-icon` | #9a9ead | L1 图标默认色（对比度 ≥4.5:1，WCAG AA） |
| `--v2-l1-icon-hover` | #d9dce6 | L1 图标悬停色 |
| `--v2-l1-icon-active` | #ffffff | L1 图标激活色 |
| `--v2-l1-active-indicator` | #3b82f6 | L1 激活指示条 (左侧 3px) |

### 浅色主题 (L2 + 内容区)

| Token | 值 |
|-------|-----|
| `--v2-l2-bg` | #ffffff |
| `--v2-content-bg` | #f4f5f7 |
| `--v2-card-bg` | #ffffff |
| `--v2-ink` | #17202b |
| `--v2-ink-2` | #505b6b |
| `--v2-label-muted` | #5a6474 |
| `--v2-border` | #667085 |
| `--v2-accent` | #2563eb |
| `--v2-accent-light` | #f0f5ff (hover: `--v2-btn-ghost-hover`) |
| `--v2-radius` | 10px |
| `--v2-radius-sm` | 7px |

### 深色主题

| Token | 值 |
|-------|-----|
| `--v2-l2-bg` | #1a1d27 |
| `--v2-content-bg` | #0f1119 |
| `--v2-card-bg` | #1e2130 |
| `--v2-ink` | #e2e4e9 |
| `--v2-ink-2` | #8b8f9a |
| `--v2-label-muted` | #888d99 |
| `--v2-border` | #667085 |
| `--v2-accent` | #4b82ff |
| `--v2-accent-light` | #1e2a45 |


### 骨架屏 Skeleton Token

| Token | 浅色 | 深色 | 动画 |
|---|---|---|---|
| `--v2-skeleton-base` | #e5e7eb | #252836 | shimmer base→highlight 1.5s ease-in-out infinite |
| `--v2-skeleton-highlight` | #f3f4f6 | #2f3342 | 同上 |

- reduced-motion 时 shimmer 动画停止，直接显示 base 色。

### 语义色（error/success/warning/info）

| Token | 浅色 | 深色 | 用途 |
|-------|------|------|------|
| `--v2-success` | #16a34a | #4ade80 | 成功提示、校验通过 |
| `--v2-warning` | #b45309 | #fbbf24 | 警告、风险提示（浅色 #b45309 对比度 ≥4.5:1，满足 WCAG AA） |
| `--v2-error` | #dc2626 | #f87171 | 错误提示、校验失败 |
| `--v2-info` | #2563eb | #60a5fa | 信息提示（浅色同 accent，深色提亮保证对比度） |

- 每个语义色配套 4 个变体：`-text`（前景）、`-bg`（背景）、`-border`（边框）、`-surface`（大面积底色）。变体值表（浅色/深色）：

| Token | 浅色 | 深色 |
|-------|------|------|
| `--v2-success-text` | #16a34a | #4ade80 |
| `--v2-success-bg` | #f0fdf4 | #052e16 |
| `--v2-success-border` | #86efac | #166534 |
| `--v2-success-surface` | #dcfce7 | #052e16 |
| `--v2-warning-text` | #b45309 | #fbbf24 |
| `--v2-warning-bg` | #fffbeb | #451a03 |
| `--v2-warning-border` | #fcd34d | #854d0e |
| `--v2-warning-surface` | #fef3c7 | #451a03 |
| `--v2-error-text` | #dc2626 | #f87171 |
| `--v2-error-bg` | #fef2f2 | #450a0a |
| `--v2-error-border` | #fca5a5 | #7f1d1d |
| `--v2-error-surface` | #fee2e2 | #450a0a |
| `--v2-info-text` | #2563eb | #60a5fa |
| `--v2-info-bg` | #eff6ff | #172554 |
| `--v2-info-border` | #93c5fd | #1e3a5f |
| `--v2-info-surface` | #dbeafe | #172554 |
- 语义色只用于状态提示（Toast、表单校验、error boundary），不作为正文文字色。
- 正文文字优先使用 `--v2-ink` / `--v2-ink-2`；正文内语义强调可用语义色但需保证对比度 ≥4.5:1。
### 1.1 Token 迁移映射

| 旧 token | 新 token（v2 壳层内） | 行为 |
|---|------|------|
| `--violet` | 无直接替代 | v2 accent 改为蓝色系，不映射旧的紫色 |
| `--ink` | `--v2-ink` | 仅在 AppShellV2 子树内生效 |
| `--line` | `--v2-border` | 同上 |
| `--page` | `--v2-content-bg` | 同上 |
| `--card` | `--v2-card-bg` | 同上 |
| `--accent` | `--v2-accent` | 同上 |
| `--radius` | `--v2-radius` | 同上；工具页 `--radius` 保持现有值不变 |

### 1.2 按钮系统 Token

| Token | 用途 | 浅色 | 深色 |
|---|---|---|---|
| `--v2-btn-primary-bg` | 主按钮背景 | `--v2-accent` | `--v2-accent` |
| `--v2-btn-primary-hover` | 主按钮 hover | #1d4ed8 | #3b82f6 |
| `--v2-btn-primary-active` | 主按钮 pressed | #1e40af | #2563eb |
| `--v2-btn-primary-text` | 主按钮文字 | #ffffff | #ffffff |
| `--v2-btn-secondary-bg` | 次按钮背景 | transparent | transparent |
| `--v2-btn-secondary-border` | 次按钮边框 | `--v2-border` | `--v2-border` |
| `--v2-btn-secondary-hover` | 次按钮 hover | #f4f5f7 | #252836 |
| `--v2-btn-secondary-active` | 次按钮 pressed | #e5e7eb | #1e2130 |
| `--v2-btn-secondary-text` | 次按钮文字 | `--v2-ink` | `--v2-ink` |
| `--v2-btn-danger-bg` | 危险按钮背景 | `--v2-error` | `--v2-error` |
| `--v2-btn-danger-hover` | 危险按钮 hover | #b91c1c | #ef4444 |
| `--v2-btn-danger-active` | 危险按钮 pressed | #991b1b | #dc2626 |
| `--v2-btn-danger-text` | 危险按钮文字 | #ffffff | #ffffff |
| `--v2-btn-danger-border` | 危险按钮边框 | `--v2-error` | `--v2-error` |
| `--v2-btn-ghost-bg` | 幽灵按钮背景 | transparent | transparent |
| `--v2-btn-ghost-hover` | 幽灵按钮 hover | #f4f5f7 | #252836 |
| `--v2-btn-ghost-active` | 幽灵按钮 pressed | #e5e7eb | #1e2130 |
| `--v2-btn-ghost-text` | 幽灵按钮文字 | `--v2-ink` | `--v2-ink` |
| `--v2-btn-ghost-border` | 幽灵按钮边框 | transparent | transparent |
| `--v2-btn-disabled-bg` | 禁用态背景 | #e5e7eb | #2a2d3a |
| `--v2-btn-disabled-text` | 禁用态文字 | #9ca3af | #6b7280 |
| `--v2-focus-ring-color` | 焦点环颜色 | `--v2-accent` | `--v2-accent` |
| `--v2-focus-ring-width` | 焦点环宽度 | 2px | 2px |
| `--v2-focus-ring-offset` | 焦点环偏移 | 2px | 2px |
| `--v2-focus-ring` | 焦点环（简写） | `0 0 0 var(--v2-focus-ring-width) var(--v2-focus-ring-color)` | 同上 |

- 五态顺序：rest → hover → active(pressed) → focus → disabled。
  - **focus**：全局共享 `outline: var(--v2-focus-ring-width) solid var(--v2-focus-ring-color); outline-offset: var(--v2-focus-ring-offset)`。
  - **disabled**：全局共享 `background: var(--v2-btn-disabled-bg); color: var(--v2-btn-disabled-text); cursor: not-allowed`，边框色跟随所在按钮变体语义（secondary 保留边框但降低透明度，ghost 无边框）。
  - **per-variant**：primary 的 active 用 `--v2-btn-primary-active`，secondary 的 active 用 `--v2-btn-secondary-active`，danger/ghost 同理；focus/disabled 为全局共享不需 per-variant token。
- 按钮圆角 `--v2-radius-sm`（7px），高度 32px（小号）/ 40px（默认）。

### 1.3 Dashboard Banner 视觉规格

- **位置**：内容区顶部，`<main>` 内第一条，宽度 100%，不与 Topbar 重叠（Topbar z-index 15，banner 随内容流）。
- **尺寸**：高度固定 48px（含关闭按钮），左侧 type-color border-left 4px + padding 16px。
- **多 banner 策略**：最多显示 1 条最新 active 通知；关闭后若仍有 active 通知，展示下一条。
- **类型差异化**：`maintenance`（黄色）、`announcement`（蓝色）、`new_tool`（绿色）、`alert`（红色）。
- **过渡**: opacity + max-height 300ms ease-out 收起动画。

### 1.4 Z-index 层级体系

| 层级 | z-index | 使用场景 |
|---|---|---|
| Dropdown/Popover | 10 | 下拉菜单、popover、tooltip |
| Sticky | 15 | 粘性表头、Topbar |
| 全宽顶栏 | 20 | GlobalTopbar —— 必须高于副标题栏/L1/L2，否则头像下拉会被副标题栏盖住（面板的 z-index 困在顶栏自建的层叠上下文内部） |
| 顶栏头像浮层 | 30 | GlobalTopbar 头像下拉（`--cu-z-topbar-popover`） |
| Drawer | 55 | 桌面侧边抽屉 + 移动端 L2 侧边抽屉（统一层级） |
| Modal backdrop | 65 | 模态框遮罩（高于 Drawer 55，确保 Drawer 内触发的 Modal 遮罩能覆盖 Drawer） |
| Modal | 60 | 模态框 |
| Command Palette | 70 | 全局搜索 overlay |
| Toast | 80 | 通知提示 |
| Notification banner | 90 | 顶部通知横幅（Topbar 级别的全宽通知条，不同于 DashboardBanner）。Phase 4 实现 |

### z-index CSS Token

| Token | 值 | 用途 |
|---|---|---|
| `--v2-z-dropdown` | 10 | 下拉菜单、popover、tooltip |
| `--v2-z-sticky` | 15 | 粘性表头、Topbar |
| `--cu-z-topbar` | 20 | 全宽顶栏（高于副标题栏/L1/L2） |
| `--cu-z-topbar-popover` | 30 | 全宽顶栏头像下拉 |
| `--v2-z-modal-backdrop` | 65 | 模态框遮罩（高于 Drawer 55） |
| `--v2-z-drawer` | 55 | 侧边抽屉（桌面+移动端统一） |
| `--v2-z-modal` | 60 | 模态框 |
| `--v2-z-command-palette` | 70 | 全局搜索 overlay |
| `--v2-z-toast` | 80 | 通知提示 |
| `--v2-z-notification-banner` | 90 | 顶部通知横幅 |

- 所有 z-index 通过 CSS 变量 `--v2-z-*` 引用，不用硬编码数值。
- Modal(60) > Drawer(55)：典型交互（Drawer 内触发确认 Modal）中 Modal 正确压住 Drawer。
- 移动端 Drawer 与桌面 Drawer 统一使用 `--v2-z-drawer`，不单独设层级。

## 2. 字体排印

| 用途 | 字体族 | 大小 | 粗细 |
|------|--------|------|------|
| L1 tooltip | -apple-system | 12px | 400 |
| L2 分组标题 | -apple-system | 12px | 600 |
| L2 导航项 | -apple-system | 13.5px | 400 (active: 600) |
| L2 子项 | -apple-system | 13px | 400 |
| 内容区 H1 | -apple-system | 17px | 700 |
| 内容区 H2 | -apple-system | 14.5px | 600 |
| 内容区 H3 | -apple-system | 13.5px | 600 |
| 正文 | -apple-system | 14px | 400 |
| Caption/辅助文本 | -apple-system | 12px | 400 |
| Code/等宽 | SF Mono / Menlo | 13px | 400 |
| 面包屑 | -apple-system | 13px | 400 |
| Topbar 标签 | -apple-system | 13px | 400 |

- 无特殊 web font，全部走系统 UI 栈。
- `letter-spacing`：分组标题 `0.7px`（中文）；英文分组标题另行 `uppercase`，中文仅 weight + letter-spacing。其余 `0`。

## 3. 图标系统

- **导航层（L1 / L2 / 全宽顶栏 / 移动端底栏）统一走 `CuIcon`**：24 栅格、`stroke-width: 1.5`、
  `stroke-linejoin/linecap: round`，duotone 元素用实心填充。不再与 lucide 混发 —— 参考稿的导航图标
  半数带填充，lucide 是严格 2px 纯描边，两者并排就能看出粗细与填充差异。
- 图标尺寸：L1 18px、L2 行与顶栏 16px、L2 私有锁 12px、顶栏 chevron 10px、chip 旗帜 14px。
- 内容区（工具页内部）仍可用 lucide，属红色区域，不在本次范围。
- **lucide 全局线宽统一 1.5**：`style.css` Layer 3 未分层区一条 `svg.lucide { stroke-width: 1.5 }`。
  必须无单位（写 `1.5px` 会钉死绝对线宽、不再按 24 viewBox 缩放）、必须限定 `.lucide`
  （裸 `svg` 会把线宽继承进 donut / area / marker 未自报线宽的 path）、必须放在未分层区
  （lucide 的 `stroke-width="2"` 是 presentation attribute，普通规则即可压过，不需要 `!important`；
  但放进 `@layer base` 会被 Tailwind utilities 层压住）。
- 实测偏离：12 / 13px 图标实际渲染线宽约 0.75~0.81px，低分屏偏细，**已接受**，
  不做按尺寸的条件回退（CSS 无法按渲染尺寸选元素，且图标尺寸有 prop 与 CSS 两个来源）。
- 实测结论（勿再重复「修复」）：`Icon.js` 函数体内解构掉 `class` **不会**丢失消费者 class，
  Vue 从原始 `vnode.props` 提取 fallthrough attrs。`<Star :class="{filled}">` 渲染出
  `lucide lucide-star-icon filled`、`<ArrowUpRight class="tc-go">` 渲染出 `... tc-go`，
  `.filled` / `.chev.open` / `.tc-go` 三条规则全部生效。
- 内容区圆角与线宽的完整规范见 [content-radius-spec.md](content-radius-spec.md)。
- 工具图标源收敛为一份：`lib/toolIcons.ts` 的 `getToolIcon(icon, id)`，
  `AppShellV2` 原有的本地 `ICON_MAP` 已删除。`pixabay-download` 与 `image-stitch` 的 DB icon
  同为 `Image`，按 tool id 覆盖成 `download`，不动 DB、不加 migration。
- L1 单项为 55×66 的「图标 + 下方文字」整块可点区，桌面不做 44px 硬性要求。

## 4. 动效规范

| 交互 | 属性 | 时长 | 缓动 |
|------|------|------|------|
| ~~L1 标签浮层展开/收起~~ | — | — | 作废：L1 文字恒显，无展开态 |
| L2 收折 | width | 250ms | ease-out |
| L2 内部内容淡入淡出 | opacity | 150ms | ease-out |
| L1 图标 hover | background | 120ms | ease |
| L2 导航项 hover | background + color | 120ms | ease |
| 通知铃铛闪烁 | opacity 脉冲 | 1.2s 循环 | ease-in-out |
| 移动端 drawer 滑入 | translateX(0→100%) | 250ms | ease-out |
| 移动端 drawer 滑出 | translateX(100%→0) | 200ms | ease-in |
| command palette 出现 | opacity + scale(0.96→1) | 150ms | ease-out |
| command palette 消失 | opacity + scale | 100ms | ease-in |
| 主题/语言 popover | opacity + scale(0.95→1) | 120ms | ease-out |
| 通知角标数字变化 | scale(1→1.2→1) | 300ms | ease |
| 收藏星标闪烁 | scale+opacity | 300ms | ease |

- CSS `@keyframes` 动画用 `@media (prefers-reduced-motion: no-preference)` 包裹，减少模式下不播放。
- `prefers-reduced-motion: reduce` 下所有动效直接跳转，不播放。
- **JS 动画适配**：使用 `useReducedMotion()` composable（基于 `matchMedia('(prefers-reduced-motion: reduce)')`），返回 `ref<boolean>`。Vue `<Transition>` 组件通过监听该 composable 返回值，将 CSS `duration` 覆写为 `0s`。

## 5. L1 显示形态（原「标签浮层」章节作废）

L1 不再有展开态。参考 ClickUp，L1 是 67px 轨道内一块 55px 黑色圆角面板，
每项**图标 18px + 下方 11px 文字恒显**，单项 pitch 66px，整块可点。

- 激活项：图标转实心白、文字 600，图标背后一圈 40px 多彩辉光（`blur(4px)`，
  黑面板 `overflow: hidden` 裁切，blur 配大会溢出并糊到下方标签）。
- 文字超出 49px 槽宽时省略号截断并带 `title` 兜底 —— 与参考稿 "Dashboa…" 同行为；
  英文下 `Workspace` / `Notifications` 必然截断，属预期。
- 角标 16×16、`#e93c81`，**定位基准是面板**（距面板右缘 6px），不是图标盒。
- 原 `labelPanelOpen` 状态、300/150ms hover 定时器、`openLabelPanel`/`closeLabelPanel`
  悬空监听、`--v2-z-label-panel` token 已全部删除。

## 6. L2 收折

- L2 收折后内容区左移占满，宽度由 `--cu-l2-width` 单点定义（桌面与移动端抽屉共用）。
- **收折入口是一对互补控件 + 快捷键**：
  ① L2 头部标题右侧的收起按钮（28×28，`panel-left` 字形，仅桌面显示）；
  ② 页面副标题栏最左侧的展开按钮（28×28，`panel-left-open` 字形，**仅收折态显示**，仅桌面）；
  ③ `⌘\` 两者通用。
  之所以必须成对：L2 一旦收折，整个 aside 不再渲染，它内部的收起按钮也随之消失；
  若没有副标题栏的回展开按钮，鼠标用户收起后就只能靠键盘找回侧栏。
  收起按钮插在标题与 `+ Create` 胶囊之间，胶囊仍是最后一个子元素，
  因此其右缘照旧与行命中区对齐（实测同为 326），不会在右侧留下空洞。
- **单一真值源**：`navVisible = isMobile ? mobileL2Open : !sidebarCollapsed`。
  L2 渲染条件只读它。此前 `sidebarCollapsed` 是持久化的桌面偏好，在移动端是死值，
  导致「移动端点收起没反应」，已一并修掉。
- 移动端不出现这两个按钮：L2 是抽屉，由底部 tab 打开、头部 X 关闭。
- 收折态持久化到 `v2.sidebar-collapsed`，刷新后保持。

## 7. 移动端 (≤768px) — Phase 5（当前未上线）

> ⚠️ 移动端为 Phase 5 范围，不与 Phase 0-4 同步实施。以下为设计目标，当前版本不可用。

### L1 → 底部 Tab Bar

| 位置 | ID | 图标 |
|------|----|------|
| 1 | workspace | 小房子 |
| 2 | search | 放大镜 |
| 3 | notifications | 铃铛 |
| 4 | admin (仅 admin) | 盾牌 |
| 5 | account | user-plus（打开顶栏头像下拉） |

- 高度 48px（`--cu-mobile-tabbar-height`，与 L2 抽屉的 `bottom` 共用同一个 token），底色 `--cu-mobile-tabbar-bg`，安全区 padding 内。
- 当前 active 项用文字转强色；「account」tab 的 active 态跟随头像下拉是否展开。
- 普通用户 4 项均匀分布（无 admin 盾牌），管理员 5 项均匀分布。
- **图标下方加小号文字标签**（11px），解决移动端无 hover 时的不可识别问题。
- 第 5 项**不再走 `select('workspace')`**（那会连带 `router.push('/')` 把用户弹回概览），
  改为打开全宽顶栏的头像下拉；打开前必须先关抽屉，因为抽屉 z-index 55 高于头像浮层 30。
- 主题/语言不在此重复：它们在全宽顶栏右侧，移动端命中区放大到 44×44。

### L2 → 左侧 drawer

- 覆盖模式，z-index `--v2-z-drawer`（55）。
- **`top` 必须让出全宽顶栏**（`var(--cu-topbar-height)`），否则抽屉会盖住搜索胶囊与头像；
  抽屉打开时顶栏降 z 或置 `inert`。
- 背景半透明遮罩。
- 内部结构 = 桌面 L2 完整树（分组可展开收起）。
- **关闭方式**：
  ① 点击遮罩区域
  ② 导航到工具页后自动关闭
  ③ `Esc` 键
  ④ 左滑手势（需判断手势起点在 drawer 内，避免与浏览器后退冲突）
- **无障碍**：drawer 打开时容器设 `role="dialog" aria-modal="true"`，焦点移入 drawer；Tab/Shift+Tab 在 drawer 内循环捕获；背景内容（L1 + 内容区）设 `inert`；关闭后焦点回到触发按钮。
- **内容区 padding**：移动端 `16px 16px calc(var(--cu-mobile-tabbar-height) + 16px)`。
  旧值 32px 小于 48px 的固定 tab bar，会把最后一行永久压住约 16px，已修正。
- 副标题栏在移动端降到 40px（`--cu-mobile-subbar-height`），全宽顶栏仍保持 42px。

## 8. 搜索 Command Palette

- 触发：点击**全宽顶栏中央的搜索胶囊** / `Ctrl+K`。
  胶囊必须是 `<button>` 而不是 `<input>`：`handleKeydown` 在焦点位于输入框内时刻意忽略 `⌘K`，
  做成 input 会导致焦点停在胶囊上时按 `⌘K` 无效。
- 浮层 480px 宽，居中 / 偏右上布局，深色半透明遮罩。
- **定位**：视口水平居中、垂直距顶 15%。
- 输入框顶：placeholder "搜索工具、命令…"。
- 结果列表：分组（工具 / 页面 / 操作），每组 ≤5 条。
- 键盘导航：上下箭头选择，Enter 跳转，Esc 关闭。
- **焦点陷阱**：palette 打开时 Tab/Shift+Tab 在 palette 内循环，Esc 关闭后焦点回到触发按钮。
- **无输入时**：显示最近搜索历史（≤5 条，localStorage key `v2.search-history`）。打开 palette 时自动过滤当前用户已失权的条目。
- **防抖**：输入框 debounce 200ms。
- **范围**：v2 command palette 仅搜索工具名、页面名和操作（元数据），不搜索工具内容。内容搜索为后续迭代。

### 8.1 与 L2 侧栏搜索的关系

- **侧栏搜索**：只过滤当前工作台工具列表（computed 即时过滤，无需 debounce），保留在 Dashboard 内部。
- **全局搜索 (command palette)**：全站索引（工具 + 页面 + 操作），由全宽顶栏中央的搜索胶囊触发。
- 两套搜索不联动、不同步输入，职责明确分离。
- **侧栏搜索仅在 workspace L2 渲染**，admin/notifications 不显示侧栏搜索框。

> 导航改造后两者职责不变，但入口位置换了：全局搜索从 L1 放大镜移到顶栏胶囊；
> L2 侧栏就地过滤框**保留**（它过滤的是当前分组树、保留分组结构，与 palette 的
> 「全量工具名匹配后跳转」不等价，删掉即能力回退）。
> 已知空洞：palette 目前只索引 `allowedTools`，不含管理页与通知页，
> 因此它**不能**当作管理台的兜底可达路径。

## 9. 通知交互

- **角标语义**：角标数 = 未读通知数（等价于"未读且未关闭的通知数"）。
- **点击铃铛** → L2 切换到通知上下文 → 路由 `/notifications`。进入通知中心后，当前视口内可见项自动标记已读，其余需滚动/hover 时标记已读；不使用全局 markAllRead。角标实时同步为剩余未读数。通知列表展示全部未关闭通知（含已读）。
- **返回 workspace** → L2 还原 workspace 内容，铃铛角标从 `useNotifications` 同步。
- **Dashboard banner**：关闭横幅 = 同时置 `dismissed=true` 和 `read=true`（黑名单模型）；若该条此前未读，未读角标同步减一；若此前已读（通过通知中心已标记），仅执行 dismiss，角标不受影响（幂等）。
- **通知中心页面**：进入通知中心后当前视口内可见项自动标记已读，滚动/hover 时标记其余项，角标同步递减。通知列表展示全部未关闭通知（含已读），无需手动"全部标记已读"。
- **用词规范**：全文统一使用"关闭（dismiss）"，不再混用 dismiss 与"已关闭"两个词。

## 10. 主题/语言偏好弹窗

**已作废**：不再有「偏好弹窗」。主题与语言在全宽顶栏右侧各占一个 16px 图标位，
**一键直接切换**，不经过弹窗；`⌘\` 与顶栏第三个图标负责侧栏收折。

顶栏右侧唯一保留弹窗的是头像下拉（`修改密码` / `退出登录` + 角色标签），
关闭方式四种：再次点击头像、`Esc`（走 escStack）、导航到新页面、点击组件外部。
「点击外部关闭」是本次新补的能力，此前 v2 从未实现。
- 分组显示：
  - **外观**区域：太阳图标 + "日间模式" / 月亮图标 + "暗夜模式"（toggle 样式）
  - **语言**区域：Globe (Lucide 16px) + "中文" / "English"（toggle 样式）
- 切换即时生效，不重载页面。
- 深色主题下 popover 背景跟随 L2 深色 token。
- **语言 toast**：首次切 English 显示一次性 toast（"当前仅界面框架支持英文，工具内容暂为中文"）；localStorage 记录 `v2.lang-toast-dismissed`，切回中文不触发。

## 11. 空状态

| 场景 | 图标 | 标题 | 描述 | 操作 |
|------|------|------|------|------|
| 无工具权限 | ShieldBan | 暂无可用工具 | 你的账号尚未被授予任何工具的访问权限 | 联系管理员 |
| 无通知 | BellOff | 暂无通知 | 系统没有新的通知消息 | — |
| 无最近使用 | Clock | 你还没有使用过任何工具 | 浏览工具页面后，这里将显示最近使用记录 | 浏览工具 |
| 搜索无结果 | SearchX | 未找到匹配的搜索结果 | 试试换个关键词 | 清除搜索 |
| 搜索权限受限 | ShieldOff | 该功能仅限管理员使用 | 当前账号无此权限 | 关闭搜索 |
| 收藏为空 | Star | 还没有收藏任何工具 | 点击工具旁的星标即可收藏 | 浏览工具 |
| 管理台子页无数据 | Inbox | 暂无数据 | 当前没有待处理的项目 | — |
| 工具分组因权限全隐藏 | — | — | 该分组在 L2 直接不渲染，不留空位 | — |
| 用户管理为空 | Users | 暂无用户数据 | 可通过右上角"新建用户"添加 | 新建用户 |
| 角色权限为空 | Shield | 暂无角色 | 点击右上角创建第一个角色 | 创建角色 |
| 审计日志为空 | ScrollText | 暂无审计记录 | 管理操作发生后将在此记录 | — |
| 数据管理子页为空 | Database | 暂无数据 | 可通过右上角按钮新增或导入 | — |
| 通知管理为空 | BellPlus | 暂无通知 | 点击右上角发布第一条通知或创建草稿 | 发布通知 |

- 空状态统一使用 `EmptyState.vue` 组件，props：`icon` + `title` + `description` + `action?: { type: 'route' | 'emit' | 'external'; payload?: string; label?: string }`。
  - `type='route'`：路由跳转（如"浏览工具"→`/`）
  - `type='emit'`：触发父组件事件（如"关闭搜索"→关闭 command palette）
  - `type='external'`：唤起外部渠道提示（如"联系管理员"→纯文本提示）
- "工具分组因权限全隐藏"场景不渲染 EmptyState（L2 直接不渲染该分组）。
- 空状态容器加 `role="status"`，描述加 `aria-label`。

## 12. 可访问性

- 所有图标按钮有 `aria-label`。
- L1/L2 导航支持 Tab 键遍历，焦点环 `outline: 2px solid var(--v2-focus-ring)`（token `--v2-focus-ring` = `--v2-accent`，offset 2px）。
- `role="navigation"` 标在 L1、L2 容器上。
- 收折/展开状态有 `aria-expanded`。L2 上下文切换加 `aria-live="polite"`。
- 通知角标区域加 `aria-live="assertive"`。
- 搜索结果区加 `role="status"` + `aria-live="polite"`。
- `<body>` 顶部加视觉隐藏 skip link：`<a href="#main-content">跳到主内容</a>`，内容区容器 `id="main-content"`。独立顶级路由（如 `/change-password`）页面也需提供相同 `id="main-content"` 锚点。
- L2 active 导航项：左侧 3px accent 条 + 背景 accent-light（hover 时复用 `--v2-btn-ghost-hover`）。

- Dashboard 工具卡片 grid：桌面 3 列、平板 2 列、移动 1 列，min-height 120px，hover 提升阴影，标题 2 行截断。
- drawer/popover 关闭后焦点回到触发按钮。

## 13. 错误状态

### 13.1 全局错误

| 场景 | 用户所见 | 交互 |
|------|---------|------|
| 登录失败（密码错） | toast 提示 "用户名或密码错误" | 用户重新输入 |
| 连续 3 次密码错误 | 登录表单内联提示 "连续输入错误次数过多，请稍后再试或联系管理员"，输入框禁用 30s | 30s 后自动解除禁用，或点击 "联系管理员" 获取帮助 |
| 网络不通（Supabase 不可达） | 全局顶部静默指示条（灰色）："网络连接异常，部分功能不可用" + 重试按钮 | 重试后仍失败，显示离线模式提示 |
| 会话过期 | 弹窗提示 "你的登录已过期，请重新登录"，不可跳过 | 点"重新登录"→跳转 `/login` |
| 工具操作失败 | toast 提示具体错误 + 恢复建议 | 自动重试一次 |
| 数据加载超时 | L2 / 内容区 显示 skeleton 骨架屏 → 超时 10s 后显示"加载失败" + 重试 |
| 管理员重置密码 | 模态框提示 "你的密码已被管理员重置。管理员将通过线下方式（IM/当面）告知新密码。" + "知道了"按钮 | 点"知道了"后登出并跳转登录页 |
| 账号审批中 | 登录表单内联提示 "你的账号正在审批中，请耐心等待" | 用户等待管理员审批 |
| 注册被拒绝 | 登录表单内联提示 "你的注册申请未被通过：{管理员填写的拒绝原因}。如有疑问请联系管理员"；并显示 "重新申请" 按钮 | 用户可点击 "重新申请" 将申请重置为待审批 |
| 账号已注销 | 登录表单内联提示 "账号已注销" | 用户无法继续操作 |
| 拒绝删除最后一名管理员 | 弹窗提示 "无法删除最后一名管理员" | 返回，不执行操作 |
| 拒绝移出最后管理员的角色绑定 | 弹窗提示 "无法移出该管理员的角色绑定，系统至少保留一名管理员" | 返回，不执行操作 |
| 拒绝编辑 admin 角色清空权限 | 弹窗/disabled + tooltip "无法使管理员角色权限为空" | 编辑抽屉中对应 checkbox disabled |
| 拒绝删除仍有用户绑定的角色 | Modal 确认弹窗 disabled（"仍有 N 个用户绑定此角色"） | 删除按钮 disabled + tooltip |
| 拒绝删除 admin 角色（含 last-admin 保护） | Modal 确认弹窗 disabled（"无法删除，会导致管理员数量归零"） | 删除按钮 disabled + tooltip |

### 13.2 错误边界

- 每个 `<RouterView>` 外层包裹 `onErrorCaptured` 的 error boundary。
- 渲染错误时：显示"页面加载失败"占位 + 重试按钮 + 错误描述。

## 14. 加载骨架屏 (Skeleton)

- Skeleton token：`--v2-skeleton-base`（浅色 #e5e7eb / 深色 #252836）、`--v2-skeleton-highlight`（浅色 #f3f4f6 / 深色 #2f3342）。shimmer 动画沿 base → highlight 渐变扫过。

| 区域 | 骨架 |
|------|------|
| L2 工具分组 | 5 行浅灰条（宽 60%/80%/90%/70%/85%）+ shimmer 动画 |
| 内容区 Dashboard | 4 个卡片骨架（圆角 10px，高 120px） |
| 工具页 | 内容区全宽骨架条 + shimmer |
| 管理台表格 | 表头固定 + 5 行数据骨架 |

## 15. 离线体验

- 离线状态监听由 `AppShellV2`（`useOnline` composable）统一管理，`Topbar` 通过 prop (`offline: boolean`) 接收状态并渲染静默灰色指示条："你当前处于离线状态"。
- `localStorage` 的 recent/favorites/theme 离线仍可用。

## 16. 收藏星标按钮

- 每个工具卡片右上角显示星标图标（空心/填充）。
- 点击切换收藏状态，填充星闪烁动画 300ms。
- L2 侧栏收藏区与卡片星标状态同步。

## 16.1 L1 底部 Popover 互斥规则

- **同一时间只允许一个 L1 底部 popover 打开**（AvatarPopover 或 Preferences popover）。
- 打开新 popover 时自动关闭已打开的旧 popover。
- 两者均通过 Esc 关闭，焦点回到对应的触发按钮。
- **标签浮层互斥**：L1 顶部标签浮层打开时，底部 AvatarPopover / Preferences popover 任一打开即自动关闭标签浮层；反之，打开标签浮层也会关闭已打开的底部 popover。同一时间只允许一个 L1 弹出层存在。

## 17. Avatar Popover 组件规范

- 触发：点击 L1 底部用户头像。
- 位置：头像上方弹出（alignment: start），宽 200px，与 L1 左侧对齐，避免遮挡右侧内容区。
- 内容：显示名称 + 用户名、"修改密码"按钮（→ `/change-password`）、"退出登录"按钮（红色警示色）。
- 键盘：`Esc` 关闭，焦点回到头像。

## 18. Toast 组件规范

- 位置：视口顶部水平居中，距顶 20px。
- 宽度：自适应，最大 480px。
- 类型：info（蓝）、success（绿）、warning（黄）、error（红）。
- 自动消失 4s，`role="alert"`。
- 多条 toast 垂直堆叠，最多 3 条。

## 19. 通知管理表单

- `expires_at` 日期选择器：默认 30 天后，支持"永不过期"复选框（勾选后日期选择器 disabled）。
- 表单布局：标题 + 内容 textarea + 类型选择（maintenance / new_tool / announcement / alert）+ 过期时间行 + 保存草稿 / 发布 / 取消 按钮。新建通知默认存为 draft，点击"发布"后将状态置为 published。
- 类型行为：`maintenance`（维护公告，Dashboard banner 展示更醒目的黄色 border-left 提示）、`new_tool`（新工具上线通知）、`announcement`（一般公告与系统事件，如审批通过/注册被拒等）、`alert`（紧急告警，Dashboard banner 展示红色 border-left 提示，可选）。


## 20. 通知过期触发机制

- `expires_at` 字段为后台检查手段，不实时触发状态变更。
- 读取时过滤（`expires_at is null or expires_at > now()`）在 RLS 策略 `users_read_published` 中实现。
- 定期清理：pg_cron 任务每日将 `published`/`unpublished` 且 `expires_at < now()` 的通知标记为 `archived`（pg_cron SQL 调度执行，非 Edge Function；此任务不影响用户实时体验）。
- 即时语义：RLS 查询级过期 > 触发式标记，用户感知即过滤。

## 21. Modal vs Drawer 使用标准

| 场景 | 组件 | 原因 |
|---|---|---|
| 简单确认（删除/停用/批准） | Modal（`role="alertdialog"`） | 阻断式决策，需用户明确选择 |
| 表单编辑（新建/编辑停车场、角色、通知） | Drawer（右侧滑入，w 520px） | 长表单、地图嵌入，需保留背景上下文 |
| 用户创建成功回显 | Modal | 临时展示凭据，阻断防止误关闭 |
| CSV 导入 | Drawer（含预览步骤） | 多步骤流程 |

- Modal 居中、max-w 480px，背景遮罩 `rgba(0,0,0,0.5)`。
- Drawer 顶对齐、w 520px（90vw 移动端），背景 `--v2-l2-bg`，打开时挂 `aria-modal="true"`。

## 22. 管理台页面级交互规格

> **已知限制**：v2 管理台默认落地页为数据管理（`/admin/data`），暂无管理总览仪表盘（如待审批用户卡片、最近审计事件摘要等一屏概览）。后续版本扩展。

### 22.0 管理子页面通用规则

- 所有创建/编辑走右侧 Drawer（w 520px）或 Modal（确认类弹窗）。
- 所有删除操作（用户逻辑删除除外）走 Modal 确认弹窗，不可撤销。
- 所有列表支持搜索和排序（默认按创建时间倒序）。
- 管理子页面间切换通过 L2 管理台导航项或顶部 Tab 行（页面内部导航，保留）。

### 22.1 用户管理

- **列表布局**：表格（滚动容器 `overflow-x-auto`），列包含用户名、显示名称、状态标签、注册时间、操作按钮组。
- **状态筛选**：顶部 Tab 行（全部 / 待审批 / 已批准 / 已拒绝 / 已注销），默认"待审批"。
- **状态标签**：pending 黄、approved 绿、rejected 红、deleted 灰。
- **操作按钮组**（按状态动态显示）：
  - pending：审批通过（绿，点击后弹出角色多选器，至少选择一个角色才能确认提交） / 拒绝（红，弹出必填 `reject_reason` textarea）
  - approved：重置密码 / 编辑角色 / 逻辑删除（红，确认弹窗）
  - deleted：恢复用户 / 查看详情
- **恢复已删除用户**：点击"恢复"→ 确认弹窗"确定恢复该用户吗？用户将回到原状态"→ 成功后 refresh 列表。
- **创建用户**：右上角"新建用户"按钮 → 抽屉表单（用户名、显示名称、初始密码、角色选择）。提交成功后弹出"创建成功"模态框，显示用户名 + 初始密码 + 复制按钮（密码仅此一次可见），并提示管理员通过线下方式（IM/当面）告知用户。若管理员或用户丢失初始密码，可通过"重置密码"功能重新生成新密码（新密码同样一次性可见）。

### 22.2 角色权限

- **角色列表**：卡片 grid（每卡片含角色名、工具授权数、绑定的用户数），悬停显示删除按钮（仍有用户绑定时禁用）。
- **创建/编辑角色**：点击卡片 → 右侧抽屉。名称输入 + 工具权限矩阵（每个工具一行：工具名 + view checkbox + edit checkbox）。权限矩阵规格：① 容器固定高度（max-h-[60vh] overflow-y-auto），超出滚动不撑开抽屉；② 列="工具名"+"查看"+"编辑"，编辑列仅在 `writable=true` 的工具行显示 checkbox，`writable=false` 工具行编辑列显示 `—`（disabled + tooltip "此工具为只读"）；③ more 工具行编辑 checkbox 置灰效果。删除角色需确认弹窗 "确定删除角色 {name} 吗？此操作不可撤销"；仍绑定用户的角色删除按钮 disabled + tooltip "仍有用户绑定此角色"；last-admin 检查覆盖角色删除及编辑 admin 角色掏空权限场景。
- **删除角色**：仍有用户绑定时按钮 disabled，tooltip "仍有用户绑定此角色"。

### 22.3 审计日志

- **列表**：表格，列 = 操作人 / 操作类型 / 目标类型 / 目标 / 时间 / 展开详情。默认倒序。
- **筛选**：顶部操作类型下拉，按分组列出：用户操作（创建/审批/拒绝/删除/恢复/重置密码）、角色操作（创建/编辑/删除/分配）、数据操作（创建/编辑/删除-省市/商场/停车场）、通知操作（发布/编辑/删除/撤销）、全部。默认"全部"。
- **详情展开**：点击行展开 metadata（before/after JSON diff），显示 IP。
- **分页**：底部 pageSize=20 的分页条，显示"第 X 页 / 共 Y 页"和"共 Z 条".

### 22.4 数据管理

- **子导航**：顶部 Tab（省市行政区 / 商场管理 / 停车场管理）。
- **省市行政区**：表格 + 搜索框 + 导入按钮（CSV 导入）。导入流程：①文件选择 → ②前 5 行预览抽屉（确认列映射）→ ③冲突策略选择（跳过/覆盖/报错）→ ④执行导入 → ⑤结果摘要（成功 N 条，跳过 M 条，失败 K 条及原因）。导入后通过新增/编辑按钮逐条维护。编辑行内或抽屉表单（省/市/区/邮编/拼音）。
- **商场管理**：表格 + 新建/编辑/删除 + 停车场关联计数。删除确认弹窗 "确定删除 {name} 吗？该商场有 N 个关联停车场，删除将级联移除"。编辑抽屉表单（商场名、所属行政区级联选择、地址、备注）。
- **停车场管理**：表格 + "新建停车场"按钮。新建走停车 V2 表单流程。表格列：名称/商场/楼层/区域/收费标准/状态/操作（编辑/停用/删除）。停用确认弹窗 "确定停用该停车场吗？停用后所有用户将无法看到此记录"；删除确认弹窗 "确定删除 {name} 吗？N 条收藏记录将同步清理"。

### 22.5 通知管理（页面标题：通知管理）

- **通知列表**：表格（标题 / 类型 / 发布时间 / 过期时间 / 状态 / 操作）→ 操作包括编辑/删除/撤销。
- **发布新通知**：右上角"发布通知"按钮 → 抽屉表单（标题 + 内容 textarea + 类型选择 + 过期时间行）。
- **编辑/删除/撤销**：编辑回填原表单；删除确认弹窗（软删除通知行 + 级联 dismiss 所有 `user_notification_reads`）；撤销确认弹窗（通知状态 published→unpublished，已读用户的历史记录保留，未读用户不再看到该通知；unpublished 通知在 admin 列表中以灰色标签标记，hover tooltip 显示"已撤销于"时间戳）。

## 23. Change-Password 页面

- 路径 `/change-password`，不绑定 L1 上下文。
- 全屏居中卡片布局：旧密码 + 新密码 + 确认新密码 + 提交按钮。
- 成功后：toast "密码修改成功，请重新登录" → 1.5s 后登出跳转 `/login`。

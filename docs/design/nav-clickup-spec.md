# ClickUp 导航 1:1 复刻 —— 实施规格（定稿 v4）

> 本文件是导航改造的唯一实施规格。参考素材见 `docs/design/clickup-ref/`。
> 上游文档：[spec.md](spec.md)、[uiux.md](uiux.md)、[PRD.md](../PRD.md)。

## 0. 坐标基准

参考原图 `clickup-reference-full.png` 为 1600×1006，含 7px 白边 + 1px `#e2e2e2` 窗口框。
app 视口实为图像 x=8…1591 / y=9…996（1584×988）。

**锚点表（§1）是规范事实源，图片只是佐证。** 需要复现某个数值时以 §1 为准，
不要反过来用像素测量去推翻已定稿几何 —— 原图带用户自绘的红色标注框与 Mobbin 演示数据，
测量极易被污染。导航区的测量请改用 `clickup-nav-only.png`（见 §9）。

**本文所有坐标一律为视口相对**，原点 = app 视口左上角。换算：视口值 = 图像值 − 8 / − 9。

那条窗口框不复刻，不给 app 加 border-top。

## 1. 定稿几何（1440×900 桌面预演）

```text
顶栏    y 0..41   高 42（y=41 为 1px #e9e9e9 下边框）
L1 容器 x 0..66   宽 67 = 66 轨 + 1 border-right
  黑面板 x 5..59  宽 55，radius 8，bg #000
  接缝   x 66    1px #e9e9e9 —— 归 L1 的 border-right
L2 容器 x 67..347 宽 281 = 268 内层 + 1 border-right + 12 滚动条沟槽
  内层   x 67..334
  缝     x 335   1px #eaeaea —— L2 自己的 border-right（与 x=66 是两条不同的缝）
  沟槽   x 336..347 —— 由 padding 提供 + 隐藏滚动条（见 §1.1 第 3 条的实施期修正）
内容    x 348..

行命中区 x 75..325（左缩进 8 / 右缩进 9），高 29，pitch 32，radius 6
主行：padding-left 10 → icon 左 x85（16px）→ gap 12 → text 左 x113
子项：引导线绝对定位 left 17 → x92（= 父图标中心）；padding-left 34 → icon 左 x109；gap 12 → text 左 x137
黑胶囊 82×29，右缘 x325（与命中区右缘同一条线）
搜索胶囊 316×32，视口水平居中
分隔线 margin 0 13（→ x80..321）
L2 头部高 46，标题 padding-left 14（→ 文字左 x81）
chip 左缘 x75，距底 12
```

### 1.1 三条几何护栏

缺任意一条，内容左边界就会从 348 变成 349 / 350 / 360：

1. 全局 `box-sizing: border-box`（Tailwind preflight 已提供），不得局部改回 `content-box`。
2. L2 **不写** `border-left`。接缝那条线只归 L1 的 `border-right`，两边都写会变成 2px 且整列右移 1px。
3. 12px 沟槽由 `.v2-l2` 的 `padding-right: var(--cu-l2-gutter)` 提供，滚动容器内的原生滚动条**显式隐藏**
   （`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`）。

> **实施期修正**：本条原写「沟槽只由 `::-webkit-scrollbar { width: 12px }` 产生，不得再叠 padding」。
> 实机验证这台 Chromium 上自定义滚动条**不保留布局宽度**（`clientWidth` 等于全宽），
> 依赖它会让行命中区从 251 变成 263。改为 padding 提供沟槽 + 隐藏滚动条后：
> 行宽恒为 251、不受内容多少影响，且与参考稿一致（参考稿沟槽里本来就没有滑块）。

同理，行命中区「pitch 32 里画 29 高的胶囊」由 `padding: 1.5px 10px` +
`background-clip: content-box` 实现，因此不需要 `--cu-nav-row-active-height` 这个 token。

## 2. 顶栏 `components/v2/GlobalTopbar.vue`

bg `#fdfdfd`，高 42，`flex-shrink: 0`，必须是 `.v2-shell` 后代（保住 `style.css` 的
`.v2-shell :focus-visible` 焦点环），不用 Teleport。

| 区块 | 规格 |
|---|---|
| workspace 胶囊 | `#efefef` / 138×30 / radius 6 / padding-left 8 / gap 8；内含 18×18 radius 5 品牌块（`brand-mark.svg`，`aria-hidden`）+ `Taulko` 14px/500 `#202020` + 10px chevron `#8b8b8b` |
| 左二 calendar | 16px `#8b8b8b`，距胶囊 10px —— 静态 |
| 搜索胶囊 | 固定宽 316×32、视口居中（`grid-template-columns: 1fr auto 1fr`）；radius 16、bg `#fff`、border 1px `#ebebeb`；放大镜 16 `#8f8f8f` + `搜索` 14 `#8f8f8f` + `⌘K` 12 `#b9b9b9` + 右端 20px 品牌锚点 `#5533ff`。整颗是 `<button>` |
| 右侧图标 | **2 个** 16px，槽宽 27px，静息无底色、hover `#f0f0f0` radius 6，色 `#8b8b8b`；顺序 = 主题 / 语言；padding-right 12 |
| 头像 | 25×25 圆 `#2d2d2f` 白字 11px + 右下 7×8 在线点 `#289966`（1px 白描边）+ 10px chevron；下拉含改密 / 登出 / 角色标签 |

**workspace 胶囊点击语义**遵守 spec.md §7.1：仅在当前不在 workspace 路由时 `push('/')`，否则路由不变。

**搜索胶囊必须是 `<button>` 而非 `<input>`**：`handleKeydown` 在焦点位于输入框内时刻意忽略 `⌘K`，
若做成 input，焦点在胶囊上按 `⌘K` 会无效。

接口：

```ts
defineProps<{ avatarOpen: boolean; username: string; isAdmin: boolean;
              theme: ThemeMode; locale: Locale; navVisible: boolean }>()
defineEmits<{ toggleTheme:[]; toggleLocale:[]; toggleAvatar:[]; changePassword:[];
              logout:[]; openSearch:[]; toggleNav:[] }>()
```

`avatarOpen` 状态留在 `AppShellV2`，本组件只转发。

## 3. L1 `components/v2/PrimaryRail.vue`

容器 67px bg `--cu-nav-rail-bg`，`border-right: 1px solid var(--cu-seam-1)`，`padding: 0 6px 4px 5px`。
黑面板 55px / radius 8 / bg `#000` / `box-shadow: 0 0 4px rgba(0,0,0,.14)` / `overflow: hidden`
/ 顶端压在顶栏那条 1px 线上 / 底端距 app 底 4px / 纵向 padding 8。

| 项 | 规格 |
|---|---|
| 单项 | pitch 66；flex column 居中；padding 11 0；图标 18；gap 10；文字 11px / line-height 16 / max-width 49 / nowrap+ellipsis + `title` |
| 静息 | 图标与文字 `#cdcdcd`，文字 500 |
| hover | `#efefef` |
| 激活 | 图标实心白；文字 `#fff` 600；辉光 40×40 居中图标，`conic-gradient(from 210deg,#3f7fdf,#7c5cff,#e5407e,#b7513a,#3f7fdf)`，`blur(4px)` |
| 徽标 | 16×16 / radius 8 / bg `#e93c81` / 白 11/700；**定位基准是面板**（距面板右缘 6px）。写成相对图标盒的 `right:-6px` 会被 `overflow:hidden` 裁掉 |

`blur` 必须是 4：`blur(10)` 的有效光晕直径约 60px，会溢出 55px 面板并糊到下方标签。

项目：工作台 / 通知 / 管理台（admin）。底部固定槽 = 静态 Invite。
active 判定为纯 `l1Context === 'workspace'`。

## 4. L2 `components/ContextSidebar.vue`

```text
.v2-l2        width:281px; box-sizing:border-box; border-right:1px var(--cu-seam-2);
              display:flex; flex-direction:column; overflow:hidden;
              background:var(--cu-nav-rail-bg)
  .v2-l2-head    width:280px; padding:0 21px 0 14px; height:46px; flex-shrink:0
  .v2-l2-search  width:280px; padding:0 21px 0 8px;  flex-shrink:0
  .v2-l2-scroll  flex:1; min-height:0; overflow-y:scroll; padding:0 9px 12px 8px
                 ::-webkit-scrollbar{width:12px}  thumb 默认透明
```

`280 = 268 内容 + 12 沟槽`，`281 = 280 + border-right 1`。头部与滚动视口共用同一个 280px 列，
黑胶囊右缘与行命中区右缘自动对齐。

Firefox 拿不到 12px 定制滚动条 → 接受偏离，写 `scrollbar-width: thin` 兜底。

| 元素 | 规格 |
|---|---|
| 头部 | 标题 16px/600 `#1b1b1b`；右侧黑胶囊 82×29 radius 6 bg `#1f1f1f` 文字 13/600 白 —— 静态 |
| 搜索框 | 高 28 / radius 6 / bg `#fff` / border 1px `#ebebeb` / 放大镜 16 / 文字 14 `#5f5f5f`。`l2SearchQuery`、`filteredGroups` 逻辑不动 |
| 行 | 命中区左右内缩 8/9，高 29，radius 6，`padding: 0 10px`，图标 16，gap 12，文字 14 `#5f5f5f`；hover `#f0f0f0`；激活 bg `#eaeaea` + 文字 `#1b1b1b`/500。**删除现有 3px 左指示条与紫底**，否则与 L1 辉光打架 |
| 行内装饰 | 尾部计数 12px `#909090` 行内右缩进 10；弱化副标题 ` - {{ tool.category }}` 14px `#aaaaaa`，只在「最近使用」「收藏」渲染；私有锁 12px 实心，映射 `data_scope === 'private'`，紧贴名字之后 |
| 分组标题 | 13px `#5f5f5f` 普通字重、非大写、无字距，pitch 32，padding-left 8；**不放 chevron 箭头** |
| 组 `+` 按钮 | 21×21 radius 6 bg `#efefef` 图标 14 —— 静态 span |
| 子项 | 容器 `position: relative`；引导线绝对定位 `left: 17px`，1px `var(--cu-seam-2)`，随组起止不贯穿列表；子项 `padding-left: 34px`，图标 16，gap 12 |
| 分隔线 | 1px `var(--cu-seam-1)`，`margin: 0 13px` |
| `••• More` | 静态，弱化色 + 与标题行不同缩进，不放进可点 button 内 |
| 底部 chip | min 101×26 / radius 6 / bg `#fff` / border 1px `#e8e8e8` / padding 0 8 / 旗帜图标 14 / 文字 13 `#616161`；左缘 x75、距底 12；N=0 不渲染；是 `<button>` 不是 `<a href="#">` |

**分组标题 DOM 定式**：`<div class="v2-l2-group-header">` 内一个真 `<button>`（整行宽，负责折叠）
+ 装饰用 `<span aria-hidden="true" tabindex="-1">`。不得把装饰元素做成 `<button>` 塞进可点 `<button>`
（interactive 嵌 interactive，HTML 非法）。

**chip 点击逻辑**：

```ts
if (isGroupCollapsed('__favorites__')) toggleGroup('__favorites__')
await nextTick()
favoritesGroupEl.value?.scrollIntoView({ block: 'nearest' })
```

必须条件展开而非 toggle（默认全展开，直接 toggle 会反而折叠），且必须 `await nextTick()`
（子项 `v-if` 下一帧才进 DOM）。

## 5. 静态元素与弱化规则

`workspace 胶囊下箭头`、`顶栏 calendar`、`L2 黑胶囊 + Create`、`••• More`、`组标题右侧 +`、
`L1 底部 Invite 槽`。

统一策略：`<span>`/`<div>` 而非 `<button>`、`aria-hidden="true"`、`tabindex="-1"`、无 hover、
`cursor: default`、`pointer-events: none`、不进 tab 顺序。

`#` 频道前缀因没有任何宿主行，彻底不渲染。

**弱化只用在 `+ Create` 胶囊一处，不做统一降透明度** —— 这是实测否决的结果：

| 元素 | 不弱化的理由 |
|---|---|
| 顶栏 calendar | 本身 `#8b8b8b` vs 顶栏仅 3.35:1，再乘 .55 只剩 **1.83:1**，等于看不见，保留剪影的目的落空 |
| L1 `Invite` 槽 | 用的是 `.v2-l1-static`，与 `.v2-static` 不是同一个类；`#cdcdcd` 压纯黑有 21:1，乘 .55 会跌到 **4.3:1**，破 uiux.md 的 4.5:1 要求 |
| 分组 `+` / `••• More` | 分别 1.09:1 / 已用弱化字色，与参考稿一致，本身不像主操作 |

`+ Create` 胶囊：`--cu-static-opacity` 亮色 `.72`（等效底色 vs 侧栏 **6.35:1**，可见但退居次要）、
暗色 `1`。暗色不降透明度，改把 `--cu-black-pill-border` 提到 `#6a6e80`（vs rail **3.33:1**）：
原先 `#2a2d3a` 压 `#1a1d27` 只有 1.23:1、边框 1.56:1，胶囊几乎不可见；
「描边而非实心」同时承担可见轮廓与「这不是按钮」的信号。

`title` 提示只加在**可交互**元素上（主题、语言、L2 收起按钮、副标题栏展开按钮）。
静态元素带 `pointer-events: none`，浏览器不会为其显示 tooltip，因此不给它们挂 `title`。
注意 `.v2-static` 在 `ContextSidebar.vue` 与 `GlobalTopbar.vue` 两个 scoped 块里各定义一份。

## 6. 导航映射

| 上下文 | L2 内容 |
|---|---|
| 工作台 | 概览行 + 最近使用组 + 收藏组（蓝色菱形图标）+ 四个工具分组 |
| 管理台 | 6 项，「数据管理」为父行 + 三条子行（regions / malls / parking-locations） |
| 通知 | 通知中心 1 行 |

- `DataManagementView` 的页内 tab 保留（属内容区），与 L2 子行由同一 `route.path` 驱动高亮。
- 四分组 / 最近使用 / 收藏一律由 `allowedTools` 派生（空分类整组消失）；view-only 工具正常进入页面，
  L2 不加权限徽标。
- `/todo` 只在数据应用分组（顶栏 calendar 已转静态，不指向任何路由）。
- DEV 离线 seed 没有 `description` 字段，弱化副标题必须 `v-if="tool.description"` 兜底。

## 7. Token

DOM 类名保持 `.v2-*` 不动，只有 CSS 变量用 `--cu-*` 前缀。

**恒暗命名空间**：`--cu-l1-panel-*`（面板 `#000`、项色 `#cdcdcd`/`#fff`、辉光、徽标 `#e93c81`）
只出现在 `html {}`，暗色段一律不重取值。`#f9f9f9` 那条底不属恒暗集，改名 `--cu-nav-rail-bg`
走 `:root` + `html.dark`，并与 L2 底合并成同一个 token。

机检：`grep -nE '^\s*--cu-l1-panel' frontend/src/style.css` 只允许命中 `html {` 块内。

### 层叠顺序（实测）

```text
15  L1 / L2 / 页面副标题栏
20  全宽顶栏 --cu-z-topbar   ← 头像下拉面板的 30 被困在它自己的层叠上下文内部
54  移动端遮罩
55  移动端 L2 抽屉
80  Toast
90  通知横幅
```

顶栏必须高于副标题栏：两者若同为 15，副标题栏是同级且 DOM 更靠后的兄弟，会画在头像下拉之上，
把面板头部（头像 + 角色标签）整段盖掉。`.v2-row` 是 `position: static / z-index: auto`，
不创建层叠上下文，所以移动端遮罩与抽屉仍在根上下文参与比较。
不用 Teleport 承载下拉：那会脱离 `.v2-shell` 祖先，使 `style.css` 的
`.v2-shell :focus-visible` 焦点环整排失效。

新增 token：`--cu-nav-row-height: 32px`、`--cu-icon-slot: 27px`、`--cu-topbar-height: 42px`、
`--cu-subbar-height: 48px`、`--cu-l2-width: 281px`、`--cu-l2-inner: 268px`、`--cu-l2-gutter: 12px`、
`--cu-mobile-tabbar-height: 48px`、`--cu-mobile-subbar-height: 40px`、`--cu-z-topbar-popover: 30`、
`--cu-z-topbar: 20`、`--cu-static-opacity`、
`--cu-seam-1`、`--cu-seam-2`、`--cu-nav-rail-bg`、`--cu-subbar-bg`、`--cu-font-nav`。

删除（重写后失去引用）：`--v2-l1-bg/hover/icon/icon-hover/icon-active/active-indicator/label-size/width/expanded-width`、
`--v2-z-label-panel`、`--v2-nav-item-height`、`--v2-nav-item-gap`、`--v2-l2-group-header-size`、
`--v2-l2-item-size`、`--v2-topbar-height`。

## 8. 已知偏离

| 项 | 说明 |
|---|---|
| 7 个静态元素 | 无真实行为支撑，按用户决定保留为纯视觉；弱化只作用于 `+ Create` 胶囊 |
| 顶栏右侧 2 个图标 | 参考稿是 3 图标簇。侧栏收折入口移回 L2 头部后，顶栏只剩主题与语言，数量不再一致 |
| L1 只有 3 项 | 参考稿 5 项 + Invite；非 admin 为 2 项 + 静态 Invite |
| 顶栏 calendar 不指向 `/todo` | 避免给 12 个平等工具开特权，违反「菜单按角色权限动态生成」 |
| 辉光/徽标配色跟参考稿 | 不并入本项目色板，按用户决定 |
| 品牌名 `Taulko` 只出现在顶栏 | `<title>` / favicon / meta / v1 壳叫法全部不动 |
| Firefox 滚动条 | 拿不到 12px 定制轨，`scrollbar-width: thin` 兜底 |
| 内容可视高度少 42px | 新增全宽顶栏的必然代价 |
| 1440 级 Dashboard 工具卡 4 列 → 3 列 | `minmax(260px)` 栅格，非变形 |

## 9. 参考素材

| 文件 | 内容 |
|---|---|
| `clickup-nav-only.png` | **导航区测量用这张**。由原图裁出（图像 x 8..336 / y 9..997 ⇒ 视口 0..328 × 0..988），已排除右侧红框；仅沟槽最右 7px 被裁掉 |
| `clickup-reference-full.png` | 原始参考截图（1600×1006）。**含用户自绘红色标注框（实测红像素 x 336..1582）与 Mobbin 演示数据**，只用于 §0 锚点复现，不作对外素材、不用于右侧测量 |
| `01-topbar.png` | 顶栏整条放大 |
| `02-l1rail.png` / `l1-items.png` / `l1-bottom.png` | L1 黑轨整体 / 项目 / 底部 |
| `03-l2-top.png` / `04-l2-bottom.png` | L2 上半 / 下半 |

裁片命令（PIL，`/usr/bin/python3` 已装 11.3.0）：

```python
from PIL import Image
im = Image.open('docs/design/clickup-ref/clickup-reference-full.png').convert('RGB')
im.crop((8, 9, 336, 997)).save('docs/design/clickup-ref/clickup-nav-only.png', optimize=True)
```

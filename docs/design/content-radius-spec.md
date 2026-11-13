# 内容区圆角与图标线宽规范

> 适用范围：`frontend/src/views/` 与 `frontend/src/components/` 的**内容区**（红色区域）。
> 导航区（顶栏 / L1 / L2）的几何见 [nav-clickup-spec.md](nav-clickup-spec.md)，本文件不改它。

## 1. 与视觉基线的关系（有意偏离）

`PROCESS_LOG.md` 2026-10-22 记录「视觉基线锁定 = Cake v3（`--violet #5533ff` + 白底 + `radius 14px`）」。

本批次**只偏离 radius 一项**：

| 属性 | 基线 | 现在 | 说明 |
|---|---|---|---|
| 圆角 | `--radius: 14px` | 三档 `8 / 6 / 10` | 见 §2 |
| 颜色 | Cake v3 | **不变** | `--violet*` / `--lime*` / `--ink*` / `--v2-accent*` / `--cu-*` 色值一律不动 |
| 排版 | Cake v3 | **不变** | 字号、字重、行高、间距 token 全部保持 |

`docs/design/baseline/visual-baseline-cake-v3.html` 与 `dashboard-layout.html` 里写死的
`--radius:14px` 是**历史快照**，不再作为圆角判据；两者内部本来就混用 9/10/11/8/3px。
后续任何「按基线核对」若得出圆角不符的结论，应以本文件为准。

## 2. 三档尺度与语义

| 档 | token | 语义 | 典型消费者 |
|---|---|---|---|
| **6px** | `--radius-sm`、`--v2-radius-sm` | 可点控件与行内元素 | input / button / select / textarea / 图标按钮 / chip / 关闭按钮 |
| **8px** | `--radius` | 内容区的卡片与面板 | `.banner` `.kpi` `.panel` `.tool-card` `.fav-card` `.list-item` `.map-wrap` `.list-panel` `.filter-bar` |
| **10px** | `--v2-radius` | 浮层容器 | Modal / Drawer / SearchPalette |

**不吸附、保持原值**：药丸 `99px`、圆点 `50%`、微标签 `4px`、图例方块 `2px`、单边写法
（如 `.notes-block` 的 `0 10px 10px 0`）。判定拿不准时归 8px。

`.list-item` / `.tool-card` / `.fav-card` 原本引用 `--radius-sm`，现改引用 `--radius`。
这是有意的：一个 token 不能同时承担「控件档」和「容器档」，`--radius-sm` 从此只表示控件 6px。

## 3. 图标线宽

`frontend/src/style.css` Layer 3 未分层组件区：

```css
svg.lucide { stroke-width: 1.5; }
```

三条硬约束，破坏任何一条都会得到错误结果：

1. **必须无单位**。写成 `1.5px` 会变成绝对值、不再按 24 viewBox 缩放，等于把所有图标线宽钉死。
2. **必须用 `svg.lucide`，不能用裸 `svg`**。`stroke-width` 是可继承属性，裸 `svg` 会把线宽灌进
   donut / area / marker 里那些未自报线宽的 path。全站唯一用线宽表达数据语义的是
   `DashboardView.vue` 的 trendLine，它把 `stroke-width="2.5"` 写在 path 上，不受根规则影响。
3. **必须写在未分层的 Layer 3 区，不要放进 `@layer base`**。lucide 的 `stroke-width="2"` 是
   presentation attribute，级联上排在所有 CSS 声明之前，普通规则即可压过，**不需要 `!important`**；
   但 Tailwind 的 preflight / utilities 都在 `@layer` 内，放进 `@layer base` 反而会被 utilities 层压住。

`CuIcon` 的 svg 不带 `.lucide` class，因此不受这条规则影响 —— 它本来就是 1.5，视觉一致，不需要处理。

### 已接受偏离

12 / 13px 图标（如 `.tc-star`、L2 私有锁）实际渲染线宽约 0.75~0.81px，在低分屏偏细。
**不做按尺寸的条件回退**：CSS 无法按渲染尺寸选择元素，而图标尺寸有两个来源
（`:size` prop 写进 width 属性，以及 CSS 如 `h-4 w-4`、`.tc-icon :deep(svg){width:17px}`），
属性枚举只能覆盖一半。

### lucide class 转发实测结论（防止重复「修」）

`Icon.js` 函数体内解构掉 `class` 并**不会**丢失消费者 class：Vue 的属性透传从原始
`vnode.props` 提取 fallthrough attrs。实测：

| 写法 | 渲染结果 |
|---|---|
| `<Star :class="{filled}">` | `class="lucide lucide-star-icon filled"`，`computed fill` = `rgb(240,180,0)` |
| `<ArrowUpRight class="tc-go">` | `class="lucide lucide-arrow-up-right-icon tc-go"` |

`.filled` / `.chev.open` / `.tc-go` 三条规则**全都是活的**，不存在需要修复的 class 丢失问题。

## 4. `.record-card` 无圆角（有意偏离）

计划曾要求给 `.record-card` 补 8px。实测它是**圆角面板内的全宽列表行**，
左右紧贴面板内边缘、靠 `border-bottom` 分隔；给它加圆角会让首行/末行与父容器
的 8px 圆角边缘错位。因此保持无圆角，圆角由父 `.list-panel` 承担。

## 5. 改动清单

- `style.css`：`--radius` 14→8、`--radius-sm` 10→6、`--v2-radius-sm` 7→6，加 `svg.lucide`。
- `ParkingView.vue` 23 处、`DashboardView.vue` 7 处、`NotificationCenterView.vue` 3 处手写字值吸附。
- `AuthShell.vue` 两处 `rounded-2xl`(16px) → `rounded-lg`(8px)；
  `NotificationManagementView.vue` 一处 `rounded-xl`(12px) → `rounded-[10px]`（浮层内卡片）。
  全站 206 个 Tailwind 圆角工具类中 `rounded-md`(6px) / `rounded-lg`(8px) 已在目标档，只有这 3 处越界。
- `components/` 按「控件 6 / 卡片 8 / 浮层 10」逐值吸附。

### v1 冻结分支的被动变化

`--radius` / `--radius-sm` 重值会连带改掉 v1 `AppShell.vue` 的 `.side-card`(14→8)、
收缩态图标格(10→6)、`.user-pop`(10→6)。生产配置 `VITE_NAV_V2=1` 下 v1 不可达，
`scripts/` 无任何 radius/stroke 断言，也无 e2e 目录，故只有观感依赖、无回归依赖。
**接受，不手工对齐 v1 的 scoped CSS。**

## 6. 验收

静态：

```bash
grep -rEn "border-radius: *(7|9|12|14)px" frontend/src/views/    # 0 命中
grep -rEn "border-radius: *(7|9|12|14)px" frontend/src/components/ \
  | grep -v "/AppShell.vue"                                       # 0 命中
```

`components/AppShell.vue` 里剩 4 处硬编码 `9px`，属 **v1 冻结分支**，本批次有意不动
（见 §5 末），因此机检必须显式排除它，而不是把整个 `components/` 目录当空集。

运行时（以构建产物为基准，用 ego 实测）：

- `/`、`/parking`、`/admin/users`、`/notifications` 上 `getComputedStyle(svg.lucide).strokeWidth === '1.5px'`；
  CuIcon 同为 1.5；trendLine 仍自报 2.5，未被继承改写。
- `.banner` / `.kpi` / `.panel` / `.tool-card` / `.fav-card` / `.list-item` === `8px`；
  `.search-box input` / `.btn` / `.select` / `.action-btn` === `6px`；Modal / Drawer === `10px`；
  `50%` / `99px` / `2px` / `4px` / 单边写法逐类抽样确认未被改动。

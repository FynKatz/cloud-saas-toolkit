/**
 * 导航几何回归断言（AGENTS.md §5：必须以构建产物为基准，不以 dev server 为准）。
 *
 * 这个文件不是普通 Node 脚本，它要喂给 ego-browser 的 runtime 才能拿到浏览器：
 *   node scripts/serve-dist.mjs 4173 &
 *   ego-browser nodejs < scripts/nav-ego-check.mjs
 *
 * 坐标全部是「视口相对」，与 docs/design/nav-clickup-spec.md 的锚点表同一基准。
 * 登录用真实 Supabase 账号：dist 里 import.meta.env.DEV 为 false，
 * window.__DEV_AUTH 与离线 seed 都不会生效。
 *
 * 只断言能被 getBoundingClientRect 直接拿到的量。辉光、引导线、::before 之类
 * 伪元素几何无法 rect 测量，按方案降级为 computed style + 人工目测。
 */

const BASE = 'http://127.0.0.1:4173'
const ACCOUNTS_CSV = '/Users/Yiyang.Hu/Documents/个人笔记/3 个人/cloud-saas-toolkit-accounts帐密.csv'
const TASK_SPACE = 'Cloud SaaS Toolkit'
const PAGE_LABEL = 'p8'

// 期望值来自 nav-clickup-spec.md 第 1 节
const EXPECT = {
  topbarHeight: 42,
  l1Width: 67,
  l2Width: 281,
  mainLeft: 348,
  rowHeight: 32,
  itemIconLeft: 85,
  itemTextLeft: 113,
  searchPillWidth: 316,
  createPill: { w: 82, h: 29 },
  tolerance: 1,
}

function pickAdmin(rows) {
  const line = rows.split('\n').slice(1).find(l => {
    const c = l.split(',')
    return c.length >= 5 && c[2] === 'admin' && c[4] === 'approved'
  })
  if (!line) throw new Error('CSV 里没有 approved 的 admin 行')
  const c = line.split(',')
  return { username: c[0], password: c[1] }
}

const { readFile } = await import('node:fs/promises')
const cred = pickAdmin(await readFile(ACCOUNTS_CSV, 'utf8'))

const task = await taskSpace(TASK_SPACE)
const page = task.page(PAGE_LABEL)
console.log({ spaceId: task.spaceId, page: PAGE_LABEL })

await page.goto(`${BASE}/`, { timeout: 30000 })
await page.waitForTimeout(1200)

// Supabase 会话会留在浏览器 profile 里，重复跑脚本时 /login 会被守卫弹回首页，
// 所以必须先判断是否已登录，不能无条件填表单。
if ((await page.url()).includes('/login')) {
  await page.waitForSelector('input[type=password]', { timeout: 15000 })
  // 凭据只写进表单，绝不打印到 stdout / 日志
  await page.fill('input[type=text]', cred.username)
  await page.fill('input[type=password]', cred.password)
  await page.click('button[type=submit]', { label: '登录构建产物' })
  await page.waitForTimeout(3000)
  await page.goto(`${BASE}/`, { timeout: 30000 })
}
console.log({ landedOn: await page.url(), user: cred.username })
await page.waitForSelector('.v2-l2', { timeout: 15000 })

// 工具列表由 allowedTools 异步派生，固定 sleep 会测出「只剩概览一行」的半空壳。
// 轮询到至少出现分组行，超时则把真实计数打出来，方便区分「还没加载」和「真的没权限」。
let rowCount = 0
for (let i = 0; i < 40; i++) {
  rowCount = await page.evaluate(() => document.querySelectorAll('.v2-l2-item').length)
  if (rowCount >= 6) break
  await page.waitForTimeout(500)
}
console.log({ l2ItemCount: rowCount })
if (rowCount < 6) {
  console.log('HALF-EMPTY SHELL，诊断:', JSON.stringify(await page.evaluate(() => ({
    url: location.pathname,
    rows: [...document.querySelectorAll('.v2-l2-item')].map(e => e.textContent.trim().slice(0, 24)),
    groups: [...document.querySelectorAll('.v2-l2-group-toggle')].map(e => e.textContent.trim()),
  }))))
}
await page.waitForTimeout(300)

const m = await page.evaluate(() => {
  const r = el => {
    if (!el) return null
    const b = el.getBoundingClientRect()
    return { left: +b.left.toFixed(2), top: +b.top.toFixed(2), width: +b.width.toFixed(2), height: +b.height.toFixed(2) }
  }
  const firstItem = document.querySelector('.v2-l2-item')
  return {
    vw: innerWidth,
    vh: innerHeight,
    topbar: r(document.querySelector('.v2-global-topbar')),
    subbar: r(document.querySelector('.v2-topbar')),
    l1: r(document.querySelector('.v2-l1')),
    l1Panel: r(document.querySelector('.v2-l1-panel')),
    l2: r(document.querySelector('.v2-l2')),
    main: r(document.querySelector('.v2-main')),
    searchPill: r(document.querySelector('.v2-search-pill')),
    createPill: r(document.querySelector('.v2-l2-create')),
    head: r(document.querySelector('.v2-l2-head')),
    row: r(firstItem),
    rowIcon: r(firstItem?.querySelector('.v2-l2-item-icon')),
    rowText: r(firstItem?.querySelector('.v2-l2-item-text')),
    // 行间距只能在同一分组内量：跨分组的相邻两行中间还夹着组头和分隔线，
    // 拿全局第 1、2 个行算 pitch 会得到 80 左右的假失败。
    rowPitch: (() => {
      const group = document.querySelector('.v2-l2-subitems')
      if (!group) return null
      const items = group.querySelectorAll('.v2-l2-item')
      if (items.length < 2) return null
      return +(items[1].getBoundingClientRect().top - items[0].getBoundingClientRect().top).toFixed(2)
    })(),
    groupHeadHeight: (() => {
      const h = document.querySelector('.v2-l2-group-head')
      return h ? +h.getBoundingClientRect().height.toFixed(2) : null
    })(),
    subitemGuide: (() => {
      const g = document.querySelector('.v2-l2-subitems')
      if (!g) return null
      const cs = getComputedStyle(g, '::before')
      const box = g.getBoundingClientRect()
      return { left: cs.left, width: cs.width, guideAbsX: +(box.left + parseFloat(cs.left || '0')).toFixed(2) }
    })(),
    // 恒暗不变量在浏览器里的实际取值，暗色段不得覆盖它
    l1PanelBg: getComputedStyle(document.querySelector('.v2-l1-panel')).backgroundColor,
    docScrollH: document.documentElement.scrollHeight,
    bodyScrollH: document.body.scrollHeight,
    contentScroll: (() => {
      const c = document.querySelector('.v2-content')
      return { scrollH: c.scrollHeight, clientH: c.clientHeight }
    })(),
    l2Scroll: (() => {
      const c = document.querySelector('.v2-l2-scroll')
      if (!c) return null
      const cs = getComputedStyle(c)
      return { overflowY: cs.overflowY, clientW: c.clientWidth, scrollW: c.scrollWidth }
    })(),
  }
})

const fails = []
const near = (actual, want, label, tol = EXPECT.tolerance) => {
  if (actual == null) { fails.push(`${label}: 元素不存在`); return }
  if (Math.abs(actual - want) > tol) fails.push(`${label}: 实测 ${actual}，期望 ${want}±${tol}`)
}

near(m.topbar?.height, EXPECT.topbarHeight, '顶栏高')
near(m.l1?.width, EXPECT.l1Width, 'L1 宽')
near(m.l2?.width, EXPECT.l2Width, 'L2 宽')
near(m.main?.left, EXPECT.mainLeft, '主内容左边界')
near(m.l1Panel?.width, 55, 'L1 黑面板宽')
near(m.row?.height, EXPECT.rowHeight, 'L2 行 pitch 盒高')
near(m.rowPitch, EXPECT.rowHeight, '同组行间距')
near(m.groupHeadHeight, EXPECT.rowHeight, '分组标题行高')
near(m.rowIcon?.left, EXPECT.itemIconLeft, 'L2 行图标左界')
near(m.rowText?.left, EXPECT.itemTextLeft, 'L2 行文字左界')
near(m.head?.height, 46, 'L2 头部高')
near(m.createPill?.width, EXPECT.createPill.w, '黑胶囊宽')
near(m.createPill?.height, EXPECT.createPill.h, '黑胶囊高')
near(m.searchPill?.width, EXPECT.searchPillWidth, '搜索胶囊宽')

// 搜索胶囊必须落在视口正中，而不是 flex 剩余空间的中点
if (m.searchPill) {
  const center = m.searchPill.left + m.searchPill.width / 2
  const want = m.vw / 2
  if (Math.abs(center - want) > 1) fails.push(`搜索胶囊居中: 中心 ${center}，视口中点 ${want}`)
}
// 黑胶囊右缘必须与行命中区右缘同一条线
if (m.createPill && m.row) {
  const cr = m.createPill.left + m.createPill.width
  const rr = m.row.left + m.row.width
  if (Math.abs(cr - rr) > 1) fails.push(`黑胶囊右缘 ${cr} 与行右缘 ${rr} 未对齐`)
}
near(m.row?.width, 251, 'L2 行命中区宽')
near(m.l2Scroll?.clientW, 268, 'L2 滚动视口宽')
// 不得多出第二条页面级滚动条（.v2-row 缺 min-height:0 的典型症状）
if (m.docScrollH > m.vh + 1) fails.push(`文档出现第二条滚动条: scrollHeight ${m.docScrollH} > viewport ${m.vh}`)
// L2 沟槽必须是滚动条轨，不是 padding
if (m.l2Scroll && m.l2Scroll.overflowY !== 'scroll') fails.push(`L2 overflow-y 应为 scroll，实为 ${m.l2Scroll.overflowY}`)
if (m.l1PanelBg !== 'rgb(0, 0, 0)') fails.push(`L1 黑面板应恒暗纯黑，实为 ${m.l1PanelBg}`)

console.log('--- 实测 ---')
console.log(JSON.stringify(m, null, 1))
console.log('--- 判定 ---')
if (fails.length) { console.log('FAIL\n' + fails.join('\n')) } else { console.log('PASS: 全部几何断言通过') }

const shot = '/tmp/nav-check-desktop.png'
await page.screenshot({ path: shot })
console.log('screenshot:', shot)

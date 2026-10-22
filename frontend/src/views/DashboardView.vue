<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import { ArrowUpRight, Search, Star, X } from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
import { useRecent } from '../composables/useRecent'
import { useFavorites } from '../composables/useFavorites'
import { getToolIcon } from '../lib/toolIcons'
import { toolPath } from '../types/tools'
import type { Tool } from '../types/tools'
import { DASHBOARD_SEARCH_KEY } from '../lib/keys'
import { supabase } from '../lib/supabase'

const auth = useAuthStore()
const toolsStore = useToolsStore()
const { recentTools } = useRecent()
const userId = computed(() => auth.user?.id)
const favorites = useFavorites(userId)

const localSearch = ref('')
const injectedSearch = inject(DASHBOARD_SEARCH_KEY, ref(''))
const keyword = computed(() =>
  (injectedSearch.value || localSearch.value || '').trim().toLowerCase(),
)
const activeCat = ref('全部')

function setCat(cat: string) {
  activeCat.value = cat
  // Baseline behaviour: a tag writes the group name into the search box, and
  // the keyword matcher already tests `category`, so filtering stays in one place.
  localSearch.value = cat === '全部' ? '' : cat
  if (injectedSearch) injectedSearch.value = localSearch.value
}
function clearSearch() {
  localSearch.value = ''
  activeCat.value = '全部'
  if (injectedSearch) injectedSearch.value = ''
}

const filtering = computed(() => keyword.value.length > 0)

const filteredTools = computed<Tool[]>(() => {
  const q = keyword.value
  if (!q) return toolsStore.allowedTools
  return toolsStore.allowedTools.filter((t) =>
    t.name.toLowerCase().includes(q)
    || (t.description ?? '').toLowerCase().includes(q)
    || t.category.toLowerCase().includes(q),
  )
})

const recent = computed<Tool[]>(() => recentTools(toolsStore.allowedTools))
const favoriteTools = computed<Tool[]>(() =>
  toolsStore.allowedTools.filter((t) => favorites.isFavorited(t.id)),
)

// Group order follows tools.sort_order, which is what groupedTools preserves.
const categories = computed(() => {
  const names: string[] = []
  for (const t of toolsStore.allowedTools) if (!names.includes(t.category)) names.push(t.category)
  return ['全部', ...names]
})

/* ---------- KPI: real counts, RLS-scoped ---------- */
const counts = ref<Record<string, number>>({ tools: 0, parking: 0, movies: 0, tasks: 0 })
const countsLoading = ref(true)

async function head(table: string): Promise<number> {
  const { count } = await supabase.from(table).select('id', { count: 'exact', head: true })
  return count ?? 0
}

async function loadCounts() {
  countsLoading.value = true
  const [parking, movies, tasks] = await Promise.all([
    head('parking_info'), head('movies_library'), head('tasks'),
  ])
  counts.value = {
    tools: toolsStore.allowedTools.length,
    parking, movies, tasks,
  }
  countsLoading.value = false
}

const kpis = computed(() => [
  { label: '工具总数', value: toolsStore.allowedTools.length, foot: '可用', chip: 'up' },
  { label: '停车记录', value: counts.value.parking, foot: counts.value.parking ? '条' : '暂无记录', chip: 'up' },
  { label: '电影条目', value: counts.value.movies, foot: counts.value.movies ? '条' : '暂无记录', chip: 'up' },
  { label: '待办任务', value: counts.value.tasks, foot: counts.value.tasks ? '项' : '暂无任务', chip: 'up' },
])

/* ---------- donut derives from the same real counts ---------- */
const dataTotal = computed(() => counts.value.parking + counts.value.movies + counts.value.tasks)
const donutSegments = computed(() => {
  const t = dataTotal.value
  if (!t) return []
  return [
    { name: '停车记录', value: counts.value.parking, color: 'var(--violet)' },
    { name: '电影条目', value: counts.value.movies, color: '#8b78ff' },
    { name: '待办任务', value: counts.value.tasks, color: '#d0ccff' },
  ]
})
const donutStyle = computed(() => {
  const t = dataTotal.value
  if (!t) return { background: 'conic-gradient(#e8e8f2 0 100%)' }
  let acc = 0
  const parts = donutSegments.value.map((s) => {
    const from = (acc / t) * 100
    acc += s.value
    const to = (acc / t) * 100
    return `${s.color} ${from}% ${to}%`
  })
  return { background: `conic-gradient(${parts.join(', ')})` }
})
const donutLead = computed(() => {
  const seg = [...donutSegments.value].sort((a, b) => b.value - a.value)[0]
  if (!seg || !dataTotal.value) return null
  return { name: seg.name, pct: Math.round((seg.value / dataTotal.value) * 100) }
})

/* ---------- usage table: real tools, real counts where a table backs them ---------- */
const TOOL_COUNT_SOURCE: Record<string, keyof typeof counts.value> = {
  parking: 'parking', movie: 'movies', todo: 'tasks',
}
const usageRows = computed(() => {
  // Take the 5 tools with the most records rather than the first 5 by sort_order;
  // otherwise the table fills up with cheatsheets that have no backing table at all.
  const rows = toolsStore.allowedTools.map((t) => {
    const src = TOOL_COUNT_SOURCE[t.id]
    return { id: t.id, name: t.name, value: src ? counts.value[src] : null }
  })
  rows.sort((a, b) => (b.value ?? -1) - (a.value ?? -1))
  const top = rows.slice(0, 5)
  const max = Math.max(1, ...top.map((r) => r.value ?? 0))
  return top.map((r) => ({ ...r, pct: r.value === null ? 0 : Math.round((r.value / max) * 100) }))
})

onMounted(() => {
  if (!toolsStore.initialized) toolsStore.load()
  favorites.load()
  loadCounts()
})
</script>

<template>
  <div>
    <!-- ① Hero -->
    <div class="hero">
      <div>
        <h1>概览 · Dashboard</h1>
        <p>速查、数据应用与图形文本工具的统一入口</p>
      </div>
      <div class="spacer" />
      <select class="range" aria-label="时间范围">
        <option>全部时间</option><option>近 7 天</option><option>近 30 天</option>
      </select>
    </div>

    <!-- ② Banner（装饰） -->
    <div class="banner">
      <div class="banner-badge">C</div>
      <div class="banner-main">
        <h4>工具已统一收口</h4>
        <p>{{ toolsStore.allowedTools.length }} 个工具、{{ categories.length - 1 }} 个分组，权限与菜单由服务端实时下发。</p>
      </div>
      <button class="banner-cta" @click="setCat('全部')">查看全部</button>
    </div>

    <!-- ③ 搜索 + 分类 -->
    <div class="search-row">
      <div class="search-box">
        <Search class="s-icon" />
        <input
          v-model="localSearch"
          type="text"
          placeholder="搜索工具、功能或记录…"
          @input="activeCat = '全部'"
        >
        <button v-if="keyword" class="s-clear" title="清除搜索" @click="clearSearch"><X /></button>
      </div>
      <div class="category-tags">
        <button
          v-for="cat in categories"
          :key="cat"
          class="category-tag"
          :class="{ active: activeCat === cat }"
          @click="setCat(cat)"
        >{{ cat }}</button>
      </div>
    </div>

    <!-- 搜索态：只呈现结果 -->
    <div v-if="filtering" class="panel results">
      <div class="panel-head">
        <h3>搜索结果 <span class="count">({{ filteredTools.length }})</span></h3>
        <button class="link" @click="clearSearch">清除</button>
      </div>
      <div v-if="!filteredTools.length" class="empty">
        <Search class="empty-ico" /><p>没有匹配的工具</p>
      </div>
      <div v-else class="tool-grid">
        <RouterLink
          v-for="tool in filteredTools"
          :key="tool.id"
          :to="toolPath(tool)"
          class="tool-card"
        >
          <div class="tc-head">
            <div class="tc-icon"><component :is="getToolIcon(tool.icon)" /></div>
            <div class="tc-text">
              <div class="tc-name">{{ tool.name }}</div>
              <div class="tc-cat">{{ tool.category }}</div>
            </div>
            <button
              class="tc-star"
              :title="favorites.isFavorited(tool.id) ? '取消收藏' : '收藏'"
              @click.stop.prevent="favorites.toggle(tool.id)"
            >
              <Star :class="{ filled: favorites.isFavorited(tool.id) }" />
            </button>
            <ArrowUpRight class="tc-go" />
          </div>
          <p v-if="tool.description" class="tc-desc">{{ tool.description }}</p>
        </RouterLink>
      </div>
    </div>

    <!-- 浏览态：④–⑧ 按基线顺序 -->
    <template v-else>
      <!-- ④ KPI -->
      <div class="kpis">
        <div v-for="k in kpis" :key="k.label" class="kpi">
          <div class="kpi-label">{{ k.label }}</div>
          <div class="kpi-value">{{ countsLoading && k.label !== '工具总数' ? '—' : k.value }}</div>
          <div class="kpi-foot"><span class="chip" :class="{ v: k.value === 0 }">{{ k.foot }}</span></div>
        </div>
      </div>

      <!-- ⑤ 图表 -->
      <div class="charts">
        <div class="panel">
          <div class="panel-head"><h3>使用趋势</h3><span class="tag">近 7 天</span></div>
          <div class="panel-body">
            <div class="area">
              <svg viewBox="0 0 560 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="dashArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#5533ff" stop-opacity=".22" />
                    <stop offset="100%" stop-color="#5533ff" stop-opacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,130 C50,120 80,80 130,86 C180,92 200,140 250,120 C300,100 320,58 380,64 C430,70 470,40 560,30 L560,180 L0,180 Z" fill="url(#dashArea)" />
                <path d="M0,130 C50,120 80,80 130,86 C180,92 200,140 250,120 C300,100 320,58 380,64 C430,70 470,40 560,30" fill="none" stroke="#5533ff" stroke-width="2.5" />
              </svg>
            </div>
            <div class="axis"><span>周一</span><span>周二</span><span>周三</span><span>周四</span><span>周五</span><span>周六</span><span>周日</span></div>
          </div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>数据构成</h3><span class="tag">合计 {{ dataTotal }}</span></div>
          <div class="panel-body">
            <div class="donut-wrap">
              <div class="donut" :style="donutStyle">
                <div class="donut-label">
                  <b>{{ donutLead ? donutLead.pct + '%' : '0%' }}</b>
                  <span>{{ donutLead ? donutLead.name.replace('记录', '占比').replace('条目', '占比') : '暂无数据' }}</span>
                </div>
              </div>
              <div class="legend">
                <div v-for="s in donutSegments" :key="s.name" class="legend-row">
                  <span class="swatch" :style="{ background: s.color }" />{{ s.name }}<b>{{ s.value }}</b>
                </div>
                <div v-if="!donutSegments.length" class="legend-row">录入停车、电影或待办后自动统计<b>—</b></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ⑥ 收藏 -->
      <div v-if="favoriteTools.length" id="favorites" class="panel fav-section">
        <div class="panel-head">
          <h3><Star class="inline" /> 收藏 <span class="count">({{ favoriteTools.length }})</span></h3>
        </div>
        <div class="fav-grid">
          <RouterLink v-for="tool in favoriteTools" :key="tool.id" :to="toolPath(tool)" class="fav-card">
            <div class="fav-icon"><component :is="getToolIcon(tool.icon)" /></div>
            <div class="fav-text">
              <div class="fav-name">{{ tool.name }}</div>
              <div class="fav-cat">{{ tool.category }}</div>
            </div>
            <Star class="fav-star filled" />
          </RouterLink>
        </div>
      </div>

      <!-- ⑦ 最近使用 -->
      <div v-if="recent.length" id="recent" class="panel fav-section recent-section">
        <div class="panel-head">
          <h3>最近使用 <span class="count">({{ recent.length }})</span></h3>
        </div>
        <div class="fav-grid">
          <RouterLink v-for="tool in recent" :key="tool.id" :to="toolPath(tool)" class="fav-card">
            <div class="fav-icon"><component :is="getToolIcon(tool.icon)" /></div>
            <div class="fav-text">
              <div class="fav-name">{{ tool.name }}</div>
              <div class="fav-cat">{{ tool.category }}</div>
            </div>
          </RouterLink>
        </div>
      </div>

      <!-- ⑧ 底部双栏 -->
      <div class="bottom-row">
        <div class="panel">
          <div class="panel-head"><h3>活动流</h3><span class="tag">演示</span></div>
          <div class="feed-row"><div class="feed-dot dot-v">停</div><div class="feed-main"><div class="ftitle">停车费结算</div><div class="fmeta">粤B · 8H2K9 · 2 小时前</div></div><div class="feed-amt">¥36.00</div></div>
          <div class="feed-row"><div class="feed-dot dot-l">影</div><div class="feed-main"><div class="ftitle">电影条目更新</div><div class="fmeta">沙丘 2 · 已看</div></div><div class="feed-amt">+1</div></div>
          <div class="feed-row"><div class="feed-dot dot-g">待</div><div class="feed-main"><div class="ftitle">待办完成</div><div class="fmeta">整理季度材料</div></div><div class="feed-amt">+1</div></div>
          <div class="feed-row"><div class="feed-dot dot-v">速</div><div class="feed-main"><div class="ftitle">速查表导出</div><div class="fmeta">CSV · 12 行</div></div><div class="feed-amt">1</div></div>
        </div>
        <div class="panel">
          <div class="panel-head"><h3>工具使用占比</h3><span class="tag">有数据表的工具</span></div>
          <table class="tbl">
            <thead><tr><th>工具</th><th>记录数</th></tr></thead>
            <tbody>
              <tr v-for="r in usageRows" :key="r.id">
                <td>{{ r.name }}</td>
                <td>
                  <template v-if="r.value === null"><span class="na">无数据表</span></template>
                  <template v-else><span class="bar-mini"><i :style="{ width: r.pct + '%' }" /></span>{{ r.value }}</template>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 全部工具（浏览态保留可遍历的入口） -->
      <div class="panel fav-section">
        <div class="panel-head"><h3>所有工具 <span class="count">({{ toolsStore.allowedTools.length }})</span></h3></div>
        <div class="tool-grid pad">
          <RouterLink v-for="tool in toolsStore.allowedTools" :key="tool.id" :to="toolPath(tool)" class="tool-card">
            <div class="tc-head">
              <div class="tc-icon"><component :is="getToolIcon(tool.icon)" /></div>
              <div class="tc-text">
                <div class="tc-name">{{ tool.name }}</div>
                <div class="tc-cat">{{ tool.category }}</div>
              </div>
              <button
                class="tc-star"
                :title="favorites.isFavorited(tool.id) ? '取消收藏' : '收藏'"
                @click.stop.prevent="favorites.toggle(tool.id)"
              >
                <Star :class="{ filled: favorites.isFavorited(tool.id) }" />
              </button>
              <ArrowUpRight class="tc-go" />
            </div>
            <p v-if="tool.description" class="tc-desc">{{ tool.description }}</p>
          </RouterLink>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 逐条对照 docs/design/baseline/dashboard-layout.html；写死的颜色换成 token 以支持暗夜。 */
.hero { display: flex; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.hero h1 { font-size: 22px; font-weight: 680; letter-spacing: -.3px; color: var(--ink); }
.hero p { color: var(--ink-2); font-size: 13px; margin-top: 4px; }
.spacer { flex: 1; }
.range { border: 1px solid var(--line); border-radius: 9px; padding: 6px 12px; font-size: 13px; font-family: inherit; color: var(--ink); background: var(--card); cursor: pointer; }

.banner { display: flex; align-items: center; gap: 14px; margin-top: 18px; padding: 15px 20px; border-radius: var(--radius); background: var(--violet-soft); border: 1px solid var(--violet-line); }
.banner-badge { width: 36px; height: 36px; border-radius: 10px; background: var(--violet); color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 700; flex-shrink: 0; font-size: 15px; }
.banner-main { flex: 1; min-width: 0; }
.banner-main h4 { font-size: 13.5px; font-weight: 650; color: var(--ink); }
.banner-main p { font-size: 12px; color: var(--ink-2); margin-top: 2px; }
.banner-cta { border: 1px solid var(--violet); background: var(--card); color: var(--violet); border-radius: 9px; padding: 7px 13px; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; font-family: inherit; }

.search-row { margin-top: 18px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.search-box { flex: 1; max-width: 480px; position: relative; }
.search-box input { width: 100%; height: 42px; border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 0 44px 0 42px; font-size: 13.5px; font-family: inherit; color: var(--ink); background: var(--card); outline: none; transition: border-color .15s, box-shadow .15s; }
.search-box input:focus { border-color: var(--violet); box-shadow: 0 0 0 3px rgba(85, 51, 255, .08); }
.s-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--ink-3); pointer-events: none; }
.s-clear { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--ink-3); padding: 4px; border-radius: 50%; display: flex; }
.s-clear:hover { color: var(--ink); background: var(--hover); }
.s-clear :deep(svg) { width: 15px; height: 15px; }
.category-tags { display: flex; gap: 8px; flex-wrap: wrap; }
.category-tag { padding: 5px 13px; border-radius: 99px; font-size: 12px; color: var(--ink-2); background: var(--chip-neutral); cursor: pointer; border: 1px solid transparent; transition: all .12s; white-space: nowrap; font-family: inherit; }
.category-tag:hover { border-color: var(--violet-line); color: var(--ink); }
.category-tag.active { background: var(--violet-soft); color: var(--violet); border-color: var(--violet-line); font-weight: 600; }

.kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-top: 20px; }
.kpi { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 16px 18px; }
.kpi-label { font-size: 11px; color: var(--ink-3); font-weight: 600; letter-spacing: .3px; text-transform: uppercase; margin-bottom: 6px; }
.kpi-value { font-size: 26px; font-weight: 680; letter-spacing: -.5px; color: var(--ink); }
.kpi-foot { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 11.5px; color: var(--ink-2); }
.chip { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 99px; background: var(--lime); color: var(--lime-fg); font-weight: 700; font-size: 11px; }
.chip.v { background: var(--violet-soft); color: var(--violet); }

.charts { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; margin-top: 20px; }
.panel { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
.panel-head { display: flex; align-items: center; justify-content: space-between; padding: 14px 18px; border-bottom: 1px solid var(--line); }
.panel-head h3 { font-size: 14px; font-weight: 650; color: var(--ink); display: flex; align-items: center; gap: 7px; }
.panel-head .tag { font-size: 11px; color: var(--violet); background: var(--violet-soft); border-radius: 99px; padding: 3px 9px; font-weight: 600; white-space: nowrap; }
.panel-body { padding: 14px 18px; }
.count { font-weight: 400; font-size: 11.5px; color: var(--ink-3); }
.inline { width: 14px; height: 14px; color: #f0b400; }

.area { position: relative; height: 180px; }
.area svg { width: 100%; height: 100%; display: block; }
.axis { display: flex; justify-content: space-between; font-size: 10px; color: var(--ink-3); margin-top: 4px; padding: 0 4px; }

.donut-wrap { display: flex; align-items: center; gap: 16px; }
.donut { width: 128px; height: 128px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.donut::after { content: ''; position: absolute; inset: 24px; border-radius: 50%; background: var(--card); }
.donut-label { position: relative; z-index: 1; text-align: center; }
.donut-label b { font-size: 18px; font-weight: 680; display: block; color: var(--ink); }
.donut-label span { font-size: 10px; color: var(--ink-3); }
.legend { flex: 1; min-width: 0; }
.legend-row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-2); padding: 4px 0; }
.legend-row b { margin-left: auto; color: var(--ink); font-weight: 600; }
.swatch { width: 8px; height: 8px; border-radius: 2px; flex-shrink: 0; }

.fav-section { margin-top: 20px; }
.recent-section { margin-top: 16px; }
.fav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; padding: 14px 18px; }
.fav-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--line); border-radius: var(--radius-sm); cursor: pointer; transition: all .12s; text-decoration: none; }
.fav-card:hover { border-color: var(--violet-line); background: var(--violet-soft); }
.fav-icon { width: 32px; height: 32px; border-radius: 8px; background: var(--violet-soft); color: var(--violet); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.fav-icon :deep(svg) { width: 15px; height: 15px; }
.fav-text { min-width: 0; flex: 1; }
.fav-name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-cat { font-size: 11px; color: var(--ink-3); }
.fav-star { width: 14px; height: 14px; color: var(--ink-3); flex-shrink: 0; }
.fav-star.filled { color: #f0b400; fill: currentColor; }

.bottom-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px; }
.feed-row { display: flex; align-items: center; gap: 12px; padding: 13px 18px; border-bottom: 1px solid var(--line); }
.feed-row:last-child { border-bottom: none; }
.feed-dot { width: 32px; height: 32px; border-radius: 9px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; flex-shrink: 0; }
.dot-v { background: var(--violet-soft); color: var(--violet); }
.dot-l { background: var(--chip-neutral); color: var(--ink-2); }
.dot-g { background: var(--violet-soft); color: var(--violet); }
.feed-main { flex: 1; min-width: 0; }
.ftitle { font-size: 13px; font-weight: 600; color: var(--ink); }
.fmeta { font-size: 11px; color: var(--ink-3); margin-top: 2px; }
.feed-amt { font-size: 13px; font-weight: 650; white-space: nowrap; color: var(--ink); font-variant-numeric: tabular-nums; }

.tbl { width: 100%; border-collapse: collapse; font-size: 12.5px; }
.tbl th { text-align: left; font-size: 10.5px; letter-spacing: .4px; text-transform: uppercase; color: var(--ink-3); font-weight: 650; padding: 10px 18px; border-bottom: 1px solid var(--line); }
.tbl td { padding: 12px 18px; border-bottom: 1px solid var(--line); color: var(--ink-2); }
.tbl tr:last-child td { border-bottom: none; }
.tbl td:first-child { color: var(--ink); font-weight: 600; }
.bar-mini { height: 5px; width: 72px; border-radius: 99px; background: var(--line); overflow: hidden; display: inline-block; vertical-align: middle; margin-right: 8px; }
.bar-mini i { display: block; height: 100%; border-radius: 99px; background: var(--violet); }
.na { font-size: 11.5px; color: var(--ink-3); }

.results { margin-top: 20px; }
.link { border: none; background: none; color: var(--violet); font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; }
.link:hover { text-decoration: underline; }
.empty { display: flex; flex-direction: column; align-items: center; padding: 32px 20px; color: var(--ink-3); }
.empty-ico { width: 32px; height: 32px; opacity: .3; margin-bottom: 8px; }
.empty p { font-size: 13px; }

.tool-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
.tool-grid.pad { padding: 14px 18px; }
.results .tool-grid { padding: 14px 18px; }
.tool-card { display: flex; flex-direction: column; border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--card); padding: 14px 16px; transition: border-color .12s, box-shadow .12s; text-decoration: none; }
.tool-card:hover { border-color: var(--violet-line); box-shadow: var(--shadow-hover); }
.tc-head { display: flex; align-items: center; gap: 10px; }
.tc-icon { width: 34px; height: 34px; border-radius: 9px; background: var(--violet-soft); color: var(--violet); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.tc-icon :deep(svg) { width: 17px; height: 17px; }
.tc-text { min-width: 0; flex: 1; }
.tc-name { font-size: 13.5px; font-weight: 600; color: var(--ink); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tc-cat { font-size: 11px; color: var(--ink-3); }
.tc-star { width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; border: none; background: none; cursor: pointer; color: var(--ink-3); border-radius: 6px; flex-shrink: 0; padding: 0; }
.tc-star:hover { background: var(--hover); color: #f0b400; }
.tc-star :deep(svg) { width: 15px; height: 15px; }
.tc-star :deep(svg.filled) { color: #f0b400; fill: currentColor; }
.tc-go { width: 15px; height: 15px; color: var(--ink-3); flex-shrink: 0; opacity: 0; transition: opacity .12s; }
.tool-card:hover .tc-go { opacity: 1; }
.tc-desc { margin-top: 10px; font-size: 11.5px; line-height: 1.5; color: var(--ink-2); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

@media (max-width: 1024px) {
  .kpis { grid-template-columns: repeat(2, 1fr); }
  .charts, .bottom-row { grid-template-columns: 1fr; }
}
</style>

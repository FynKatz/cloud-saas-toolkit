<script setup lang="ts">
import { computed, inject, onMounted, ref } from 'vue'
import {
  ArrowUpRight,
  Clock,
  Grid3X3,
  Search,
  X,
} from 'lucide-vue-next'
import { useToolsStore } from '../stores/tools'
import { useRecent } from '../composables/useRecent'
import { getToolIcon } from '../lib/toolIcons'
import { toolPath } from '../types/tools'
import type { Tool } from '../types/tools'
import { DASHBOARD_SEARCH_KEY } from '../lib/keys'

const toolsStore = useToolsStore()
const { recentTools } = useRecent()

const localSearch = ref('')
const injectedSearch = inject(DASHBOARD_SEARCH_KEY, ref(''))

const searchKeyword = computed(() =>
  (injectedSearch.value || localSearch.value || '').trim().toLowerCase(),
)

const filteredTools = computed<Tool[]>(() => {
  const q = searchKeyword.value
  if (!q) return toolsStore.allowedTools
  return toolsStore.allowedTools.filter(
    (t) =>
      t.name.toLowerCase().includes(q) ||
      (t.description ?? '').toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q),
  )
})

const recent = computed<Tool[]>(() => recentTools(toolsStore.allowedTools))

const stats = computed(() => ({
  total: toolsStore.allowedTools.length,
  categories: new Set(toolsStore.allowedTools.map((t) => t.category)).size,
}))

const categorySet = computed(() => {
  const names: string[] = []
  for (const t of toolsStore.allowedTools) {
    if (!names.includes(t.category)) names.push(t.category)
  }
  return names
})

function searchByCategory(cat: string) {
  localSearch.value = cat
  if (injectedSearch) injectedSearch.value = cat
}

function clearSearch() {
  localSearch.value = ''
  if (injectedSearch) injectedSearch.value = ''
}

onMounted(() => {
  if (!toolsStore.initialized) toolsStore.load()
})
</script>

<template>
  <div class="space-y-6">
    <!-- Welcome + Search -->
    <div class="grid gap-4 lg:grid-cols-3">
      <div
        class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 lg:col-span-2"
      >
        <h2 class="text-lg font-semibold tracking-normal text-[var(--text)]">
          工具搜索
        </h2>
        <div class="mt-3 relative">
          <span
            class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          >
            <Search class="h-4 w-4" />
          </span>
          <input
            v-model="localSearch"
            class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-10 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)]"
            placeholder="按名称、描述或分类搜索工具..."
          />
          <button
            v-if="searchKeyword"
            class="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
            title="清除搜索"
            @click="clearSearch"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <div class="mt-3 flex flex-wrap gap-2 text-xs">
          <span class="text-[var(--text-secondary)] pt-1">快速分类：</span>
          <button
            v-for="cat in categorySet"
            :key="cat"
            @click="searchByCategory(cat)"
            class="rounded-full border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-1 text-[var(--text-secondary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <!-- Stats Card -->
      <div
        class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5"
      >
        <h2 class="text-sm font-semibold tracking-normal text-[var(--text)] mb-3">
          <Grid3X3 class="inline h-4 w-4 mr-1.5 -mt-0.5" /> 概览
        </h2>
        <div class="grid grid-cols-2 gap-3">
          <div class="text-center p-2 rounded-md bg-[var(--bg)]">
            <div class="text-xl font-semibold text-[var(--accent)]">{{ stats.total }}</div>
            <div class="text-[11px] text-[var(--text-secondary)]">工具</div>
          </div>
          <div class="text-center p-2 rounded-md bg-[var(--bg)]">
            <div class="text-xl font-semibold text-[var(--accent)]">{{ stats.categories }}</div>
            <div class="text-[11px] text-[var(--text-secondary)]">分类</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Tools -->
    <div v-if="recent.length > 0" class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <h2 class="text-sm font-semibold tracking-normal text-[var(--text)] mb-4">
        <Clock class="inline h-4 w-4 mr-1.5 -mt-0.5" /> 最近使用
      </h2>
      <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <RouterLink
          v-for="tool in recent"
          :key="tool.id"
          :to="toolPath(tool)"
          class="group flex items-center gap-3 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2.5 transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-hover)]"
        >
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-[var(--accent-soft)] text-[var(--accent)]">
            <component :is="getToolIcon(tool.icon)" class="h-[16px] w-[16px]" />
          </div>
          <div class="min-w-0 flex-1">
            <div class="truncate text-xs font-medium text-[var(--text)]">{{ tool.name }}</div>
            <div class="truncate text-[11px] text-[var(--text-secondary)]">{{ tool.category }}</div>
          </div>
          <ArrowUpRight class="h-3.5 w-3.5 shrink-0 text-[var(--text-secondary)] opacity-0 transition group-hover:opacity-100" />
        </RouterLink>
      </div>
    </div>

    <!-- All Tools Grid -->
    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-sm font-semibold tracking-normal text-[var(--text)]">
          所有工具
          <span class="ml-1 font-normal text-[var(--text-secondary)]">({{ filteredTools.length }})</span>
        </h2>
      </div>

      <div v-if="filteredTools.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
        <Search class="h-8 w-8 mb-2 opacity-30" />
        <p class="text-sm">没有匹配的工具</p>
        <button
          @click="clearSearch"
          class="mt-2 text-xs text-[var(--accent)] hover:underline"
        >
          清除搜索
        </button>
      </div>

      <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <RouterLink
          v-for="tool in filteredTools"
          :key="tool.id"
          :to="toolPath(tool)"
          class="group flex flex-col rounded-lg border border-[var(--surface-border)] bg-[var(--bg)] p-4 transition hover:border-[var(--accent)] hover:shadow-[var(--shadow-hover)]"
        >
          <div class="flex items-center gap-3">
            <div class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              <component :is="getToolIcon(tool.icon)" class="h-[18px] w-[18px]" />
            </div>
            <div class="min-w-0 flex-1">
              <div class="truncate text-sm font-medium text-[var(--text)]">{{ tool.name }}</div>
              <div class="truncate text-[11px] text-[var(--text-secondary)]">{{ tool.category }}</div>
            </div>
            <ArrowUpRight class="h-4 w-4 shrink-0 text-[var(--text-secondary)] opacity-0 transition group-hover:opacity-100" />
          </div>
          <p class="mt-3 line-clamp-2 text-xs leading-relaxed text-[var(--text-secondary)]">
            {{ tool.description }}
          </p>
        </RouterLink>
      </div>
    </div>
  </div>
</template>

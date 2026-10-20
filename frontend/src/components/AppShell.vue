<script setup lang="ts">
import { computed, onMounted, provide, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  Box,
  Car,
  CircleUser,
  Container,
  Database,
  Film,
  Hash,
  Heading,
  Image,
  Keyboard,
  LayoutDashboard,
  ListTodo,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Search,
  Sun,
  Zap,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
import { useTheme } from '../composables/useTheme'
import { useRecent } from '../composables/useRecent'
import { DASHBOARD_SEARCH_KEY } from '../lib/keys'
import { toolPath } from '../types/tools'
import type { Tool } from '../types/tools'

type Icon = typeof LayoutDashboard

interface ToolNav {
  id: string
  name: string
  icon: Icon
  route: string
}

const collapsed = ref(false)
const searchQuery = ref('')
const route = useRoute()
const auth = useAuthStore()
const toolsStore = useToolsStore()
const theme = useTheme()
const { addRecent } = useRecent()

const ICON_MAP: Record<string, Icon> = {
  Container,
  Database,
  Zap,
  Keyboard,
  Puzzle,
  Heading,
  Car,
  Image,
  Hash,
  Film,
  ListTodo,
  Box,
}

function toNav(tool: Tool): ToolNav {
  return {
    id: tool.id,
    name: tool.name,
    icon: ICON_MAP[tool.icon] ?? Box,
    route: toolPath(tool),
  }
}

const groups = computed(() =>
  toolsStore.groupedTools.map((group) => ({
    name: group.name,
    items: group.tools.map(toNav),
  })),
)

const currentTitle = computed(() => {
  const title = route.meta.title as string | undefined
  return title || 'Cloud SaaS Toolkit'
})

function isActive(item: ToolNav) {
  if (item.route === '/') return route.path === '/'
  return route.path === item.route
}

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

function onTabClick(toolId: string) {
  addRecent(toolId)
}

onMounted(() => {
  if (!toolsStore.initialized) toolsStore.load()
})

provide(DASHBOARD_SEARCH_KEY, searchQuery)
</script>

<template>
  <div class="flex min-h-screen bg-[var(--bg)] text-[var(--text)] transition-colors">
    <aside
      class="fixed inset-y-0 left-0 z-30 flex shrink-0 flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] text-[var(--nav-text)] transition-[width] duration-200"
      :class="collapsed ? 'w-[76px]' : 'w-[220px]'"
    >
      <div class="flex h-16 items-center border-b border-[var(--sidebar-border)] px-3">
        <button
          class="grid h-9 w-9 place-items-center rounded-md text-[var(--nav-section)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <PanelLeftOpen v-if="collapsed" class="h-5 w-5" />
          <PanelLeftClose v-else class="h-5 w-5" />
        </button>
        <div v-if="!collapsed" class="ml-3 truncate text-sm font-semibold tracking-normal text-[var(--text)]">
          Cloud SaaS Toolkit
        </div>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        <div v-for="group in groups" :key="group.name">
          <div
            v-if="!collapsed"
            class="mb-2 px-3 text-[11px] font-medium uppercase tracking-normal text-[var(--nav-section)]"
          >
            {{ group.name }}
          </div>
          <div class="space-y-1">
            <RouterLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.route"
              class="group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
              :class="isActive(item) ? 'bg-[var(--nav-hover)] text-[var(--text)]' : ''"
              :title="collapsed ? item.name : undefined"
              @click="onTabClick(item.id)"
            >
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>
        <div v-if="toolsStore.loading" class="px-3 text-xs text-[var(--text-secondary)]">
          正在加载工具...
        </div>
      </nav>

      <div class="border-t border-[var(--sidebar-border)] p-2">
        <div class="flex items-center gap-3 rounded-md px-2 py-2">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-xs font-semibold text-white">
            {{ (auth.profile?.display_name || auth.profile?.username || 'FY').slice(0, 2).toUpperCase() }}
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <div class="truncate text-sm text-[var(--text)]">
              {{ auth.profile?.display_name || auth.profile?.username || 'FynKatz' }}
            </div>
            <div class="truncate text-[11px] text-[var(--text-secondary)]">个人工作台</div>
          </div>
        </div>
      </div>
    </aside>

    <div class="min-w-0 flex-1 transition-[padding] duration-200" :class="collapsed ? 'pl-[76px]' : 'pl-[220px]'">
      <header class="flex h-16 items-center border-b border-[var(--surface-border)] bg-[var(--surface)] px-5 transition-colors">
        <div class="flex min-w-0 items-center gap-4">
          <div>
            <div class="truncate text-sm font-semibold tracking-normal text-[var(--text)]">{{ currentTitle }}</div>
            <div class="truncate text-[11px] text-[var(--text-secondary)]">Cloud SaaS Toolkit / {{ currentTitle }}</div>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <label class="relative block">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
              <Search class="h-4 w-4" />
            </span>
            <input
              v-model="searchQuery"
              class="h-9 w-48 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)] md:w-64"
              placeholder="搜索工具..."
            />
          </label>
          <button
            class="grid h-9 w-9 place-items-center rounded-md border border-[var(--surface-border)] text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)]"
            :title="theme.isDark.value ? '切换到日间模式' : '切换到暗夜模式'"
            @click="theme.toggle()"
          >
            <Sun v-if="theme.isDark.value" class="h-4 w-4" />
            <Moon v-else class="h-4 w-4" />
          </button>
          <button class="grid h-9 w-9 place-items-center rounded-md border border-[var(--surface-border)] text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)]">
            <CircleUser class="h-5 w-5" />
          </button>
        </div>
      </header>

      <main class="p-5 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

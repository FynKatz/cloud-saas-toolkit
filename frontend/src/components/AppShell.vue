<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
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
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Search,
  Zap,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
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
const route = useRoute()
const auth = useAuthStore()
const toolsStore = useToolsStore()

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

onMounted(() => {
  if (!toolsStore.initialized) toolsStore.load()
})
</script>

<template>
  <div class="flex min-h-screen bg-slate-50 text-slate-900">
    <aside
      class="fixed inset-y-0 left-0 z-30 flex shrink-0 flex-col bg-slate-900 text-slate-300 transition-[width] duration-200"
      :class="collapsed ? 'w-[76px]' : 'w-[220px]'"
    >
      <div class="flex h-16 items-center border-b border-slate-800 px-3">
        <button
          class="grid h-9 w-9 place-items-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-white"
          :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
          @click="toggleSidebar"
        >
          <PanelLeftOpen v-if="collapsed" class="h-5 w-5" />
          <PanelLeftClose v-else class="h-5 w-5" />
        </button>
        <div v-if="!collapsed" class="ml-3 truncate text-sm font-semibold tracking-normal text-white">
          Cloud SaaS Toolkit
        </div>
      </div>

      <nav class="flex-1 space-y-5 overflow-y-auto px-2 py-4">
        <div v-for="group in groups" :key="group.name">
          <div
            v-if="!collapsed"
            class="mb-2 px-3 text-[11px] font-medium uppercase tracking-normal text-slate-500"
          >
            {{ group.name }}
          </div>
          <div class="space-y-1">
            <RouterLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.route"
              class="group flex h-10 items-center gap-3 rounded-md px-3 text-sm text-slate-300 transition hover:bg-slate-800 hover:text-white"
              :class="isActive(item) ? 'bg-slate-800 text-white' : ''"
              :title="collapsed ? item.name : undefined"
            >
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
              <span v-if="!collapsed" class="truncate">{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>
        <div v-if="toolsStore.loading" class="px-3 text-xs text-slate-500">
          正在加载工具...
        </div>
      </nav>

      <div class="border-t border-slate-800 p-2">
        <div class="flex items-center gap-3 rounded-md px-2 py-2">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-semibold text-slate-900">
            {{ (auth.profile?.display_name || auth.profile?.username || 'FY').slice(0, 2).toUpperCase() }}
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <div class="truncate text-sm text-white">{{ auth.profile?.display_name || auth.profile?.username || 'FynKatz' }}</div>
            <div class="truncate text-[11px] text-slate-500">个人工作台</div>
          </div>
        </div>
      </div>
    </aside>

    <div class="min-w-0 flex-1 transition-[padding] duration-200" :class="collapsed ? 'pl-[76px]' : 'pl-[220px]'">
      <header class="flex h-16 items-center border-b border-slate-200 bg-white px-5">
        <div class="flex min-w-0 items-center gap-4">
          <div>
            <div class="truncate text-sm font-semibold tracking-normal text-slate-900">{{ currentTitle }}</div>
            <div class="truncate text-[11px] text-slate-500">Cloud SaaS Toolkit / {{ currentTitle }}</div>
          </div>
        </div>
        <div class="ml-auto flex items-center gap-3">
          <label class="relative block">
            <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Search class="h-4 w-4" />
            </span>
            <input
              class="h-9 w-48 rounded-md border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-slate-400 focus:bg-white md:w-64"
              placeholder="搜索工具..."
            />
          </label>
          <button class="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-500 transition hover:bg-slate-50">
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

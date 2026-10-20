<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  CircleUser,
  Container,
  Database,
  FileType2,
  Film,
  Heading1,
  Images,
  ImageDown,
  LayoutDashboard,
  ListTodo,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Search,
  SquareParking,
  TextCursorInput,
  Zap,
} from 'lucide-vue-next'

type Icon = typeof LayoutDashboard

interface NavEntry {
  id: string
  name: string
  icon: Icon
  route: string
}

interface NavGroup {
  name: string
  items: NavEntry[]
}

const collapsed = ref(false)
const route = useRoute()

const groups: NavGroup[] = [
  {
    name: '总览',
    items: [{ id: 'dashboard', name: '总览', icon: LayoutDashboard, route: '/' }],
  },
  {
    name: '常用工具',
    items: [
      { id: 'parking', name: '停车管理', icon: SquareParking, route: '/parking' },
      { id: 'todo', name: 'Todo', icon: ListTodo, route: '/todo' },
      { id: 'sql', name: 'SQL 速查', icon: Database, route: '/sql' },
      { id: 'redis', name: 'Redis 速查', icon: Zap, route: '/redis' },
      { id: 'docker', name: 'Docker/K8S', icon: Container, route: '/docker' },
    ],
  },
  {
    name: '信息面板',
    items: [
      { id: 'movie', name: '家庭电影', icon: Film, route: '/movie' },
    ],
  },
  {
    name: '扩展工具',
    items: [
      { id: 'collage', name: '图片拼接', icon: Images, route: '/collage' },
      { id: 'pixabay', name: 'Pixabay 下载', icon: ImageDown, route: '/pixabay' },
      { id: 'text-stats', name: '文本统计', icon: TextCursorInput, route: '/text-stats' },
      { id: 'typora', name: 'Typora 速查', icon: FileType2, route: '/typora' },
      { id: 'chrome-pack', name: 'Chrome 扩展', icon: Puzzle, route: '/chrome-pack' },
      { id: 'markdown-heading', name: 'Markdown 标题', icon: Heading1, route: '/markdown-heading' },
    ],
  },
]

const currentTitle = computed(() => {
  const title = route.meta.title as string | undefined
  return title || 'Cloud SaaS Toolkit'
})

function isActive(item: NavEntry) {
  if (item.route === '/') return route.path === '/'
  return route.path === item.route
}

function toggleSidebar() {
  collapsed.value = !collapsed.value
}
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
      </nav>

      <div class="border-t border-slate-800 p-2">
        <div class="flex items-center gap-3 rounded-md px-2 py-2">
          <div class="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-400 text-xs font-semibold text-slate-900">
            FY
          </div>
          <div v-if="!collapsed" class="min-w-0">
            <div class="truncate text-sm text-white">FynKatz</div>
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

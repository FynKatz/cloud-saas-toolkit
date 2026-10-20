<script setup lang="ts">
import { computed, nextTick, onMounted, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import {
  Box,
  Car,
  CircleUser,
  Container,
  Database,
  FileText,
  Film,
  Hash,
  Heading,
  Image,
  Keyboard,
  LogOut,
  LayoutDashboard,
  ListTodo,
  ShieldCheck,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Puzzle,
  Search,
  UserCog,
  Sun,
  Zap,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
import { supabase } from '../lib/supabase'
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
const router = useRouter()
const { addRecent } = useRecent()
const pendingUsers = ref(0)

const adminNav = [
  { name: '用户管理', route: '/admin/users', icon: UserCog },
  { name: '角色权限', route: '/admin/roles', icon: ShieldCheck },
  { name: '审计日志', route: '/admin/audit-logs', icon: FileText },
]

async function loadPendingCount() {
  if (!auth.isAdmin) return
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (!error) pendingUsers.value = count ?? 0
}

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

const openUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

function toggleUserMenu() {
  openUserMenu.value = !openUserMenu.value
}

async function handleLogout() {
  openUserMenu.value = false
  await auth.signOut()
  router.replace({ name: 'login' })
}

watch(openUserMenu, (val) => {
  if (val) {
    nextTick(() => {
      document.addEventListener('click', onOutsideClick)
    })
  } else {
    document.removeEventListener('click', onOutsideClick)
  }
})

function onOutsideClick(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) {
    openUserMenu.value = false
  }
}

onMounted(() => {
  // Force a refresh on every mount. AppShell mounts when the user enters the
  // workspace (login or page reload), which is the point where a permission
  // change made by an admin should become visible. In-app child navigation does
  // not remount AppShell, so this stays a single request per session entry.
  toolsStore.load(true)
  loadPendingCount()
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

        <div v-if="auth.isAdmin">
          <div
            v-if="!collapsed"
            class="mb-2 px-3 text-[11px] font-medium uppercase tracking-normal text-[var(--nav-section)]"
          >
            系统管理
          </div>
          <div class="space-y-1">
            <RouterLink
              v-for="item in adminNav"
              :key="item.route"
              :to="item.route"
              class="group flex h-10 items-center gap-3 rounded-md px-3 text-sm transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
              :class="route.path === item.route ? 'bg-[var(--nav-hover)] text-[var(--text)]' : ''"
              :title="collapsed ? item.name : undefined"
            >
              <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" />
              <span v-if="!collapsed" class="min-w-0 flex-1 truncate">{{ item.name }}</span>
              <span
                v-if="item.route === '/admin/users' && pendingUsers > 0 && !collapsed"
                class="rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-slate-900"
              >
                {{ pendingUsers }}
              </span>
              <span
                v-else-if="item.route === '/admin/users' && pendingUsers > 0"
                class="absolute right-2 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-400"
              />
            </RouterLink>
          </div>
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
          <div ref="userMenuRef" class="relative">
            <button
              class="grid h-9 w-9 place-items-center rounded-md border border-[var(--surface-border)] text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)]"
              @click="toggleUserMenu"
            >
            <CircleUser class="h-5 w-5" />
            </button>
            <Transition name="fade">
              <div
                v-if="openUserMenu"
                class="absolute right-0 top-full z-40 mt-1.5 w-56 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] shadow-lg"
              >
                <div class="border-b border-[var(--surface-border)] px-4 py-3">
                  <div class="text-sm font-semibold text-[var(--text)]">
                    {{ auth.profile?.display_name || auth.profile?.username }}
                  </div>
                  <div class="mt-0.5 text-[11px] text-[var(--text-secondary)]">
                    系统管理员
                  </div>
                </div>
                <button
                  class="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
                  @click="handleLogout"
                >
                  <LogOut class="h-4 w-4" />
                  退出登录
                </button>
              </div>
            </Transition>
          </div>
        </div>
      </header>

      <main class="p-5 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

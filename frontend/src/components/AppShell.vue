<script setup lang="ts">
import { computed, nextTick, onMounted, provide, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Car,
  ChevronRight,
  CircleUser,
  Clock,
  Container,
  Database,
  FileText,
  Film,
  Grid3X3,
  Hash,
  Heading,
  Image,
  Keyboard,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Menu,
  Moon,
  Puzzle,
  ShieldCheck,
  Star,
  Sun,
  UserCog,
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

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toolsStore = useToolsStore()
const theme = useTheme()
const { addRecent } = useRecent()

// Collapse is a user preference, so it must survive navigation and reload.
// (The static baseline has no state at all, so this is a deliberate addition,
// not a visual deviation.)
const collapsed = ref(localStorage.getItem('sidebar-collapsed') === '1')
const searchQuery = ref('')
const pendingUsers = ref(0)
const openUserMenu = ref(false)
const userMenuRef = ref<HTMLElement | null>(null)

const ICON_MAP: Record<string, Icon> = {
  Container, Database, Zap, Keyboard, Puzzle, Heading,
  Car, Image, Hash, Film, ListTodo, Grid3X3, Star,
}

const adminNav = [
  { name: '用户管理', route: '/admin/users', icon: UserCog },
  { name: '角色权限', route: '/admin/roles', icon: ShieldCheck },
  { name: '审计日志', route: '/admin/audit-logs', icon: FileText },
]

function toNav(tool: Tool) {
  return { id: tool.id, name: tool.name, icon: ICON_MAP[tool.icon] ?? LayoutDashboard, route: toolPath(tool) }
}

// groupedTools is ordered by tools.sort_order, so the DB drives group order.
const groups = computed(() =>
  toolsStore.groupedTools.map((g) => ({ name: g.name, items: g.tools.map(toNav) })),
)

// Drawer open/closed state, keyed by group name. Defaults to open; unknown new
// groups fall through to open as well.
const openGroups = reactive<Record<string, boolean>>({})
function groupOpen(name: string) {
  return openGroups[name] !== false
}

function toggleGroup(name: string) {
  // Collapsed rail has no room for drawers; expand the sidebar first.
  if (collapsed.value) { collapsed.value = false; return }
  openGroups[name] = !groupOpen(name)
}

const currentTitle = computed(() => {
  const toolId = route.meta.toolId as string | undefined
  if (toolId) {
    const tool = toolsStore.tools.find((t) => t.id === toolId)
    if (tool?.name) return tool.name
  }
  const title = route.meta.title as string | undefined
  return title || 'Cloud SaaS Toolkit'
})

function isRouteActive(target: string) {
  return target === '/' ? route.path === '/' : route.path === target
}

async function goAnchor(id: 'recent' | 'favorites') {
  // Fixed nav entries are scroll anchors on the dashboard, not separate routes.
  if (route.path !== '/') await router.push('/')
  await nextTick()
  await new Promise((r) => setTimeout(r, 60))
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function toggleSidebar() {
  collapsed.value = !collapsed.value
}

watch(collapsed, (v) => localStorage.setItem('sidebar-collapsed', v ? '1' : '0'))

async function loadPendingCount() {
  if (!auth.isAdmin) return
  const { count, error } = await supabase
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
  if (!error) pendingUsers.value = count ?? 0
}

function toggleUserMenu() {
  openUserMenu.value = !openUserMenu.value
}

async function handleLogout() {
  openUserMenu.value = false
  await auth.signOut()
  router.replace({ name: 'login' })
}

function onOutsideClick(e: MouseEvent) {
  if (userMenuRef.value && !userMenuRef.value.contains(e.target as Node)) openUserMenu.value = false
}

watch(openUserMenu, (val) => {
  if (val) nextTick(() => document.addEventListener('click', onOutsideClick))
  else document.removeEventListener('click', onOutsideClick)
})

onMounted(() => {
  // Re-entering the workspace is when an admin's permission change should show up.
  toolsStore.load(true)
  loadPendingCount()
})

provide(DASHBOARD_SEARCH_KEY, searchQuery)
</script>

<template>
  <div class="app">
    <aside class="sidebar" :class="{ collapsed }">
      <div class="brand">
        <div class="brand-logo">C</div>
        <div class="brand-name">Cloud Toolkit</div>
        <button
          class="sidebar-collapse-btn"
          :title="collapsed ? '展开菜单' : '收起菜单'"
          @click="toggleSidebar"
        >
          <Menu />
        </button>
      </div>

      <nav class="nav">
        <!-- 固定项：不参与抽屉 -->
        <div class="fixed-nav">
          <RouterLink to="/" class="nav-item" :class="{ active: isRouteActive('/') }">
            <LayoutDashboard /><span>概览</span>
          </RouterLink>
          <button class="nav-item" @click="goAnchor('recent')">
            <Clock /><span>最近使用</span>
          </button>
          <button class="nav-item" @click="goAnchor('favorites')">
            <Star /><span>收藏</span>
          </button>
        </div>

        <div v-if="groups.length" class="divider-text">工具分组</div>

        <div
          v-for="group in groups"
          :key="group.name"
          class="nav-group"
          :class="{ closed: !groupOpen(group.name) }"
        >
          <button class="nav-group-header" @click="toggleGroup(group.name)">
            <span class="grp-dot" />
            <span class="grp-name">{{ group.name }}</span>
            <ChevronRight class="chev" :class="{ open: groupOpen(group.name) }" />
          </button>
          <div class="nav-items">
            <RouterLink
              v-for="item in group.items"
              :key="item.id"
              :to="item.route"
              class="nav-item"
              :class="{ active: isRouteActive(item.route) }"
              :title="item.name"
              @click="addRecent(item.id)"
            >
              <component :is="item.icon" /><span>{{ item.name }}</span>
            </RouterLink>
          </div>
        </div>

        <div v-if="toolsStore.loading" class="nav-loading">正在加载工具…</div>

        <!-- 管理面板：仅 admin -->
        <div v-if="auth.isAdmin" class="nav-group" :class="{ closed: !groupOpen('__admin') }">
          <button class="nav-group-header" @click="toggleGroup('__admin')">
            <span class="grp-dot" />
            <span class="grp-name">管理面板</span>
            <ChevronRight class="chev" :class="{ open: groupOpen('__admin') }" />
          </button>
          <div class="nav-items">
            <RouterLink
              v-for="item in adminNav"
              :key="item.route"
              :to="item.route"
              class="nav-item"
              :class="{ active: isRouteActive(item.route) }"
              :title="item.name"
            >
              <component :is="item.icon" /><span>{{ item.name }}</span>
              <span
                v-if="item.route === '/admin/users' && pendingUsers > 0 && !collapsed"
                class="badge"
              >{{ pendingUsers }}</span>
            </RouterLink>
          </div>
        </div>
      </nav>

      <div class="side-card">
        <h4>Cloud Toolkit</h4>
        <p>速查、数据与图形文本工具的统一入口，权限与菜单已收口。</p>
        <button @click="router.push('/')">回到概览</button>
      </div>

      <div class="sidebar-footer">
        <div class="user-row">
          <div class="user-dot">{{ (auth.profile?.display_name || auth.profile?.username || 'FY').slice(0, 2).toUpperCase() }}</div>
          <span>{{ auth.profile?.display_name || auth.profile?.username || 'FynKatz' }} · {{ auth.isAdmin ? 'Admin' : 'Member' }}</span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <span class="topbar-breadcrumb">Cloud Toolkit / <b>{{ currentTitle }}</b></span>
        <div class="spacer" />
        <button
          class="icon-btn"
          :title="theme.isDark.value ? '切换到日间模式' : '切换到暗夜模式'"
          @click="theme.toggle()"
        >
          <Sun v-if="theme.isDark.value" />
          <Moon v-else />
        </button>
        <div ref="userMenuRef" class="menu-wrap">
          <button class="icon-btn" title="账户" @click="toggleUserMenu"><CircleUser /></button>
          <Transition name="fade">
            <div v-if="openUserMenu" class="user-pop">
              <div class="pop-head">
                <div class="pop-name">{{ auth.profile?.display_name || auth.profile?.username }}</div>
                <div class="pop-role">{{ auth.isAdmin ? '系统管理员' : '普通成员' }}</div>
              </div>
              <button class="pop-item" @click="handleLogout"><LogOut /><span>退出登录</span></button>
            </div>
          </Transition>
        </div>
      </header>

      <div class="content">
        <RouterView />
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 以下样式逐条对照 docs/design/baseline/dashboard-layout.html。
   基线里写死的 #fff / #fbfbfd 等一律换成主题 token，否则暗夜模式会失效。 */
.app { display: flex; height: 100vh; background: var(--page); color: var(--ink); }

/* ---------- sidebar ---------- */
.sidebar {
  width: 220px; min-width: 220px; background: var(--sidebar-bg);
  border-right: 1px solid var(--sidebar-border); padding: 16px 0;
  display: flex; flex-direction: column; overflow: hidden;
  transition: width .18s, min-width .18s;
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 16px 14px; }
.brand-logo {
  width: 30px; height: 30px; border-radius: 9px; background: var(--violet);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 14px; flex-shrink: 0;
}
.brand-name { font-weight: 650; font-size: 14.5px; white-space: nowrap; overflow: hidden; }
.sidebar-collapse-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  background: none; border: none; cursor: pointer; color: var(--ink-3);
  border-radius: 8px; flex-shrink: 0; margin-left: auto; padding: 0;
}
.sidebar-collapse-btn:hover { background: var(--hover); color: var(--ink); }
.sidebar-collapse-btn :deep(svg) { width: 16px; height: 16px; }

.sidebar.collapsed { width: 56px; min-width: 56px; padding: 12px 0; }
.sidebar.collapsed .brand { justify-content: center; padding: 0 0 14px; }
.sidebar.collapsed .brand-logo,
.sidebar.collapsed .brand-name { display: none; }
.sidebar.collapsed .sidebar-collapse-btn { margin-left: 0; }
.sidebar.collapsed .divider-text,
.sidebar.collapsed .side-card,
.sidebar.collapsed .nav-loading { display: none; }
.sidebar.collapsed .grp-name,
.sidebar.collapsed .chev { display: none; }
.sidebar.collapsed .nav-group-header { justify-content: center; height: 44px; width: 44px; padding: 0; margin: 0 auto 6px; }
.sidebar.collapsed .nav-items { flex-direction: column; align-items: center; gap: 6px; margin: 0; }
.sidebar.collapsed .nav-group.closed .nav-items { display: flex; }
.sidebar.collapsed .fixed-nav { display: flex; flex-direction: column; align-items: center; gap: 4px; }

/* 收缩态：所有条目变成 44×44 图标格，图标 20px 居中 */
.sidebar.collapsed .nav-item {
  width: 44px; height: 44px; min-width: 44px; min-height: 44px;
  padding: 0; gap: 0; margin: 0 auto; font-size: 0; border-radius: var(--radius-sm);
  justify-content: center;
}
.sidebar.collapsed .nav-item :deep(svg) { width: 20px; height: 20px; }
.sidebar.collapsed .nav-item span { display: none; }
.sidebar.collapsed .sidebar-footer .user-row { justify-content: center; gap: 0; padding: 4px 0; }
.sidebar.collapsed .sidebar-footer .user-row span { display: none; }

.nav { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 0 10px; }
.nav-loading { padding: 4px 10px; font-size: 11.5px; color: var(--ink-3); }

/* 导航项（展开态基础样式，固定项与抽屉项共用） */
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px;
  border-radius: 9px; color: var(--ink-2); font-size: 13.5px; cursor: pointer;
  margin-bottom: 2px; border: none; background: none; width: 100%;
  text-align: left; font-family: inherit; text-decoration: none;
  transition: background .12s, color .12s;
}
.nav-item:hover { background: var(--hover); color: var(--ink); }
.nav-item.active { background: var(--violet-soft); color: var(--violet); font-weight: 600; }
.nav-item :deep(svg) { width: 16px; height: 16px; flex-shrink: 0; }
.nav-item span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.fixed-nav { margin-bottom: 12px; }
.divider-text {
  display: flex; align-items: center; gap: 10px; padding: 4px 10px 8px;
  color: var(--ink-3); font-size: 10.5px; font-weight: 600;
  text-transform: uppercase; letter-spacing: .5px;
}

.nav-group { margin-bottom: 6px; }
.nav-group-header {
  display: flex; align-items: center; gap: 10px; width: 100%; height: 34px;
  padding: 0 10px; border: none; background: none; cursor: pointer;
  color: var(--ink-2); font-family: inherit; font-size: 12px; font-weight: 600;
  text-align: left; border-radius: 8px; transition: color .16s, background .16s;
}
.nav-group-header:hover { background: var(--hover); color: var(--ink); }
.grp-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--ink-2); flex-shrink: 0; }
.grp-name { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.chev { width: 12px; height: 12px; margin-left: auto; opacity: .5; transition: transform .16s, opacity .16s; flex-shrink: 0; }
.chev.open { transform: rotate(90deg); opacity: 1; }
.nav-items { display: flex; flex-direction: column; gap: 2px; margin-left: 14px; }
.nav-group.closed .nav-items { display: none; }
.nav-group.closed .chev { transform: rotate(0deg); opacity: .5; }

.badge {
  margin-left: auto; border-radius: 99px; background: var(--lime); color: var(--lime-fg);
  font-size: 10.5px; font-weight: 700; padding: 1px 6px;
}

.side-card {
  margin: 12px 14px 0; padding: 14px; border-radius: var(--radius);
  background: linear-gradient(160deg, var(--violet), #7a5cff); color: #fff;
}
.side-card h4 { font-size: 13px; font-weight: 650; }
.side-card p { font-size: 11.5px; opacity: .85; margin-top: 4px; line-height: 1.45; }
.side-card button {
  margin-top: 10px; width: 100%; border: none; border-radius: 8px;
  background: #fff; color: var(--violet); font-weight: 650; font-size: 12.5px;
  padding: 7px 0; cursor: pointer; font-family: inherit;
}

.sidebar-footer { border-top: 1px solid var(--sidebar-border); padding: 8px 4px; margin-top: auto; }
.user-row { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 9px; color: var(--ink-2); font-size: 12px; }
.user-row span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.user-dot {
  width: 22px; height: 22px; border-radius: 50%; background: var(--violet);
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 600; flex-shrink: 0;
}

/* ---------- main ---------- */
.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar {
  height: 56px; min-height: 56px; display: flex; align-items: center; gap: 14px;
  padding: 0 28px; border-bottom: 1px solid var(--line); background: var(--card);
}
.topbar-breadcrumb { font-size: 13px; color: var(--ink-3); }
.topbar-breadcrumb b { color: var(--ink); font-weight: 650; }
.spacer { flex: 1; }
.icon-btn {
  width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;
  border: 1px solid var(--line); background: var(--card); border-radius: 9px;
  color: var(--ink-2); cursor: pointer; padding: 0;
}
.icon-btn:hover { background: var(--hover); color: var(--ink); }
.icon-btn :deep(svg) { width: 16px; height: 16px; }

.menu-wrap { position: relative; }
.user-pop {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 40; width: 200px;
  border: 1px solid var(--line); background: var(--card); border-radius: var(--radius-sm);
  box-shadow: 0 8px 28px rgba(0, 0, 0, .12); overflow: hidden;
}
.pop-head { border-bottom: 1px solid var(--line); padding: 12px 14px; }
.pop-name { font-size: 13px; font-weight: 650; color: var(--ink); }
.pop-role { margin-top: 2px; font-size: 11px; color: var(--ink-3); }
.pop-item {
  display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px 14px;
  border: none; background: none; cursor: pointer; font-family: inherit;
  font-size: 12.5px; color: var(--ink-2); text-align: left;
}
.pop-item:hover { background: var(--hover); color: var(--ink); }
.pop-item :deep(svg) { width: 15px; height: 15px; }

.content { flex: 1; overflow-y: auto; padding: 24px 28px 48px; background: var(--page); }

.fade-enter-active, .fade-leave-active { transition: opacity .15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>

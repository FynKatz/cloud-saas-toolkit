<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Car,
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
  Megaphone,
  Puzzle,
  ShieldCheck,
  Star,
  UserCog,
  Zap,
} from 'lucide-vue-next'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
import { usePreferencesStore } from '../stores/preferences'
import type { L1Context } from '../stores/preferences'
import { useRecent } from '../composables/useRecent'
import { supabase } from '../lib/supabase'
import { useFavorites } from '../composables/useFavorites'
import { useNotifications, NOTIFICATION_KEY } from '../composables/useNotifications'
import { toolPath } from '../types/tools'
import type { Tool } from '../types/tools'
import { i18n } from '../i18n'
import PrimaryRail from './v2/PrimaryRail.vue'
import ContextSidebar from './ContextSidebar.vue'
import Topbar from './Topbar.vue'
import SearchPalette from './SearchPalette.vue'
import ErrorBoundary from './v2/ErrorBoundary.vue'
import Toast from './v2/Toast.vue'
import NotificationBannerV2 from './NotificationBannerV2.vue'
import DashboardBanner from './DashboardBanner.vue'
import type ToastComponent from './v2/Toast.vue'
import MobileBottomBar from './MobileBottomBar.vue'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const toolsStore = useToolsStore()
const prefs = usePreferencesStore()
const { addRecent } = useRecent()
const { isFavorited } = useFavorites(computed(() => auth.user?.id || ''))
const { unreadCount } = useNotifications()
const notifications = useNotifications()
provide(NOTIFICATION_KEY, notifications)
const { t } = i18n.global
const toastRef = ref<InstanceType<typeof ToastComponent> | null>(null)

function $toast(opts: { type: 'success' | 'error' | 'warning' | 'info'; title: string; message?: string; duration?: number }): string {
  return toastRef.value?.add(opts) ?? ''
}
;(window as any).__v2_toast = $toast

// ========== L1 上下文 ==========
const l1Context = computed<L1Context>(() => prefs.l1ActiveContext)

function setL1Context(ctx: L1Context | 'search') {
  if (ctx === 'search') {
    searchOpen.value = true
    return
  }
  if (l1Context.value === ctx) return
  prefs.setL1Context(ctx)
  prefs.setSidebarCollapsed(false)
  if (ctx === 'workspace') {
    if (route.path.startsWith('/admin') || route.path === '/notifications' || route.path === '/change-password') {
      router.push('/')
    }
  }
  if (ctx === 'notifications') router.push('/notifications')
  if (ctx === 'admin') router.push('/admin/data/regions')
}

// sync l1Context from route
watch(() => route.path, (p) => {
  if (p.startsWith('/admin') && prefs.l1ActiveContext !== 'admin') prefs.setL1Context('admin')
  else if (p === '/notifications' && prefs.l1ActiveContext !== 'notifications') prefs.setL1Context('notifications')
  else if (!p.startsWith('/admin') && p !== '/notifications' && p !== '/change-password' && p !== '/login' && p !== '/register' && p !== '/pending' && p !== '/rejected' && p !== '/deleted') {
    if (prefs.l1ActiveContext !== 'workspace') prefs.setL1Context('workspace')
  }
}, { immediate: true })

// ========== L2 收折 ==========
const sidebarCollapsed = computed(() => prefs.sidebarCollapsed)
function toggleSidebar() { prefs.setSidebarCollapsed(!sidebarCollapsed.value) }

// ========== Popovers ==========
const labelPanelOpen = ref(false)
const avatarOpen = ref(false)
const labelPanelTimer = ref<ReturnType<typeof setTimeout> | null>(null)

function openLabelPanel() {
  if (labelPanelTimer.value) clearTimeout(labelPanelTimer.value)
  labelPanelTimer.value = setTimeout(() => { labelPanelOpen.value = true }, 300)
}
function closeLabelPanel() {
  if (labelPanelTimer.value) clearTimeout(labelPanelTimer.value)
  labelPanelTimer.value = setTimeout(() => { labelPanelOpen.value = false }, 150)
}
function toggleLabelPanel() { labelPanelOpen.value = !labelPanelOpen.value }
function toggleAvatar() { avatarOpen.value = !avatarOpen.value }

// ========== Search ==========
const searchOpen = ref(false)

// ========== Esc 总线 (LIFO) ==========
type Openable = 'search' | 'avatar' | 'label-panel' | 'mobile-drawer' | 'modal' | 'drawer'
const escStack = ref<Openable[]>([])

function escPush(item: Openable) { escStack.value = [item, ...escStack.value.filter(x => x !== item)] }
function escRemove(item: Openable) { escStack.value = escStack.value.filter(x => x !== item) }

watch(searchOpen, v => v ? escPush('search') : escRemove('search'))
watch(avatarOpen, v => v ? escPush('avatar') : escRemove('avatar'))
watch(labelPanelOpen, v => v ? escPush('label-panel') : escRemove('label-panel'))

function handleEsc() {
  const top = escStack.value[0]
  if (!top) return
  switch (top) {
    case 'search': searchOpen.value = false; break
    case 'avatar': avatarOpen.value = false; break
    case 'label-panel': labelPanelOpen.value = false; break
    case 'mobile-drawer': mobileL2Open.value = false; break
  }
}

// ========== 键盘快捷键 ==========
function handleKeydown(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement).tagName
  const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target as HTMLElement).isContentEditable
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    if (!isInput) { e.preventDefault(); searchOpen.value = true }
    return
  }
  if ((e.metaKey || e.ctrlKey) && e.key === '\\') {
    if (isInput) return
    e.preventDefault()
    toggleSidebar()
    return
  }
  if (e.key === 'Escape') { handleEsc(); return }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  notifications.loadBanner()
})
onBeforeUnmount(() => { document.removeEventListener('keydown', handleKeydown) })

// ========== 离线检测 ==========
const offline = ref(!navigator.onLine)
function onOnline() { offline.value = false }
function onOffline() { offline.value = true }
onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
})

// ========== 主题 / 语言 ==========
const theme = computed(() => prefs.theme)
const locale = computed(() => prefs.locale)

function setLocale(l: 'zh' | 'en') {
  prefs.setLocale(l)
  i18n.global.locale.value = l
}

function toggleLocale() {
  setLocale(locale.value === 'zh' ? 'en' : 'zh')
}

// ========== 登出 ==========
async function handleLogout() {
  avatarOpen.value = false
  await auth.signOut?.()
  router.push('/login')
}

// ========== DashboardBanner ==========
const dashboardBannerVisible = ref(true)
function dismissDashboardBanner() { dashboardBannerVisible.value = false }

// ========== Mobile L2 ==========
const mobileL2Open = ref(false)
function openMobileL2() { mobileL2Open.value = true }
function closeMobileL2() { mobileL2Open.value = false }
watch(mobileL2Open, v => v ? escPush('mobile-drawer') : escRemove('mobile-drawer'))

// ========== isMobile ==========
const isMobile = ref(false)
let _mobileHandler: ((e: MediaQueryListEvent) => void) | null = null
onMounted(() => {
  const mq = window.matchMedia('(max-width: 768px)')
  isMobile.value = mq.matches
  _mobileHandler = (e) => { isMobile.value = e.matches }
  mq.addEventListener('change', _mobileHandler)
})
onBeforeUnmount(() => {
  if (_mobileHandler) {
    window.matchMedia('(max-width: 768px)').removeEventListener('change', _mobileHandler)
    _mobileHandler = null
  }
})

// ========== Tool icons ==========
const ICON_MAP: Record<string, any> = {
  Container, Database, Zap, Keyboard, Puzzle, Heading, Car, Image, Hash, Film, ListTodo, Grid3X3, Star,
}
function toolIcon(tool: Tool) { return ICON_MAP[tool.icon] ?? LayoutDashboard }

// ========== L2 导航 ==========
const recentTools = computed(() => {
  const r = useRecent()
  return r.recentTools(toolsStore.allowedTools).map(t => ({
    id: t.id, name: t.name, icon: toolIcon(t), route: toolPath(t),
  }))
})
const favoriteTools = computed(() =>
  toolsStore.allowedTools.filter(t => isFavorited(t.id)).map(t => ({
    id: t.id, name: t.name, icon: toolIcon(t), route: toolPath(t),
  }))
)
const toolGroups = computed(() =>
  toolsStore.groupedTools.map(g => ({
    name: g.name,
    items: g.tools.map(t => ({ id: t.id, name: t.name, icon: toolIcon(t), route: toolPath(t) })),
  }))
)

const adminNav = [
  { id: 'admin-data', name: t('nav.dataManagement'), icon: Database, route: '/admin/data' },
  { id: 'admin-users', name: t('nav.userManagement'), icon: UserCog, route: '/admin/users' },
  { id: 'admin-notifications', name: t('nav.notificationManagement'), icon: Megaphone, route: '/admin/notifications' },
  { id: 'admin-roles', name: t('nav.rolePermissions'), icon: ShieldCheck, route: '/admin/roles' },
  { id: 'admin-audit-logs', name: t('nav.auditLogs'), icon: FileText, route: '/admin/audit-logs' },
]

const collapsedGroups = ref<Record<string, boolean>>({})
function toggleGroup(name: string) {
  if (sidebarCollapsed.value) prefs.setSidebarCollapsed(false)
  collapsedGroups.value[name] = !collapsedGroups.value[name]
}

const l2SearchQuery = ref('')

// 面包屑
const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const crumbs: { label: string; route?: string }[] = []
  if (parts.length === 0) {
    crumbs.push({ label: t('nav.overview') })
  } else if (parts[0] === 'admin') {
    crumbs.push({ label: t('nav.adminPanel') })
    if (parts[1] === 'users') crumbs.push({ label: t('nav.userManagement') })
    else if (parts[1] === 'roles') crumbs.push({ label: t('nav.rolePermissions') })
    else if (parts[1] === 'audit-logs') crumbs.push({ label: t('nav.auditLogs') })
    else if (parts[1] === 'data') crumbs.push({ label: t('nav.dataManagement') })
    else if (parts[1] === 'notifications') crumbs.push({ label: t('nav.notificationManagement') })
  } else if (parts[0] === 'notifications') {
    crumbs.push({ label: t('nav.notifications') })
  } else if (parts[0]) {
    const tool = toolsStore.allowedTools.find(t => toolPath(t) === `/${parts[0]}`)
    if (tool) {
      crumbs.push({ label: t('nav.workspace'), route: '/' })
      crumbs.push({ label: tool.name })
    }
  }
  return crumbs
})

function navigateTo(path: string, toolId?: string) {
  if (sidebarCollapsed.value) prefs.setSidebarCollapsed(false)
  if (toolId) addRecent(toolId)
  searchOpen.value = false
  avatarOpen.value = false
  router.push(path)
}

function isActiveRoute(path: string) { return route.path === path || route.path.startsWith(path + '/') }

// Pending admin count
const pendingUsers = ref(0)
async function refreshPending() {
  if (!auth.isAdmin || !auth.user) { pendingUsers.value = 0; return }
  try {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending')
    pendingUsers.value = count ?? 0
  } catch { pendingUsers.value = 0 }
}
watch(() => auth.isAdmin, v => { if (v) refreshPending() }, { immediate: true })
</script>

<template>
  <div class="v2-shell">
    <a href="#main-content" class="v2-skip-link">跳到内容</a>

    <PrimaryRail
      :l1-context="l1Context"
      :label-panel-open="labelPanelOpen"
      :is-admin="auth.isAdmin ?? false"
      :pending-users="pendingUsers"
      :unread-count="unreadCount"
      @set-l1-context="setL1Context"
      @open-search="searchOpen = true"
      @toggle-label-panel="toggleLabelPanel"
      @open-label-panel="openLabelPanel"
      @close-label-panel="closeLabelPanel"
    />

    <ContextSidebar
      :l1-context="l1Context"
      :sidebar-collapsed="sidebarCollapsed"
      :mobile-l2-open="mobileL2Open"
      :is-mobile="isMobile"
      :recent-tools="recentTools"
      :favorite-tools="favoriteTools"
      :tool-groups="toolGroups"
      :admin-nav="adminNav"
      :collapsed-groups="collapsedGroups"
      :l2-search-query="l2SearchQuery"
      :active-route="isActiveRoute"
      @toggle-sidebar="toggleSidebar"
      @navigate-to="navigateTo"
      @toggle-group="toggleGroup"
      @update-l2-search="(q: string) => l2SearchQuery = q"
      @close-mobile-l2="closeMobileL2"
    />

    <MobileBottomBar
      @open-sidebar="openMobileL2"
      :l1-context="l1Context"
      :is-admin="auth.isAdmin ?? false"
      :pending-users="pendingUsers"
      :unread-count="unreadCount"
      @select="setL1Context"
    />

    <div class="v2-main">
      <Topbar
        :sidebar-collapsed="sidebarCollapsed"
        :offline="offline"
        :breadcrumbs="breadcrumbs"
        :avatar-open="avatarOpen"
        :username="auth.profile?.display_name || auth.profile?.username || ''"
        :is-admin="auth.isAdmin ?? false"
        :theme="theme"
        :locale="locale"
        @toggle-sidebar="toggleSidebar"
        @navigate-to="(path: string) => navigateTo(path)"
        @toggle-theme="prefs.toggleTheme"
        @toggle-locale="toggleLocale"
        @toggle-avatar="toggleAvatar"
        @change-password="router.push('/change-password'); avatarOpen = false"
        @logout="handleLogout"
      />
      <main id="main-content" class="v2-content">
        <DashboardBanner
          :visible="dashboardBannerVisible"
          title="欢迎回来"
          :description="auth.profile?.display_name ? `Hi, ${auth.profile.display_name}` : '开启高效的一天'"
          @close="dismissDashboardBanner"
        >
        </DashboardBanner>
        <ErrorBoundary>
          <RouterView />
        </ErrorBoundary>
      </main>
    </div>
  </div>

  <NotificationBannerV2 />
  <SearchPalette
    :open="searchOpen"
    :tools="toolsStore.allowedTools"
    :icon-for="toolIcon"
    @close="searchOpen = false"
    @select="(tool: Tool) => navigateTo(toolPath(tool), tool.id)"
  />

  <Toast ref="toastRef" />
</template>

<style scoped>
.v2-shell { display: flex; height: 100vh; overflow: hidden; background: var(--v2-content-bg); }
.v2-skip-link { position: absolute; top: -100px; left: 8px; padding: 8px 14px; background: var(--v2-accent); color: #fff; border-radius: var(--v2-radius-sm); z-index: 999; font-size: 13px; }
.v2-skip-link:focus { top: 8px; }
.v2-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.v2-content { flex: 1; overflow-y: auto; padding: 24px 28px 48px; }

@media (max-width: 768px) {
  .v2-content { padding: 16px 16px 32px 16px; }
}
</style>

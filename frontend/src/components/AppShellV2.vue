<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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
import { getToolIcon, toolGlyph } from '../lib/toolIcons'
import type { NavGroup, NavItem, NavToolItem } from '../types/nav'
import { i18n } from '../i18n'
import PrimaryRail from './v2/PrimaryRail.vue'
import GlobalTopbar from './v2/GlobalTopbar.vue'
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
    // /change-password 在壳外（router 里与 path:'/' 平级），这里永远不会命中，已删
    if (route.path.startsWith('/admin') || route.path === '/notifications') {
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
  else if (!p.startsWith('/admin') && p !== '/notifications' && p !== '/login' && p !== '/register' && p !== '/pending' && p !== '/rejected' && p !== '/deleted') {
    if (prefs.l1ActiveContext !== 'workspace') prefs.setL1Context('workspace')
  }
}, { immediate: true })

// 权限还没落定或已被收回时，不能留着 admin 上下文渲染管理台菜单。
// 必须等 auth.initialized：prefs.init() 在挂载前就会从 localStorage 恢复出
// 'admin'，此时 auth.isAdmin 还是 false，immediate 的 watch 会把真管理员弹回 workspace。
watch([() => auth.initialized, () => auth.isAdmin], ([ready, admin]) => {
  if (ready && !admin && prefs.l1ActiveContext === 'admin') prefs.setL1Context('workspace')
})

// ========== L2 收折 ==========
const sidebarCollapsed = computed(() => prefs.sidebarCollapsed)
const avatarOpen = ref(false)
function toggleAvatar() { avatarOpen.value = !avatarOpen.value }

/**
 * 侧栏是否可见的唯一真值源。
 * sidebarCollapsed 是持久化的桌面偏好，在移动端是死值：直接拿它驱动图标，
 * 移动端点收起后图标不会变，等于说谎。
 */
const navVisible = computed(() => (isMobile.value ? mobileL2Open.value : !sidebarCollapsed.value))

function toggleSidebar() {
  // 移动端 L2 是抽屉，翻 sidebarCollapsed 对它没有任何效果（渲染条件是 mobileL2Open 兜底）
  if (isMobile.value) {
    mobileL2Open.value = !mobileL2Open.value
    return
  }
  prefs.setSidebarCollapsed(!sidebarCollapsed.value)
}

// ========== Search ==========
const searchOpen = ref(false)

// ========== Esc 总线 (LIFO) ==========
type Openable = 'search' | 'avatar' | 'mobile-drawer' | 'modal' | 'drawer'
const escStack = ref<Openable[]>([])

function escPush(item: Openable) { escStack.value = [item, ...escStack.value.filter(x => x !== item)] }
function escRemove(item: Openable) { escStack.value = escStack.value.filter(x => x !== item) }

watch(searchOpen, v => v ? escPush('search') : escRemove('search'))
watch(avatarOpen, v => v ? escPush('avatar') : escRemove('avatar'))

function handleEsc() {
  const top = escStack.value[0]
  if (!top) return
  switch (top) {
    case 'search': searchOpen.value = false; break
    case 'avatar': avatarOpen.value = false; break
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

/**
 * 移动端底部「用户」tab 打开头像下拉。
 * 必须先关抽屉：抽屉 z-index 55 高于顶栏浮层 30，不关的话下拉会被压在底下。
 */
function openMobileAvatar() {
  mobileL2Open.value = false
  avatarOpen.value = !avatarOpen.value
}

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

// ========== L2 导航 ==========
// 图标一律走 toolGlyph() 解析成 CuIcon glyph 名，不再维护第二份 ICON_MAP。
// 三个入口（最近使用 / 收藏 / 分组）全部由 allowedTools 派生，无权限的工具不会出现。
function navToolItem(t: Tool): NavToolItem {
  return {
    id: t.id,
    name: t.name,
    icon: toolGlyph(t.icon, t.id),
    route: toolPath(t),
    category: t.category,
    description: t.description,
    dataScope: t.data_scope,
  }
}

const recentTools = computed<NavToolItem[]>(() => {
  const r = useRecent()
  return r.recentTools(toolsStore.allowedTools).map(navToolItem)
})
const favoriteTools = computed<NavToolItem[]>(() =>
  toolsStore.allowedTools.filter(t => isFavorited(t.id)).map(navToolItem),
)
const toolGroups = computed<NavGroup[]>(() =>
  toolsStore.groupedTools.map(g => ({ name: g.name, items: g.tools.map(navToolItem) })),
)

// 必须是 computed：普通数组会让 t() 在 setup 只求值一次，切换中英文后管理台标签不重译。
// 也不能提到模块作用域 —— router 静态 import 本文件，t() 会在 main.ts 设定 locale 之前跑。
const adminNav = computed<NavItem[]>(() => [
  {
    id: 'admin-data',
    nameKey: 'nav.dataManagement',
    icon: 'database',
    route: '/admin/data',
    children: [
      { id: 'regions', nameKey: 'nav.dataRegions', route: '/admin/data/regions' },
      { id: 'malls', nameKey: 'nav.dataMalls', route: '/admin/data/malls' },
      { id: 'parkingLocations', nameKey: 'nav.dataParkingLocations', route: '/admin/data/parking-locations' },
    ],
  },
  { id: 'admin-users', nameKey: 'nav.userManagement', icon: 'user-plus', route: '/admin/users' },
  { id: 'admin-notifications', nameKey: 'nav.notificationManagement', icon: 'bell', route: '/admin/notifications' },
  { id: 'admin-roles', nameKey: 'nav.rolePermissions', icon: 'grid-dots', route: '/admin/roles' },
  { id: 'admin-audit-logs', nameKey: 'nav.auditLogs', icon: 'list-todo', route: '/admin/audit-logs' },
])

const collapsedGroups = computed<string[]>(() => prefs.collapsedGroups)
function toggleGroup(name: string) {
  if (!isMobile.value && sidebarCollapsed.value) prefs.setSidebarCollapsed(false)
  prefs.toggleGroupCollapsed(name)
}

const l2SearchQuery = ref('')

// 面包屑
const breadcrumbs = computed(() => {
  const parts = route.path.split('/').filter(Boolean)
  const crumbs: { label: string; route?: string }[] = []
  if (parts.length === 0) {
    crumbs.push({ label: t('nav.overview') })
  } else if (parts[0] === 'admin') {
    // 术语统一：L1 / L2 / 面包屑都用「管理台」，不再出现「管理面板」第三叫法
    crumbs.push({ label: t('nav.admin') })
    if (parts[1] === 'users') crumbs.push({ label: t('nav.userManagement') })
    else if (parts[1] === 'roles') crumbs.push({ label: t('nav.rolePermissions') })
    else if (parts[1] === 'audit-logs') crumbs.push({ label: t('nav.auditLogs') })
    else if (parts[1] === 'notifications') crumbs.push({ label: t('nav.notificationManagement') })
    else if (parts[1] === 'data') {
      crumbs.push({ label: t('nav.dataManagement'), route: '/admin/data' })
      // 第三级：L2 已经用父行 + 子行表达这三个子页，面包屑必须跟到同一深度
      if (parts[2] === 'regions') crumbs.push({ label: t('nav.dataRegions') })
      else if (parts[2] === 'malls') crumbs.push({ label: t('nav.dataMalls') })
      else if (parts[2] === 'parking-locations') crumbs.push({ label: t('nav.dataParkingLocations') })
    }
  } else if (parts[0] === 'notifications') {
    crumbs.push({ label: t('nav.notifications') })
  } else if (parts[0]) {
    const tool = toolsStore.allowedTools.find(t => toolPath(t) === `/${parts[0]}`)
    if (tool) {
      crumbs.push({ label: t('nav.workspace'), route: '/' })
      crumbs.push({ label: tool.name })
    } else {
      // toolPath 对未登记 id 回退 '/'，所以新工具漏登记时这里不能留空
      crumbs.push({ label: t('nav.workspace'), route: '/' })
      crumbs.push({ label: parts[0] })
    }
  }
  return crumbs
})

function navigateTo(path: string, toolId?: string) {
  if (!isMobile.value && sidebarCollapsed.value) prefs.setSidebarCollapsed(false)
  if (toolId) addRecent(toolId)
  searchOpen.value = false
  avatarOpen.value = false
  if (isMobile.value) mobileL2Open.value = false
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

    <GlobalTopbar
      :avatar-open="avatarOpen"
      :username="auth.profile?.display_name || auth.profile?.username || ''"
      :is-admin="auth.isAdmin ?? false"
      :theme="theme"
      :locale="locale"
      @toggle-theme="prefs.toggleTheme"
      @toggle-locale="toggleLocale"
      @toggle-avatar="toggleAvatar"
      @close-avatar="avatarOpen = false"
      @change-password="router.push('/change-password'); avatarOpen = false"
      @logout="handleLogout"
      @open-search="searchOpen = true"
      @open-workspace="setL1Context('workspace')"
    />

    <!-- 行容器必须有 min-height:0，否则 .v2-content 的 overflow-y:auto 会被内容撑高，
         整页多出第二条滚动条并把底部 tab bar 顶掉 -->
    <div class="v2-row">
      <PrimaryRail
        :l1-context="l1Context"
        :is-admin="auth.isAdmin ?? false"
        :pending-users="pendingUsers"
        :unread-count="unreadCount"
        @set-l1-context="setL1Context"
      />

      <ContextSidebar
        :l1-context="l1Context"
        :nav-visible="navVisible"
        :mobile-l2-open="mobileL2Open"
        :is-mobile="isMobile"
        :recent-tools="recentTools"
        :favorite-tools="favoriteTools"
        :tool-groups="toolGroups"
        :admin-nav="adminNav"
        :collapsed-groups="collapsedGroups"
        :l2-search-query="l2SearchQuery"
        :active-route="isActiveRoute"
        @navigate-to="navigateTo"
        @toggle-group="toggleGroup"
        @toggle-sidebar="toggleSidebar"
        @update-l2-search="(q: string) => l2SearchQuery = q"
        @close-mobile-l2="closeMobileL2"
      />

      <div class="v2-main">
        <Topbar
          :offline="offline"
          :sidebar-collapsed="sidebarCollapsed"
          :breadcrumbs="breadcrumbs"
          @navigate-to="(path: string) => navigateTo(path)"
          @toggle-sidebar="toggleSidebar"
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

    <MobileBottomBar
      @open-sidebar="openMobileL2"
      :l1-context="l1Context"
      :is-admin="auth.isAdmin ?? false"
      :pending-users="pendingUsers"
      :unread-count="unreadCount"
      :avatar-open="avatarOpen"
      @select="setL1Context"
      @open-avatar="openMobileAvatar"
    />
  </div>

  <NotificationBannerV2 />
  <SearchPalette
    :open="searchOpen"
    :tools="toolsStore.allowedTools"
    :icon-for="(t: Tool) => getToolIcon(t.icon, t.id)"
    @close="searchOpen = false"
    @select="(tool: Tool) => navigateTo(toolPath(tool), tool.id)"
  />

  <Toast ref="toastRef" />
</template>

<style scoped>
.v2-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  background: var(--v2-content-bg);
}
.v2-row { flex: 1; min-height: 0; display: flex; }
.v2-skip-link { position: absolute; top: -100px; left: 8px; padding: 8px 14px; background: var(--v2-accent); color: #fff; border-radius: var(--v2-radius-sm); z-index: 999; font-size: 13px; }
/* 全宽顶栏压在上方，聚焦时若还用 top:8px 会跳到顶栏底下 */
.v2-skip-link:focus { top: calc(var(--cu-topbar-height) + 8px); }
.v2-main { flex: 1; display: flex; flex-direction: column; min-width: 0; overflow: hidden; }
.v2-content { flex: 1; overflow-y: auto; padding: 24px 28px 48px; }

@media (max-width: 768px) {
  /* 底部 tab bar 是 fixed 48px，内容 padding-bottom 小于它会把最后一行永久压住 */
  .v2-content { padding: 16px 16px calc(var(--cu-mobile-tabbar-height) + 16px) 16px; }
}
</style>

import type { RouteRecordRaw, Router } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import AppShellV2 from '../components/AppShellV2.vue'
import DashboardView from '../views/DashboardView.vue'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('../views/auth/LoginView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/register',
    name: 'register',
    component: () => import('../views/auth/RegisterView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/pending',
    name: 'pending',
    component: () => import('../views/auth/PendingView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/rejected',
    name: 'rejected',
    component: () => import('../views/auth/RejectedView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/deleted',
    name: 'deleted',
    component: () => import('../views/auth/DeletedView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/change-password',
    name: 'change-password',
    component: () => import('../views/auth/ChangePasswordView.vue'),
    meta: { requiresAuth: true },
  },
  {
    path: '/',
    component: import.meta.env.VITE_NAV_V2 === '1' ? AppShellV2 : AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard' },
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('../views/NotificationCenterView.vue'),
        meta: { title: '系统通知', requiresAuth: true },
      },
      {
        path: 'admin/users',
        name: 'admin-users',
        component: () => import('../views/admin/UserManagementView.vue'),
        meta: { title: '用户管理', requiresAdmin: true },
      },
      {
        path: 'admin/roles',
        name: 'admin-roles',
        component: () => import('../views/admin/RoleManagementView.vue'),
        meta: { title: '角色权限', requiresAdmin: true },
      },
      {
        path: 'admin/audit-logs',
        name: 'admin-audit-logs',
        component: () => import('../views/admin/AuditLogView.vue'),
        meta: { title: '审计日志', requiresAdmin: true },
      },
      {
        path: 'admin/data',
        name: 'admin-data',
        component: () => import('../views/admin/DataManagementView.vue'),
        redirect: '/admin/data/regions',
        meta: { title: '数据管理', requiresAdmin: true },
        children: [
          {
            path: 'regions',
            name: 'admin-data-regions',
            component: () => import('../views/admin/RegionManagementView.vue'),
            meta: { title: '省市行政区', requiresAdmin: true },
          },
          {
            path: 'malls',
            name: 'admin-data-malls',
            component: () => import('../views/admin/MallManagementView.vue'),
            meta: { title: '商场管理', requiresAdmin: true },
          },
          {
            path: 'parking-locations',
            name: 'admin-data-parking-locations',
            component: () => import('../views/admin/ParkingLocationAdminView.vue'),
            meta: { title: '停车场管理', requiresAdmin: true },
          },
        ],
      },
      {
        path: 'admin/notifications',
        name: 'admin-notifications',
        component: () => import('../views/admin/NotificationManagementView.vue'),
        meta: { title: '系统通知', requiresAdmin: true },
      },
      {
        path: 'parking',
        name: 'parking',
        component: () => import('../views/ParkingView.vue'),
  meta: { title: '停车管理', toolId: 'parking' },
      },
      {
        path: 'todo',
        name: 'todo',
        component: () => import('../views/TodoView.vue'),
  meta: { title: 'Todo', toolId: 'todo' },
      },
      {
        path: 'sql',
        name: 'sql',
        component: () => import('../views/SqlCheatsheetView.vue'),
  meta: { title: 'SQL 速查', toolId: 'sql-cheatsheet' },
      },
      {
        path: 'redis',
        name: 'redis',
        component: () => import('../views/RedisCheatsheetView.vue'),
  meta: { title: 'Redis 速查', toolId: 'redis-cheatsheet' },
      },
      {
        path: 'docker',
        name: 'docker',
        component: () => import('../views/DockerK8sCheatsheetView.vue'),
  meta: { title: 'Docker & K8S 速查', toolId: 'docker-k8s-cheatsheet' },
      },
      {
        path: 'movie',
        name: 'movie',
        component: () => import('../views/MovieView.vue'),
  meta: { title: 'Movie', toolId: 'movie' },
      },
      {
        path: 'collage',
        name: 'collage',
        component: () => import('../views/ImageCollageView.vue'),
  meta: { title: 'Image Collage', toolId: 'image-stitch' },
      },
      {
        path: 'pixabay',
        name: 'pixabay',
        component: () => import('../views/PixabayDownloadView.vue'),
  meta: { title: 'Pixabay Downloader', toolId: 'pixabay-download' },
      },
      {
        path: 'text-stats',
        name: 'text-stats',
        component: () => import('../views/WordCountView.vue'),
  meta: { title: 'Text Statistics', toolId: 'word-count' },
      },
      {
        path: 'typora',
        name: 'typora',
        component: () => import('../views/TyporaShortcutsView.vue'),
  meta: { title: 'Typora 速查', toolId: 'typora-shortcuts' },
      },
      {
        path: 'chrome-pack',
        name: 'chrome-pack',
        component: () => import('../views/ChromeExtensionPackagingView.vue'),
  meta: { title: 'Chrome Extension Pack', toolId: 'chrome-extension-packaging' },
      },
      {
        path: 'markdown-heading',
        name: 'markdown-heading',
        component: () => import('../views/MarkdownHeadingView.vue'),
  meta: { title: 'Markdown Heading', toolId: 'markdown-heading' },
      },
    ],
  },
]

function isDevMode(): boolean {
  try {
    return (window as any).__DEV_AUTH === true
  } catch {
    return false
  }
}

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    // 冷加载时 init 内部会 await profile 查询。网络挂起时这个 await 不结算，
    // 守卫就一直 pending，用户看到的是永久空白页（比半空壳更糟）。
    // 加超时兜底：init 若 10s 没完成，下面按「profile 不可用」处理，落到登录页。
    // init 的 promise 仍在后台跑，成功后会正常写回状态。
    if (!auth.initialized) {
      await Promise.race([
        auth.init(),
        new Promise<void>((resolve) => setTimeout(resolve, 10000)),
      ])
    }

    // Dev mode — no Supabase: fake admin session and load all tools
    if (import.meta.env.DEV && isDevMode()) {
      // Let anything through; AppShell uses tools store for nav, seed it
      auth.user = { id: 'dev', email: 'dev@dev' } as any
      auth.isAdmin = true
      const toolsStore = useToolsStore()
      if (!toolsStore.initialized) {
        const { data } = await import('../lib/supabase').then(m =>
          m.supabase.from('tools').select('*').order('sort_order')
        ).catch(() => ({ data: null }))
        if (!data || data.length === 0) {
          // Offline — seed with hardcoded tools matching our routes
          // Offline DEV seed — must mirror public.tools exactly.
          // ids here were previously wrong ('text-stats' / 'chrome-pack'), which made the
          // route guard's hasTool(toolId) check fail and bounce those pages to /dashboard.
          // Regenerate with:
          //   sh scripts/supa-sql.sh "select id,name,category,icon,data_scope,writable,
          //     sort_order from public.tools order by sort_order"
          const offlineTools: any[] = [
            { id: 'sql-cheatsheet', name: 'SQL 速查', category: '速查参考', sort_order: 1, writable: false, data_scope: 'none', icon: 'Database' },
            { id: 'redis-cheatsheet', name: 'Redis 速查', category: '速查参考', sort_order: 2, writable: false, data_scope: 'none', icon: 'Zap' },
            { id: 'docker-k8s-cheatsheet', name: 'Docker & K8S 速查', category: '速查参考', sort_order: 3, writable: false, data_scope: 'none', icon: 'Container' },
            { id: 'typora-shortcuts', name: 'Typora 快捷键', category: '速查参考', sort_order: 4, writable: false, data_scope: 'none', icon: 'Keyboard' },
            { id: 'parking', name: '停车收费', category: '数据应用', sort_order: 5, writable: true, data_scope: 'shared', icon: 'Car' },
            { id: 'todo', name: 'Todo', category: '数据应用', sort_order: 6, writable: true, data_scope: 'private', icon: 'ListTodo' },
            { id: 'movie', name: '家庭电影', category: '数据应用', sort_order: 7, writable: true, data_scope: 'shared', icon: 'Film' },
            { id: 'image-stitch', name: '图片拼接', category: '图形工具', sort_order: 8, writable: false, data_scope: 'none', icon: 'Image' },
            { id: 'pixabay-download', name: 'Pixabay 下载', category: '图形工具', sort_order: 9, writable: false, data_scope: 'none', icon: 'Image' },
            { id: 'word-count', name: '字数统计', category: '文本工具', sort_order: 10, writable: false, data_scope: 'none', icon: 'Hash' },
            { id: 'chrome-extension-packaging', name: 'Chrome 扩展打包', category: '文本工具', sort_order: 11, writable: false, data_scope: 'none', icon: 'Puzzle' },
            { id: 'markdown-heading', name: 'Markdown 标题工具', category: '文本工具', sort_order: 12, writable: false, data_scope: 'none', icon: 'Heading' },
          ]
          toolsStore.tools = offlineTools as any
          toolsStore.initialized = true
        } else {
          toolsStore.tools = data as any
          toolsStore.initialized = true
        }
        // Grant all tools as edit
        for (const tool of toolsStore.tools) {
          toolsStore.permissions[tool.id] = 'edit'
        }
      }
      return true
    }

    const publicNames = new Set(['login', 'register'])
    if (publicNames.has(to.name as string)) {
      if (auth.isAuthenticated) {
        const s = auth.profile?.status
        if (s === 'approved') return { name: 'dashboard' }
        if (s === 'pending') return { name: 'pending' }
        if (s === 'rejected') return { name: 'rejected' }
        if (s === 'deleted') return { name: 'deleted' }
      }
      return true
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    // 会话存在但 profile 为 null（init 超时，或 refreshProfile 吞掉了网络错误）时，
    // 下面所有 status 分支都会落空并走到末尾 return true，
    // 用户就会带着 0 工具、无 admin 标记进入壳，渲染出一半空导航。
    // 补一次带错误返回的加载（同样加超时），仍失败就退回登录页，而不是给一个坏壳。
    if (!auth.profile) {
      const { error } = await Promise.race([
        auth.loadProfileChecked(),
        new Promise<{ error: string }>((resolve) =>
          setTimeout(() => resolve({ error: 'TIMEOUT' }), 8000),
        ),
      ])
      if (error) return { name: 'login', query: { redirect: to.fullPath } }
    }

    const s = auth.profile?.status

    if (to.name === 'change-password') {
      if (s === 'approved') return true
      return { name: 'login' }
    }

    if (s === 'approved') {
      if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'dashboard' }
      const toolId = to.meta.toolId as string | undefined
      if (toolId) {
        const toolsStore = useToolsStore()
        if (!toolsStore.initialized) await toolsStore.load()
        if (!toolsStore.hasTool(toolId)) return { name: 'dashboard' }
      }
      return true
    }

    if (s === 'pending' && to.name !== 'pending') return { name: 'pending' }
    if (s === 'rejected' && to.name !== 'rejected') return { name: 'rejected' }
    if (s === 'deleted' && to.name !== 'deleted') return { name: 'deleted' }

    return true
  })
}

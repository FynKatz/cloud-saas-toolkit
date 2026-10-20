import type { RouteRecordRaw, Router } from 'vue-router'
import AppShell from '../components/AppShell.vue'
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
    component: AppShell,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'dashboard',
        component: DashboardView,
        meta: { title: 'Dashboard' },
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
        path: 'parking',
        name: 'parking',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: '停车管理', toolId: 'parking' },
      },
      {
        path: 'todo',
        name: 'todo',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Todo', toolId: 'todo' },
      },
      {
        path: 'sql',
        name: 'sql',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'SQL 速查', toolId: 'sql-cheatsheet' },
      },
      {
        path: 'redis',
        name: 'redis',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Redis 速查', toolId: 'redis-cheatsheet' },
      },
      {
        path: 'docker',
        name: 'docker',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Docker & K8S 速查', toolId: 'docker-k8s-cheatsheet' },
      },
      {
        path: 'movie',
        name: 'movie',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Movie', toolId: 'movie' },
      },
      {
        path: 'collage',
        name: 'collage',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Image Collage', toolId: 'image-stitch' },
      },
      {
        path: 'pixabay',
        name: 'pixabay',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Pixabay Downloader', toolId: 'pixabay-download' },
      },
      {
        path: 'text-stats',
        name: 'text-stats',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Text Statistics', toolId: 'word-count' },
      },
      {
        path: 'typora',
        name: 'typora',
        component: () => import('../views/PlaceholderView.vue'),
  meta: { title: 'Typora 速查', toolId: 'typora-shortcuts' },
      },
      {
        path: 'chrome-pack',
        name: 'chrome-pack',
        component: () => import('../views/PlaceholderView.vue'),
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

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const auth = useAuthStore()

    if (!auth.initialized) {
      await auth.init()
    }

    const publicNames = new Set(['login', 'register'])
    if (publicNames.has(to.name as string)) {
      if (auth.isAuthenticated) {
        const s = auth.profile?.status
        if (s === 'approved' && !auth.mustChangePassword) return { name: 'dashboard' }
        if (s === 'approved' && auth.mustChangePassword) return { name: 'change-password' }
        if (s === 'pending') return { name: 'pending' }
        if (s === 'rejected') return { name: 'rejected' }
        if (s === 'deleted') return { name: 'deleted' }
      }
      return true
    }

    if (!auth.isAuthenticated) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }

    const s = auth.profile?.status

    if (to.name === 'change-password') {
      if (s === 'approved' && auth.mustChangePassword) return true
      return { name: s === 'approved' ? 'dashboard' : 'login' }
    }

    if (s === 'approved') {
      if (auth.mustChangePassword) return { name: 'change-password' }
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

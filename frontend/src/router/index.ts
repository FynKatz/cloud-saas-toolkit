import type { RouteRecordRaw, Router } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import DashboardView from '../views/DashboardView.vue'

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
        path: 'parking',
        name: 'parking',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: '停车管理' },
      },
      {
        path: 'todo',
        name: 'todo',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Todo' },
      },
      {
        path: 'sql',
        name: 'sql',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'SQL 速查' },
      },
      {
        path: 'redis',
        name: 'redis',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Redis 速查' },
      },
      {
        path: 'docker',
        name: 'docker',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Docker & K8S 速查' },
      },
      {
        path: 'movie',
        name: 'movie',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Movie' },
      },
      {
        path: 'collage',
        name: 'collage',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Image Collage' },
      },
      {
        path: 'pixabay',
        name: 'pixabay',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Pixabay Downloader' },
      },
      {
        path: 'text-stats',
        name: 'text-stats',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Text Statistics' },
      },
      {
        path: 'typora',
        name: 'typora',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Typora 速查' },
      },
      {
        path: 'chrome-pack',
        name: 'chrome-pack',
        component: () => import('../views/PlaceholderView.vue'),
        meta: { title: 'Chrome Extension Pack' },
      },
      {
        path: 'markdown-heading',
        name: 'markdown-heading',
        component: () => import('../views/MarkdownHeadingView.vue'),
        meta: { title: 'Markdown Heading' },
      },
    ],
  },
]

export function setupRouterGuards(router: Router) {
  router.beforeEach(async (to) => {
    const { useAuthStore } = await import('../stores/auth')
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
      return true
    }

    if (s === 'pending' && to.name !== 'pending') return { name: 'pending' }
    if (s === 'rejected' && to.name !== 'rejected') return { name: 'rejected' }
    if (s === 'deleted' && to.name !== 'deleted') return { name: 'deleted' }

    return true
  })
}

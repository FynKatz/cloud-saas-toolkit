import type { RouteRecordRaw } from 'vue-router'
import AppShell from '../components/AppShell.vue'
import DashboardView from '../views/DashboardView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: AppShell,
    children: [
      { path: '', name: 'dashboard', component: DashboardView, meta: { title: 'Dashboard' } },
      { path: 'parking', name: 'parking', component: () => import('../views/PlaceholderView.vue'), meta: { title: '停车管理' } },
      { path: 'todo', name: 'todo', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Todo' } },
      { path: 'sql', name: 'sql', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'SQL 速查' } },
      { path: 'redis', name: 'redis', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Redis 速查' } },
      { path: 'docker', name: 'docker', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Docker & K8S 速查' } },
      { path: 'movie', name: 'movie', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Movie' } },
      { path: 'collage', name: 'collage', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Image Collage' } },
      { path: 'pixabay', name: 'pixabay', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Pixabay Downloader' } },
      { path: 'text-stats', name: 'text-stats', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Text Statistics' } },
      { path: 'typora', name: 'typora', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Typora 速查' } },
      { path: 'chrome-pack', name: 'chrome-pack', component: () => import('../views/PlaceholderView.vue'), meta: { title: 'Chrome Extension Pack' } },
      { path: 'markdown-heading', name: 'markdown-heading', component: () => import('../views/MarkdownHeadingView.vue'), meta: { title: 'Markdown Heading' } },
    ],
  },
]

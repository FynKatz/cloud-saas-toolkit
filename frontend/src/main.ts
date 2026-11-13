import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { routes, setupRouterGuards } from './router'
import { useTheme } from './composables/useTheme'
import { usePreferencesStore } from './stores/preferences'
import { i18n } from './i18n'
import './style.css'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

setupRouterGuards(router)

const pinia = createPinia()

const app = createApp(App)
app.use(router)
app.use(pinia)
app.use(i18n)

const isV2 = import.meta.env.VITE_NAV_V2 === '1'
if (isV2) {
  const preferences = usePreferencesStore()
  preferences.init()
  i18n.global.locale.value = preferences.locale
} else {
  const theme = useTheme()
  theme.init()
}

app.mount('#app')

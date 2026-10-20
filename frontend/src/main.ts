import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia } from 'pinia'
import { routes } from './router'
 import { useTheme } from './composables/useTheme'
import './style.css'
import App from './App.vue'

const router = createRouter({
  history: createWebHistory(),
  routes,
})

const pinia = createPinia()

 const theme = useTheme()
 theme.init()

const app = createApp(App)
app.use(router)
app.use(pinia)
app.mount('#app')

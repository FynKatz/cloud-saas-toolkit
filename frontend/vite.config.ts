import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { fileURLToPath, URL } from 'node:url'
import { execSync } from 'node:child_process'
import { HttpsProxyAgent } from 'https-proxy-agent'

/**
 * 开发环境下，通过公司 AD 代理转发 Supabase 请求。
 * 使任意浏览器（无需代理配置）即可从 localhost 访问真实 Supabase 数据。
 * 代理凭据取自 git config（本机域认证令牌不进入仓库或前端 bundle）。
 */
function devSupabaseProxy() {
  // If Vite mode is not 'development', skip entirely
  if (process.env.NODE_ENV !== 'development') return {}

  let proxyUrl = process.env.SUPA_DEV_PROXY
  if (!proxyUrl) {
    try {
      proxyUrl = execSync('git config --get http.https://gitee.com.proxy', {
        encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()
    } catch { /* not configured, skip proxy */ }
  }
  if (!proxyUrl) return {}

  const target = 'https://mtsddbmrnwmmyrafqhkw.supabase.co'
  const agent = new HttpsProxyAgent(proxyUrl)
  const paths = ['/rest/v1', '/auth/v1', '/storage/v1', '/functions/v1']
  const config: Record<string, object> = {}
  for (const p of paths) {
    config[p] = { target, changeOrigin: true, agent }
  }
  return config
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': 'http://localhost:9999',
      ...devSupabaseProxy(),
    },
  },
})

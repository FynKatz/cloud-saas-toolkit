<script setup lang="ts">
import { Sun, Moon, LogIn } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import { useTheme } from '../../composables/useTheme'
import { useAuthStore } from '../../stores/auth'
import { i18n } from '../../i18n'

const { t } = i18n.global
const router = useRouter()
const auth = useAuthStore()

defineProps<{
  title: string
  subtitle?: string
  /**
   * 只有 /change-password 需要返回应用：它是壳外路由（与 path:'/' 平级），
   * 进去以后没有任何导航，只能靠浏览器后退。登录/注册/审批中/被拒/已注销
   * 这几页共用本组件，绝不能长出返回按钮，所以默认关闭。
   */
  showBack?: boolean
}>()

const { isDark, toggle } = useTheme()

async function logout() {
  await auth.signOut()
  router.push('/login')
}
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center px-4 relative"
    style="background: var(--bg)"
  >
    <!-- 背景装饰：弱渐层 -->
    <div
      class="pointer-events-none absolute inset-0"
      style="background: radial-gradient(ellipse at 30% 20%, var(--violet-soft) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, var(--violet-soft) 0%, transparent 60%)"
    />

    <button
      class="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md border text-sm transition"
      :style="{
        borderColor: 'var(--surface-border)',
        color: 'var(--text-secondary)',
      }"
      :title="isDark ? '切换到浅色模式' : '切换到暗夜模式'"
      @click="toggle"
    >
      <Sun v-if="isDark" class="h-4 w-4" />
      <Moon v-else class="h-4 w-4" />
    </button>

    <div
      class="relative z-10 w-full max-w-sm rounded-2xl border px-8 py-10 transition-shadow"
      :style="{
        background: 'var(--surface)',
        borderColor: 'var(--surface-border)',
        boxShadow: 'var(--shadow-hover)',
      }"
    >
      <!-- 品牌标记 -->
      <div class="mb-5 flex justify-center">
        <div
          class="grid h-12 w-12 place-items-center rounded-2xl"
          style="background: var(--violet-solid)"
        >
          <LogIn class="h-6 w-6 text-white" />
        </div>
      </div>

      <div class="mb-8 text-center">
        <h1
          class="text-[22px] font-bold tracking-[-0.015em] leading-tight"
          style="color: var(--text)"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="mt-2 text-[13px]"
          style="color: var(--text-secondary)"
        >
          {{ subtitle }}
        </p>
      </div>

      <div class="w-full">
        <slot />
      </div>

      <div v-if="showBack" class="mt-6 flex items-center justify-between gap-3 text-[13px]">
        <button
          type="button"
          class="rounded-md border px-3 py-2 transition"
          :style="{ borderColor: 'var(--surface-border)', color: 'var(--text)' }"
          @click="router.push('/')"
        >
          {{ t('common.backToOverview') }}
        </button>
        <button
          type="button"
          class="rounded-md px-3 py-2 transition"
          style="color: var(--text-secondary)"
          @click="logout"
        >
          {{ t('account.logout') }}
        </button>
      </div>
    </div>
  </div>
</template>

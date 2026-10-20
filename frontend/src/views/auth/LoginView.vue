<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { validateUsername } from '../../lib/username'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ username: '', password: '' })
const error = ref('')
const submitting = ref(false)

async function handleLogin() {
  error.value = ''
  const nameCheck = validateUsername(form.username)
  if (!nameCheck.valid) {
    error.value = nameCheck.error!
    return
  }
  if (!form.password) {
    error.value = '请输入密码'
    return
  }
  submitting.value = true
  const result = await auth.signIn(form.username, form.password)
  submitting.value = false
  if (result.error) {
    error.value = result.error
    return
  }
  redirectByStatus()
}

function redirectByStatus() {
  const s = auth.profile?.status
  if (s === 'approved') {
    if (auth.mustChangePassword) {
      router.replace({ name: 'change-password' })
    } else {
      router.replace({ name: 'dashboard' })
    }
  } else if (s === 'pending') {
    router.replace({ name: 'pending' })
  } else if (s === 'rejected') {
    router.replace({ name: 'rejected' })
  } else if (s === 'deleted') {
    router.replace({ name: 'deleted' })
  }
}
</script>

<template>
  <AuthShell
    title="Cloud SaaS Toolkit"
    subtitle="登录以继续使用"
  >
    <form class="space-y-4" @submit.prevent="handleLogin">
      <div
        v-if="error"
        class="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
      >
        {{ error }}
      </div>

      <div>
        <label
          class="mb-1.5 block text-xs font-medium"
          style="color: var(--text-secondary)"
        >
          用户名
        </label>
        <input
          v-model="form.username"
          type="text"
          autocomplete="username"
          class="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
          :style="{
            background: 'var(--bg)',
            borderColor: 'var(--surface-border)',
            color: 'var(--text)',
          }"
          placeholder="输入用户名"
        />
      </div>

      <div>
        <label
          class="mb-1.5 block text-xs font-medium"
          style="color: var(--text-secondary)"
        >
          密码
        </label>
        <input
          v-model="form.password"
          type="password"
          autocomplete="current-password"
          class="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
          :style="{
            background: 'var(--bg)',
            borderColor: 'var(--surface-border)',
            color: 'var(--text)',
          }"
          placeholder="输入密码"
        />
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="h-10 w-full rounded-md text-sm font-medium text-white transition disabled:opacity-60"
        style="background: var(--accent)"
      >
        {{ submitting ? '登录中…' : '登录' }}
      </button>
    </form>

    <p
      class="mt-5 text-center text-sm"
      style="color: var(--text-secondary)"
    >
      还没有账号？
      <RouterLink
        to="/register"
        class="font-medium underline underline-offset-2"
        style="color: var(--accent)"
      >
        注册
      </RouterLink>
    </p>
  </AuthShell>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { validateUsername, validatePassword } from '../../lib/username'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({
  username: '',
  password: '',
  confirm: '',
})
const error = ref('')
const submitting = ref(false)

async function handleRegister() {
  error.value = ''

  const nameCheck = validateUsername(form.username)
  if (!nameCheck.valid) {
    error.value = nameCheck.error!
    return
  }

  const pwCheck = validatePassword(form.password)
  if (!pwCheck.valid) {
    error.value = pwCheck.error!
    return
  }
  if (form.password !== form.confirm) {
    error.value = '两次密码不一致'
    return
  }

  submitting.value = true
  const result = await auth.signUp(form.username, form.password)
  submitting.value = false
  if (result.error) {
    error.value = result.error
    return
  }

  const s = auth.profile?.status
  if (s === 'pending') {
    router.replace({ name: 'pending' })
  } else if (s === 'approved') {
    router.replace({ name: 'dashboard' })
  } else {
    router.replace({ name: 'login' })
  }
}
</script>

<template>
  <AuthShell title="注册" subtitle="创建您的账号">
    <form class="space-y-4" @submit.prevent="handleRegister">
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
          placeholder="3-32 位小写字母、数字、_、-"
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
          autocomplete="new-password"
          class="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
          :style="{
            background: 'var(--bg)',
            borderColor: 'var(--surface-border)',
            color: 'var(--text)',
          }"
          placeholder="至少 8 位，含字母和数字"
        />
      </div>

      <div>
        <label
          class="mb-1.5 block text-xs font-medium"
          style="color: var(--text-secondary)"
        >
          确认密码
        </label>
        <input
          v-model="form.confirm"
          type="password"
          autocomplete="new-password"
          class="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
          :style="{
            background: 'var(--bg)',
            borderColor: 'var(--surface-border)',
            color: 'var(--text)',
          }"
          placeholder="再次输入密码"
        />
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="h-10 w-full rounded-md text-sm font-medium text-white transition disabled:opacity-60"
        style="background: var(--accent)"
      >
        {{ submitting ? '注册中…' : '注册' }}
      </button>
    </form>

    <p
      class="mt-5 text-center text-sm"
      style="color: var(--text-secondary)"
    >
      已有账号？
      <RouterLink
        to="/login"
        class="font-medium underline underline-offset-2"
        style="color: var(--accent)"
      >
        登录
      </RouterLink>
    </p>
  </AuthShell>
</template>

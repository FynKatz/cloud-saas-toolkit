<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { supabase } from '../../lib/supabase'
import { validatePassword } from '../../lib/username'

const router = useRouter()
const auth = useAuthStore()

const form = reactive({ current: '', password: '', confirm: '' })
const error = ref('')
const submitting = ref(false)

async function handleSubmit() {
  error.value = ''
  if (!form.current) {
    error.value = '请输入当前密码'
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
  const { error: invokeError } = await supabase.functions.invoke(
    'user-change-password',
    {
      method: 'POST',
      body: { old_password: form.current, new_password: form.password },
    },
  )
  submitting.value = false

  if (invokeError) {
    const ctx = (invokeError as { context?: Response }).context
    let message = '密码修改失败，请稍后重试'
    if (ctx) {
      try {
        const payload = await ctx.json()
        if (payload?.error) message = payload.error
      } catch {
        // fall back to the generic message
      }
    }
    error.value = message
    return
  }
  await auth.refreshProfile()
  router.replace({ name: 'dashboard' })
}
</script>

<template>
  <AuthShell title="设置新密码" subtitle="首次登录需修改临时密码">
    <form class="space-y-4" @submit.prevent="handleSubmit">
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
          当前密码
        </label>
        <input
          v-model="form.current"
          type="password"
          autocomplete="current-password"
          class="h-10 w-full rounded-md border px-3 text-sm outline-none transition"
          :style="{
            background: 'var(--bg)',
            borderColor: 'var(--surface-border)',
            color: 'var(--text)',
          }"
          placeholder="输入当前密码"
        />
      </div>

      <div>
        <label
          class="mb-1.5 block text-xs font-medium"
          style="color: var(--text-secondary)"
        >
          新密码
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
          确认新密码
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
          placeholder="再次输入新密码"
        />
      </div>

      <button
        type="submit"
        :disabled="submitting"
        class="h-10 w-full rounded-md text-sm font-medium text-white transition disabled:opacity-60"
        style="background: var(--accent)"
      >
        {{ submitting ? '提交中…' : '保存新密码' }}
      </button>
    </form>
  </AuthShell>
</template>

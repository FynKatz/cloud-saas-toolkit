<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { supabase } from '../../lib/supabase'
import { XCircle } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

const applying = ref(false)
const message = ref('')
const error = ref('')

async function handleReapply() {
  applying.value = true
  error.value = ''
  message.value = ''
  const { error: invokeError } = await supabase.functions.invoke(
    'user-reapply',
    { method: 'POST' },
  )
  applying.value = false
  if (invokeError) {
    error.value = '重新申请失败，请稍后重试'
    return
  }
  await auth.refreshProfile()
  message.value = '已重新提交，请等待管理员审批'
  router.replace({ name: 'pending' })
}

async function handleLogout() {
  await auth.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <AuthShell title="申请被拒绝" subtitle="您可以重新提交申请">
    <div class="flex flex-col items-center gap-4">
      <div class="grid h-14 w-14 place-items-center rounded-full bg-red-50 dark:bg-red-950">
        <XCircle class="h-7 w-7 text-red-500" />
      </div>

      <div
        v-if="auth.profile?.reject_reason"
        class="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-400"
      >
        拒绝原因：{{ auth.profile.reject_reason }}
      </div>

      <p
        v-if="error"
        class="text-sm text-red-600 dark:text-red-400"
      >
        {{ error }}
      </p>
      <p v-if="message" class="text-sm" style="color: var(--accent)">
        {{ message }}
      </p>

      <button
        :disabled="applying"
        class="h-10 w-full rounded-md text-sm font-medium text-white transition disabled:opacity-60"
        style="background: var(--accent)"
        @click="handleReapply"
      >
        {{ applying ? '提交中…' : '重新申请' }}
      </button>
      <button
        class="h-10 w-full rounded-md border text-sm font-medium transition"
        :style="{ borderColor: 'var(--surface-border)', color: 'var(--text)' }"
        @click="handleLogout"
      >
        退出登录
      </button>
    </div>
  </AuthShell>
</template>

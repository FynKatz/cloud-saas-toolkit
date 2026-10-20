<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { Ban } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  await auth.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <AuthShell title="账号已注销" subtitle="该账号已被管理员注销">
    <div class="flex flex-col items-center gap-4">
      <div class="grid h-14 w-14 place-items-center rounded-full bg-slate-100 dark:bg-slate-800">
        <Ban class="h-7 w-7" style="color: var(--text-secondary)" />
      </div>
      <p class="text-center text-sm leading-relaxed" style="color: var(--text-secondary)">
        如有疑问请联系管理员。
      </p>
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

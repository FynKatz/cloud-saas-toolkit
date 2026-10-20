<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import AuthShell from '../../components/auth/AuthShell.vue'
import { Clock } from 'lucide-vue-next'

const router = useRouter()
const auth = useAuthStore()

async function handleLogout() {
  await auth.signOut()
  router.replace({ name: 'login' })
}
</script>

<template>
  <AuthShell title="等待审批" subtitle="您的账号正在审核中">
    <div class="flex flex-col items-center gap-4">
      <div
        class="grid h-14 w-14 place-items-center rounded-full"
        style="background: var(--accent-soft)"
      >
        <Clock class="h-7 w-7" style="color: var(--accent)" />
      </div>
      <p class="text-center text-sm leading-relaxed" style="color: var(--text-secondary)">
        管理员正在审核您的注册申请，<br />请耐心等待。
      </p>
      <button
        class="h-10 w-full rounded-md border text-sm font-medium transition"
        :style="{
          borderColor: 'var(--surface-border)',
          color: 'var(--text)',
        }"
        @click="handleLogout"
      >
        退出登录
      </button>
    </div>
  </AuthShell>
</template>

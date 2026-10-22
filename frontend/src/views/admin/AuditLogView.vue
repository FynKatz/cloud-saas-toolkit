<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RefreshCw, FileText } from 'lucide-vue-next'
import { supabase } from '../../lib/supabase'

interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown> | null
  ip: string | null
  created_at: string
}

const logs = ref<AuditLog[]>([])
const loading = ref(false)
const errorMsg = ref('')

async function loadLogs() {
  loading.value = true
  errorMsg.value = ''
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  loading.value = false
  if (error) {
    errorMsg.value = error.message
    return
  }
  logs.value = (data as AuditLog[]) ?? []
}

const actionLabel = computed<Record<string, string>>(() => ({
  admin_approve_user: '审批通过用户',
  admin_reject_user: '审批拒绝用户',
  admin_create_user: '创建用户',
  admin_delete_user: '删除用户',
  admin_restore_user: '恢复用户',
  admin_reset_password: '重置密码',
  admin_create_role: '创建角色',
  admin_update_role: '更新角色',
  admin_delete_role: '删除角色',
  admin_set_role_permission: '设置角色权限',
  admin_assign_user_role: '分配用户角色',
  user_reapply: '重新申请',
  user_change_password: '修改密码',
  pixabay_proxy: 'Pixabay 代理请求',
  tmdb_proxy: 'TMDB 代理请求',
}))

function labelFor(action: string) {
  return actionLabel.value[action] ?? action
}

onMounted(loadLogs)
</script>

<template>
  <div class="space-y-5">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold tracking-normal text-[var(--text)]">审计日志</h3>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="loadLogs"
      >
        <RefreshCw class="h-4 w-4" />
        刷新
      </button>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-[var(--text-secondary)]">加载中...</div>
    <div v-else-if="errorMsg" class="py-10 text-center text-sm text-[var(--text-secondary)]">
      {{ errorMsg }}
      <button class="ml-2 text-[var(--accent)] hover:underline" @click="loadLogs">重试</button>
    </div>
    <div v-else-if="logs.length === 0" class="flex flex-col items-center py-12 text-[var(--text-secondary)]">
      <FileText class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">暂无审计记录</p>
    </div>

    <div v-else class="overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[var(--surface-border)] text-sm">
          <thead class="bg-[var(--bg)]">
            <tr class="text-left text-[var(--text-secondary)]">
              <th class="px-4 py-3 font-medium">时间</th>
              <th class="px-4 py-3 font-medium">动作</th>
              <th class="px-4 py-3 font-medium">操作者</th>
              <th class="px-4 py-3 font-medium">目标</th>
              <th class="px-4 py-3 font-medium">IP</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--surface-border)]">
            <tr v-for="log in logs" :key="log.id" class="transition hover:bg-[var(--bg)]">
              <td class="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                {{ new Date(log.created_at).toLocaleString('zh-CN') }}
              </td>
              <td class="px-4 py-3">
                <span class="rounded bg-[var(--accent-soft)] px-2 py-0.5 text-xs font-medium text-[var(--accent)]">
                  {{ labelFor(log.action) }}
                </span>
              </td>
              <td class="px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                {{ log.actor_id?.slice(0, 8) ?? '—' }}
              </td>
              <td class="px-4 py-3 text-[11px] text-[var(--text-secondary)]">
                {{ log.target_type ?? '-' }} / {{ log.target_id?.slice(0, 8) ?? '-' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 font-mono text-[11px] text-[var(--text-secondary)]">
                {{ log.ip ?? '—' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

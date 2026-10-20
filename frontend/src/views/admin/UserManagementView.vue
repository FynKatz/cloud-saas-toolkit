<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Check,
  KeyRound,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserX,
  X,
} from 'lucide-vue-next'
import { useAdminStore } from '../../stores/admin'
import { useAuthStore } from '../../stores/auth'
import type { AdminUser, AdminUserStatus } from '../../types/admin'

const admin = useAdminStore()
const auth = useAuthStore()

const filter = ref<AdminUserStatus | 'all'>('all')
const keyword = ref('')
const error = ref('')
const notice = ref('')
const busy = ref(false)

const activeModal = ref<null | 'create' | 'approve' | 'reject' | 'reset' | 'roles'>(null)
const target = ref<AdminUser | null>(null)
const form = reactive({
  username: '',
  password: '',
  reason: '',
  roleIds: [] as string[],
})

const statusTabs: { key: AdminUserStatus | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待审批' },
  { key: 'approved', label: '已批准' },
  { key: 'rejected', label: '已拒绝' },
  { key: 'deleted', label: '已删除' },
]

const statusMeta: Record<AdminUserStatus, { label: string; cls: string }> = {
  pending: { label: '待审批', cls: 'bg-amber-100 text-amber-700' },
  approved: { label: '已批准', cls: 'bg-emerald-100 text-emerald-700' },
  rejected: { label: '已拒绝', cls: 'bg-rose-100 text-rose-700' },
  deleted: { label: '已删除', cls: 'bg-slate-200 text-slate-600' },
}

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return admin.users.filter((u) => {
    if (filter.value !== 'all' && u.status !== filter.value) return false
    if (!q) return true
    return u.username.toLowerCase().includes(q) || (u.display_name ?? '').toLowerCase().includes(q)
  })
})

const pendingCount = computed(() => admin.users.filter((u) => u.status === 'pending').length)

function flash(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = ''), 3000)
}

async function refresh() {
  const res = await admin.loadUsers()
  if (res.error) error.value = res.error
}

function openModal(kind: typeof activeModal.value, user: AdminUser | null = null) {
  error.value = ''
  activeModal.value = kind
  target.value = user
  form.username = ''
  form.password = ''
  form.reason = ''
  form.roleIds = kind === 'roles' && user ? roleIdsFor(user) : []
}

function closeModal() {
  activeModal.value = null
  target.value = null
}

function roleIdsFor(user: AdminUser): string[] {
  return admin.roles.filter((r) => user.roles.includes(r.name)).map((r) => r.id)
}

async function submit() {
  error.value = ''
  busy.value = true
  try {
    if (activeModal.value === 'create') {
      const res = await admin.createUser(form.username, form.password, form.roleIds)
      if (res.error) return (error.value = res.error)
      flash('用户已创建')
    } else if (activeModal.value === 'approve' && target.value) {
      const res = await admin.approveUser(target.value.id, form.roleIds)
      if (res.error) return (error.value = res.error)
      flash('已批准')
    } else if (activeModal.value === 'reject' && target.value) {
      const res = await admin.rejectUser(target.value.id, form.reason)
      if (res.error) return (error.value = res.error)
      flash('已拒绝')
    } else if (activeModal.value === 'reset' && target.value) {
      const res = await admin.resetPassword(target.value.id, form.password)
      if (res.error) return (error.value = res.error)
      flash('密码已重置，该用户所有会话已失效')
    } else if (activeModal.value === 'roles' && target.value) {
      const res = await admin.assignUserRole(target.value.id, form.roleIds)
      if (res.error) return (error.value = res.error)
      flash('角色已更新')
    }
    closeModal()
    await refresh()
  } finally {
    busy.value = false
  }
}

async function removeUser(user: AdminUser) {
  if (!confirm(`确认删除用户 ${user.username}？此为逻辑删除，可恢复。`)) return
  const res = await admin.deleteUser(user.id)
  if (res.error) return (error.value = res.error)
  flash('用户已删除')
  await refresh()
}

async function restoreUser(user: AdminUser) {
  const res = await admin.restoreUser(user.id)
  if (res.error) return (error.value = res.error)
  flash('用户已恢复')
  await refresh()
}

function toggleRole(roleId: string) {
  const idx = form.roleIds.indexOf(roleId)
  if (idx >= 0) form.roleIds.splice(idx, 1)
  else form.roleIds.push(roleId)
}

onMounted(async () => {
  await Promise.all([refresh(), admin.loadRoles()])
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1">
        <button
          v-for="tab in statusTabs"
          :key="tab.key"
          class="rounded-md px-3 py-1.5 text-sm transition"
          :class="
            filter === tab.key
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]'
          "
          @click="filter = tab.key"
        >
          {{ tab.label }}
          <span
            v-if="tab.key === 'pending' && pendingCount > 0"
            class="ml-1 rounded-full bg-amber-400 px-1.5 text-[11px] font-semibold text-slate-900"
          >
            {{ pendingCount }}
          </span>
        </button>
      </div>

      <label class="relative ml-auto block">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="keyword"
          class="h-9 w-56 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          placeholder="搜索用户名..."
        />
      </label>

      <button
        class="inline-flex h-9 items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 text-sm font-medium text-white transition hover:opacity-90"
        @click="openModal('create')"
      >
        <Plus class="h-4 w-4" /> 新建用户
      </button>
    </div>

    <div
      v-if="notice"
      class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
    >
      {{ notice }}
    </div>
    <div
      v-if="error && !activeModal"
      class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700"
    >
      {{ error }}
    </div>

    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--surface-border)] text-left text-[11px] uppercase text-[var(--text-secondary)]">
            <th class="px-4 py-3 font-medium">用户名</th>
            <th class="px-4 py-3 font-medium">状态</th>
            <th class="px-4 py-3 font-medium">角色</th>
            <th class="px-4 py-3 font-medium">创建时间</th>
            <th class="px-4 py-3 text-right font-medium">操作</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-[var(--surface-border)]">
          <tr v-for="user in filtered" :key="user.id" class="transition hover:bg-[var(--nav-hover)]">
            <td class="px-4 py-3">
              <div class="font-medium text-[var(--text)]">{{ user.username }}</div>
              <div v-if="user.must_change_password" class="text-[11px] text-amber-600">待首次改密</div>
            </td>
            <td class="px-4 py-3">
              <span class="rounded px-2 py-0.5 text-[11px] font-medium" :class="statusMeta[user.status].cls">
                {{ statusMeta[user.status].label }}
              </span>
            </td>
            <td class="px-4 py-3 text-[var(--text-secondary)]">
              {{ user.roles.length ? user.roles.join('、') : '—' }}
            </td>
            <td class="px-4 py-3 text-[var(--text-secondary)]">
              {{ new Date(user.created_at).toLocaleDateString('zh-CN') }}
            </td>
            <td class="px-4 py-3">
              <div class="flex items-center justify-end gap-1">
                <template v-if="user.status === 'pending'">
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50"
                    title="批准"
                    @click="openModal('approve', user)"
                  >
                    <UserCheck class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                    title="拒绝"
                    @click="openModal('reject', user)"
                  >
                    <UserX class="h-4 w-4" />
                  </button>
                </template>
                <template v-else-if="user.status === 'approved'">
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
                    title="管理角色"
                    @click="openModal('roles', user)"
                  >
                    <Check class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
                    title="重置密码"
                    @click="openModal('reset', user)"
                  >
                    <KeyRound class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                    title="删除"
                    @click="removeUser(user)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </template>
                <template v-else-if="user.status === 'deleted'">
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
                    title="恢复"
                    @click="restoreUser(user)"
                  >
                    <RotateCcw class="h-4 w-4" />
                  </button>
                </template>
                <span v-else class="text-[var(--text-secondary)]">—</span>
              </div>
            </td>
          </tr>
          <tr v-if="filtered.length === 0">
            <td colspan="5" class="px-4 py-10 text-center text-[var(--text-secondary)]">
              没有匹配的用户
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal -->
    <div v-if="activeModal" class="fixed inset-0 z-50 grid place-items-center bg-black/40" @click.self="closeModal">
      <div class="w-full max-w-md rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-[var(--text)]">
            <template v-if="activeModal === 'create'">新建用户</template>
            <template v-else-if="activeModal === 'approve'">批准 {{ target?.username }}</template>
            <template v-else-if="activeModal === 'reject'">拒绝 {{ target?.username }}</template>
            <template v-else-if="activeModal === 'reset'">重置密码 · {{ target?.username }}</template>
            <template v-else>管理角色 · {{ target?.username }}</template>
          </h3>
          <button class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" @click="closeModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div v-if="error" class="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ error }}
        </div>

        <div class="space-y-3">
          <template v-if="activeModal === 'create'">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">用户名</span>
              <input v-model="form.username" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="小写字母、数字、_ 或 -" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">临时密码</span>
              <input v-model="form.password" type="text" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="至少 8 位，含字母和数字" />
            </label>
          </template>

          <label v-if="activeModal === 'reset'" class="block">
            <span class="mb-1 block text-xs text-[var(--text-secondary)]">新临时密码</span>
            <input v-model="form.password" type="text" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="至少 8 位，含字母和数字" />
          </label>

          <label v-if="activeModal === 'reject'" class="block">
            <span class="mb-1 block text-xs text-[var(--text-secondary)]">拒绝原因</span>
            <textarea v-model="form.reason" rows="3" class="w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="将展示给申请人" />
          </label>

          <div v-if="activeModal === 'create' || activeModal === 'approve' || activeModal === 'roles'">
            <span class="mb-1 block text-xs text-[var(--text-secondary)]">角色（可多选）</span>
            <div class="space-y-1">
              <label
                v-for="role in admin.roles"
                :key="role.id"
                class="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition hover:bg-[var(--nav-hover)]"
              >
                <input
                  type="checkbox"
                  :checked="form.roleIds.includes(role.id)"
                  :disabled="role.name === 'admin' && !auth.isAdmin"
                  @change="toggleRole(role.id)"
                />
                <span class="text-[var(--text)]">{{ role.name }}</span>
                <span class="text-[11px] text-[var(--text-secondary)]">{{ role.description }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="h-9 rounded-md border border-[var(--surface-border)] px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" @click="closeModal">
            取消
          </button>
          <button
            :disabled="busy"
            class="h-9 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-60"
            @click="submit"
          >
            {{ busy ? '处理中…' : '确认' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

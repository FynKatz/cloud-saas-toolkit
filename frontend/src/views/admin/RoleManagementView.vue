<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Pencil, Plus, Save, Trash2, X } from 'lucide-vue-next'
import { useAdminStore } from '../../stores/admin'
import type { AdminRole } from '../../types/admin'

const admin = useAdminStore()

const notice = ref('')
const error = ref('')
const busy = ref(false)
const selectedId = ref<string>('')
const editing = ref(false)
const form = reactive({ name: '', description: '' })
const creating = ref(false)
const newRole = reactive({ name: '', description: '' })

const selected = computed<AdminRole | undefined>(() =>
  admin.roles.find((r) => r.id === selectedId.value),
)

function flash(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = ''), 3000)
}

async function refresh() {
  const res = await admin.loadRoles()
  if (res.error) error.value = res.error
  if (!selectedId.value && admin.roles.length) selectedId.value = admin.roles[0].id
}

async function createRole() {
  error.value = ''
  busy.value = true
  try {
    const res = await admin.createRole(newRole.name.trim(), newRole.description.trim())
    if (res.error) return (error.value = res.error)
    flash('角色已创建')
    creating.value = false
    newRole.name = ''
    newRole.description = ''
    await refresh()
  } finally {
    busy.value = false
  }
}

function startEdit() {
  if (!selected.value) return
  form.name = selected.value.name
  form.description = selected.value.description ?? ''
  editing.value = true
}

async function saveEdit() {
  if (!selected.value) return
  error.value = ''
  busy.value = true
  try {
    const res = await admin.updateRole(selected.value.id, {
      name: form.name.trim(),
      description: form.description.trim(),
    })
    if (res.error) return (error.value = res.error)
    flash('角色已更新')
    editing.value = false
    await refresh()
  } finally {
    busy.value = false
  }
}

async function deleteSelected() {
  if (!selected.value) return
  if (!confirm(`确认删除角色 ${selected.value.name}？`)) return
  const res = await admin.deleteRole(selected.value.id)
  if (res.error) return (error.value = res.error)
  flash('角色已删除')
  selectedId.value = ''
  await refresh()
}

function permissionOf(toolId: string): 'view' | 'edit' | '' {
  if (!selected.value) return ''
  const p = admin.permissions.find(
    (x) => x.role_id === selected.value!.id && x.tool_id === toolId,
  )
  return p?.access_level ?? ''
}

async function setPermission(toolId: string, level: 'view' | 'edit' | null) {
  if (!selected.value) return
  error.value = ''
  const current = permissionOf(toolId)
  const next = current === level ? null : level
  const res = await admin.setRolePermission(selected.value.id, toolId, next)
  if (res.error) return (error.value = res.error)
  await admin.loadRoles()
}

function toolGroups() {
  const map = new Map<string, typeof admin.tools>()
  for (const t of admin.tools) {
    const list = map.get(t.category)
    if (list) list.push(t)
    else map.set(t.category, [t])
  }
  return [...map.entries()]
}

onMounted(refresh)
</script>

<template>
  <div class="space-y-5">
    <div
      v-if="notice"
      class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
    >
      {{ notice }}
    </div>
    <div v-if="error" class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ error }}
    </div>

    <div class="grid gap-4 lg:grid-cols-[280px_1fr]">
      <!-- Role list -->
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
        <div class="flex items-center justify-between border-b border-[var(--surface-border)] px-4 py-3">
          <span class="text-sm font-semibold text-[var(--text)]">角色</span>
          <button
            class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
            title="新建角色"
            @click="creating = true"
          >
            <Plus class="h-4 w-4" />
          </button>
        </div>
        <div class="p-2">
          <button
            v-for="role in admin.roles"
            :key="role.id"
            class="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition"
            :class="
              selectedId === role.id
                ? 'bg-[var(--nav-hover)] text-[var(--text)]'
                : 'text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]'
            "
            @click="((selectedId = role.id), (editing = false))"
          >
            <span class="min-w-0 flex-1 truncate">{{ role.name }}</span>
            <span v-if="role.is_system" class="rounded bg-[var(--accent-soft)] px-1.5 text-[10px] text-[var(--accent)]">系统</span>
            <span class="text-[11px]">{{ role.user_count }}</span>
          </button>
        </div>
      </div>

      <!-- Role detail -->
      <div v-if="selected" class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
        <div class="flex items-center gap-2 border-b border-[var(--surface-border)] px-4 py-3">
          <template v-if="!editing">
            <div class="min-w-0 flex-1">
              <div class="text-sm font-semibold text-[var(--text)]">{{ selected.name }}</div>
              <div class="text-[11px] text-[var(--text-secondary)]">{{ selected.description || '无描述' }}</div>
            </div>
            <template v-if="!selected.is_system">
              <button
                class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
                title="编辑"
                @click="startEdit"
              >
                <Pencil class="h-4 w-4" />
              </button>
              <button
                class="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50"
                title="删除"
                @click="deleteSelected"
              >
                <Trash2 class="h-4 w-4" />
              </button>
            </template>
          </template>
          <template v-else>
            <div class="flex min-w-0 flex-1 gap-2">
              <input v-model="form.name" class="h-8 w-40 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]" />
              <input v-model="form.description" class="h-8 min-w-0 flex-1 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]" placeholder="描述" />
            </div>
            <button class="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50" title="保存" @click="saveEdit">
              <Save class="h-4 w-4" />
            </button>
            <button class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" title="取消" @click="editing = false">
              <X class="h-4 w-4" />
            </button>
          </template>
        </div>

        <div v-if="selected.is_system" class="p-4 text-sm text-[var(--text-secondary)]">
          系统角色始终拥有全部工具的编辑权限，权限矩阵不可修改。
        </div>

        <div v-else class="space-y-4 p-4">
          <div v-for="[category, list] in toolGroups()" :key="category">
            <div class="mb-2 text-[11px] font-medium uppercase text-[var(--nav-section)]">{{ category }}</div>
            <div class="space-y-1">
              <div
                v-for="tool in list"
                :key="tool.id"
                class="flex items-center gap-3 rounded-md px-2 py-2 transition hover:bg-[var(--nav-hover)]"
              >
                <span class="min-w-0 flex-1 truncate text-sm text-[var(--text)]">{{ tool.name }}</span>
                <div class="flex gap-1">
                  <button
                    class="rounded px-2 py-0.5 text-[11px] transition"
                    :class="
                      permissionOf(tool.id) === 'view' || permissionOf(tool.id) === 'edit'
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--surface-border)] text-[var(--text-secondary)]'
                    "
                    @click="setPermission(tool.id, 'view')"
                  >
                    查看
                  </button>
                  <button
                    v-if="tool.writable"
                    class="rounded px-2 py-0.5 text-[11px] transition disabled:opacity-30"
                    :class="
                      permissionOf(tool.id) === 'edit'
                        ? 'bg-[var(--accent)] text-white'
                        : 'border border-[var(--surface-border)] text-[var(--text-secondary)]'
                    "
                    @click="setPermission(tool.id, 'edit')"
                  >
                    编辑
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Create role modal -->
    <div v-if="creating" class="fixed inset-0 z-50 grid place-items-center bg-black/40" @click.self="creating = false">
      <div class="w-full max-w-sm rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-xl">
        <h3 class="mb-4 text-sm font-semibold text-[var(--text)]">新建角色</h3>
        <div class="space-y-3">
          <input v-model="newRole.name" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="角色名" />
          <input v-model="newRole.description" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="描述（可选）" />
        </div>
        <div class="mt-5 flex justify-end gap-2">
          <button class="h-9 rounded-md border border-[var(--surface-border)] px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" @click="creating = false">取消</button>
          <button :disabled="busy" class="h-9 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-60" @click="createRole">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>

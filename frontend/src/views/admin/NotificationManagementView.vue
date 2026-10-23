<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { Plus, Pencil, Save, X, Eye, Send, Archive, RotateCcw } from 'lucide-vue-next'
import { supabase } from '../../lib/supabase'
import { useAuthStore } from '../../stores/auth'

interface NotifRecord {
  id: string
  title: string
  content: string
  type: string
  priority: string
  target_route: string | null
  status: string
  created_at: string
  published_at: string | null
  expires_at: string | null
  read_count: number
}

const auth = useAuthStore()
const notice = ref('')
const error = ref('')
const busy = ref(false)
const list = ref<NotifRecord[]>([])
const editing = ref(false)
const form = reactive({
  title: '',
  content: '',
  type: 'announcement',
  priority: 'info',
  target_route: '',
})
const editingId = ref<string | null>(null)
const previewBanner = ref<NotifRecord | null>(null)

function flash(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = ''), 3000)
}

async function load() {
  const { data, error: err } = await supabase
    .from('system_notifications')
    .select('*')
    .order('created_at', { ascending: false })
  if (err) { error.value = err.message; return }
  list.value = data ?? []
}

function newForm() {
  editing.value = true
  editingId.value = null
  form.title = ''
  form.content = ''
  form.type = 'announcement'
  form.priority = 'info'
  form.target_route = ''
}

function editRecord(r: NotifRecord) {
  editing.value = true
  editingId.value = r.id
  form.title = r.title
  form.content = r.content
  form.type = r.type
  form.priority = r.priority
  form.target_route = r.target_route ?? ''
}

function cancelEdit() {
  editing.value = false
  editingId.value = null
}

async function saveDraft() {
  busy.value = true
  error.value = ''
  try {
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      type: form.type,
      priority: form.priority,
      target_route: form.target_route.trim() || null,
      status: 'draft',
      created_by: auth.user!.id,
    }
    if (editingId.value) {
      const { error: e } = await supabase
        .from('system_notifications')
        .update(payload)
        .eq('id', editingId.value)
      if (e) { error.value = e.message; return }
      flash('草稿已更新')
    } else {
      const { error: e } = await supabase
        .from('system_notifications')
        .insert(payload)
      if (e) { error.value = e.message; return }
      flash('草稿已创建')
    }
    editing.value = false
    await load()
  } finally {
    busy.value = false
  }
}

async function publishRecord(id: string) {
  if (!confirm('确认发布此通知？发布后内容将只读。')) return
  busy.value = true
  try {
    const { error: e } = await supabase
      .from('system_notifications')
      .update({
        status: 'published',
        published_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (e) { error.value = e.message; return }
    flash('通知已发布')
    await load()
  } finally {
    busy.value = false
  }
}

async function unpublishRecord(id: string) {
  if (!confirm('确认撤回此通知？撤回后可编辑并重新发布。')) return
  busy.value = true
  try {
    const { error: e } = await supabase
      .from('system_notifications')
      .update({ status: 'unpublished' })
      .eq('id', id)
    if (e) { error.value = e.message; return }
    flash('通知已撤回')
    await load()
  } finally {
    busy.value = false
  }
}

async function archiveRecord(id: string) {
  if (!confirm('确认归档？')) return
  busy.value = true
  try {
    const { error: e } = await supabase
      .from('system_notifications')
      .update({ status: 'archived' })
      .eq('id', id)
    if (e) { error.value = e.message; return }
    flash('通知已归档')
    await load()
  } finally {
    busy.value = false
  }
}

function showPreview(r: NotifRecord) {
  previewBanner.value = r
}

function closePreview() {
  previewBanner.value = null
}

/** 距离发布时间 */
function sincePublished(ts: string | null): string {
  if (!ts) return '—'
  const mins = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (mins < 1) return '刚刚'
  if (mins < 60) return `${mins} 分钟前`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} 小时前`
  return `${Math.floor(hours / 24)} 天前`
}


function statusLabel(s: string): string {
  switch (s) { case 'draft': return '草稿'; case 'published': return '已发布'; case 'unpublished': return '已撤回'; case 'archived': return '已归档'; default: return s }
}
function typeLabel(t: string): string {
  switch (t) { case 'maintenance': return '维护'; case 'new_tool': return '新工具'; case 'announcement': return '公告'; case 'alert': return '告警'; default: return t }
}
function priorityLabel(p: string): string {
  switch (p) { case 'important': return '高'; case 'warning': return '中'; case 'info': return '低'; default: return p }
}

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div v-if="notice" class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{{ notice }}</div>
    <div v-if="error" class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">{{ error }}</div>

    <!-- 新建按钮 -->
    <div class="flex items-center gap-2">
      <h2 class="text-base font-semibold text-[var(--text)]">系统通知</h2>
      <div class="spacer" />
      <button v-if="!editing" class="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white" @click="newForm">
        <Plus class="h-4 w-4" />新建通知
      </button>
    </div>

    <!-- 编辑/新建表单 -->
    <div v-if="editing" class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <input v-model="form.title" placeholder="标题" class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] col-span-2" />
        <textarea v-model="form.content" placeholder="内容" rows="4" class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] col-span-2 resize-y" />
        <select v-model="form.type" class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
          <option value="announcement">公告</option>
          <option value="maintenance">维护</option>
          <option value="new_tool">新工具</option>
          <option value="alert">告警</option>
        </select>
        <select v-model="form.priority" class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]">
          <option value="info">低优先级</option>
          <option value="warning">中优先级</option>
          <option value="important">高优先级</option>
        </select>
        <input v-model="form.target_route" placeholder="关联页面路径（可选，如 /parking）" class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)] col-span-2" />
      </div>
      <div class="flex justify-end gap-2">
        <button class="rounded-md border border-[var(--surface-border)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--text-secondary)]" @click="cancelEdit">取消</button>
        <button class="rounded-md bg-[var(--accent)] px-3 py-1.5 text-xs font-semibold text-white" :disabled="busy" @click="saveDraft">
          <Save class="h-3.5 w-3.5 inline mr-1" />保存草稿
        </button>
      </div>
    </div>

    <!-- 列表 -->
    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] divide-y divide-[var(--surface-border)]">
      <div v-for="r in list" :key="r.id" class="flex items-center gap-3 px-4 py-3 text-sm">
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="font-medium text-[var(--text)]">{{ r.title }}</span>
            <span class="rounded px-1.5 py-0.5 text-[10px] font-semibold" :class="{
              'bg-amber-100 text-amber-700': r.status === 'draft',
              'bg-emerald-100 text-emerald-700': r.status === 'published',
              'bg-slate-100 text-slate-600': r.status === 'unpublished',
              'bg-gray-100 text-gray-500': r.status === 'archived',
            }">{{ statusLabel(r.status) }}</span>
          </div>
          <div class="text-[11px] text-[var(--text-secondary)] mt-0.5">
            {{ typeLabel(r.type) }} · 优先级{{ priorityLabel(r.priority) }}
            <template v-if="r.status === 'published'"> · {{ sincePublished(r.published_at) }} · 已读 {{ r.read_count }}</template>
          </div>
        </div>
        <div class="flex items-center gap-1">
          <button class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" title="预览" @click="showPreview(r)"><Eye class="h-4 w-4" /></button>
          <!-- 草稿/已撤回 可编辑 -->
          <button v-if="r.status === 'draft' || r.status === 'unpublished'" class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" title="编辑" @click="editRecord(r)"><Pencil class="h-4 w-4" /></button>
          <!-- 草稿可直接发布 -->
          <button v-if="r.status === 'draft'" class="grid h-7 w-7 place-items-center rounded text-emerald-600 hover:bg-emerald-50" title="发布" @click="publishRecord(r.id)"><Send class="h-4 w-4" /></button>
          <!-- 发布后 15min 内可撤回 -->
          <button v-if="r.status === 'published'" class="grid h-7 w-7 place-items-center rounded text-amber-600 hover:bg-amber-50" title="撤回" @click="unpublishRecord(r.id)"><RotateCcw class="h-4 w-4" /></button>
          <!-- 撤回后可归档 -->
          <button v-if="r.status !== 'archived' && r.status !== 'published'" class="grid h-7 w-7 place-items-center rounded text-blue-600 hover:bg-blue-50" title="归档" @click="archiveRecord(r.id)"><Archive class="h-4 w-4" /></button>
        </div>
      </div>
      <div v-if="list.length === 0" class="py-10 text-center text-sm text-[var(--text-secondary)]">暂无通知</div>
    </div>

    <!-- 预览 Modal -->
    <Teleport to="body">
      <div v-if="previewBanner" class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/30" @click.self="closePreview">
        <div class="w-full max-w-[680px] mx-4 rounded-xl bg-[var(--card)] border border-[var(--surface-border)] p-6 shadow-lg">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-[var(--text)]">预览 → Dashboard 横幅</h3>
            <button class="text-[var(--text-secondary)] hover:text-[var(--text)]" @click="closePreview"><X class="h-4 w-4" /></button>
          </div>
          <div class="banner" style="margin-top:0">
            <div class="banner-badge">{{ previewBanner.type === 'alert' ? '⚠' : previewBanner.type === 'maintenance' ? '🔧' : previewBanner.type === 'new_tool' ? '🛠' : '📣' }}</div>
            <div class="banner-main">
              <h4>{{ previewBanner.title }}</h4>
              <p>{{ previewBanner.content }}</p>
            </div>
            <button class="banner-cta">查看详情 →</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.spacer { flex: 1; }
</style>

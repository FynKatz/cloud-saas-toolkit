<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Check, Plus, Trash2, ListTodo, Clock } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { useToolsStore } from '../stores/tools'

interface Task {
  id: string
  content: string
  status: '进行中' | '已完成'
  due_time: string | null
  completed_at: string | null
  created_at: string
}

const tasks = ref<Task[]>([])
const loading = ref(false)
const newTask = ref('')
const filter = ref<'all' | '进行中' | '已完成'>('all')
const toolsStore = useToolsStore()

const canEdit = computed(() => toolsStore.canEdit('todo'))

const filteredTasks = computed(() => {
  if (filter.value === 'all') return tasks.value
  return tasks.value.filter((t) => t.status === filter.value)
})

async function loadTasks() {
  loading.value = true
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  loading.value = false
  if (!error) tasks.value = (data as Task[]) ?? []
}

async function addTask() {
  const content = newTask.value.trim()
  if (!content || !canEdit.value) return
  const { data, error } = await supabase
    .from('tasks')
    .insert({ content, status: '进行中' })
    .select()
    .single()
  if (!error && data) {
    tasks.value.unshift(data as Task)
    newTask.value = ''
  }
}

async function toggleTask(task: Task) {
  if (!canEdit.value) return
  const next = task.status === '进行中' ? '已完成' : '进行中'
  const completedAt = next === '已完成' ? new Date().toISOString() : null
  const { error } = await supabase
    .from('tasks')
    .update({ status: next, completed_at: completedAt })
    .eq('id', task.id)
  if (!error) {
    task.status = next
    task.completed_at = completedAt
  }
}

async function deleteTask(task: Task) {
  if (!canEdit.value || !confirm('确定删除该任务？')) return
  const { error } = await supabase.from('tasks').delete().eq('id', task.id)
  if (!error) tasks.value = tasks.value.filter((t) => t.id !== task.id)
}

onMounted(loadTasks)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-0.5">
        <button
          v-for="opt in ['all', '进行中', '已完成']"
          :key="opt"
          class="rounded px-3 py-1.5 text-sm transition"
          :class="filter === opt ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'"
          @click="filter = opt as typeof filter"
        >
          {{ opt === 'all' ? '全部' : opt }}
        </button>
      </div>
      <span class="text-xs text-[var(--text-secondary)]">{{ filteredTasks.length }} 项</span>
    </div>

    <div v-if="canEdit" class="flex gap-2">
      <input
        v-model="newTask"
        class="h-10 flex-1 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
        placeholder="添加新任务..."
        @keyup.enter="addTask"
      />
      <button
        class="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-85"
        @click="addTask"
      >
        <Plus class="h-4 w-4" />
        添加
      </button>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-[var(--text-secondary)]">加载中...</div>

    <div v-else-if="filteredTasks.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
      <ListTodo class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">暂无任务</p>
    </div>

    <div v-else class="space-y-2">
      <div
        v-for="task in filteredTasks"
        :key="task.id"
        class="flex items-center gap-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] px-4 py-3 transition hover:border-[var(--accent)]"
      >
        <button
          class="grid h-5 w-5 shrink-0 place-items-center rounded-full border transition"
          :class="task.status === '已完成' ? 'border-emerald-400 bg-emerald-400 text-white' : 'border-[var(--surface-border)] hover:border-[var(--accent)]'"
          @click="toggleTask(task)"
        >
          <Check v-if="task.status === '已完成'" class="h-3 w-3" />
        </button>
        <div class="min-w-0 flex-1">
          <div
            class="truncate text-sm"
            :class="task.status === '已完成' ? 'text-[var(--text-secondary)] line-through' : 'text-[var(--text)]'"
          >
            {{ task.content }}
          </div>
          <div v-if="task.due_time" class="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
            <Clock class="h-3 w-3" />
            {{ new Date(task.due_time).toLocaleString('zh-CN') }}
          </div>
        </div>
        <button
          v-if="canEdit"
          class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-red-400"
          @click="deleteTask(task)"
        >
          <Trash2 class="h-4 w-4" />
        </button>
      </div>
    </div>
  </div>
</template>

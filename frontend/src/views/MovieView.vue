<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { Edit, Film, Plus, Search, Star, Trash2, X } from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { useToolsStore } from '../stores/tools'

interface Movie {
  id: string
  title: string
  original_title: string | null
  poster_path: string | null
  overview: string | null
  release_date: string | null
  genres: string[] | null
  rating: number | null
  watch_status: string | null
  notes: string | null
}

const movies = ref<Movie[]>([])
const loading = ref(false)
const searchQuery = ref('')
const showForm = ref(false)
const editingId = ref<string | null>(null)
const toolsStore = useToolsStore()

const canEdit = computed(() => toolsStore.canEdit('movie'))

const form = reactive({
  title: '',
  original_title: '',
  poster_path: '',
  overview: '',
  release_date: '',
  genres: '',
  rating: null as number | null,
  watch_status: '未看',
  notes: '',
})

const filteredMovies = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return movies.value
  return movies.value.filter(
    (m) =>
      m.title.toLowerCase().includes(q) ||
      (m.original_title ?? '').toLowerCase().includes(q) ||
      (m.genres ?? []).some((g) => g.toLowerCase().includes(q)),
  )
})

async function loadMovies() {
  loading.value = true
  const { data, error } = await supabase
    .from('movies_library')
    .select('*')
    .order('created_at', { ascending: false })
  loading.value = false
  if (!error) movies.value = (data as Movie[]) ?? []
}

function openCreate() {
  editingId.value = null
  form.title = ''
  form.original_title = ''
  form.poster_path = ''
  form.overview = ''
  form.release_date = ''
  form.genres = ''
  form.rating = null
  form.watch_status = '未看'
  form.notes = ''
  showForm.value = true
}

function openEdit(movie: Movie) {
  editingId.value = movie.id
  form.title = movie.title ?? ''
  form.original_title = movie.original_title ?? ''
  form.poster_path = movie.poster_path ?? ''
  form.overview = movie.overview ?? ''
  form.release_date = movie.release_date ?? ''
  form.genres = (movie.genres ?? []).join(', ')
  form.rating = movie.rating
  form.watch_status = movie.watch_status ?? '未看'
  form.notes = movie.notes ?? ''
  showForm.value = true
}

async function saveMovie() {
  const data = {
    title: form.title,
    original_title: form.original_title || null,
    poster_path: form.poster_path || null,
    overview: form.overview || null,
    release_date: form.release_date || null,
    genres: form.genres
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    rating: form.rating,
    watch_status: form.watch_status,
    notes: form.notes || null,
  }

  if (editingId.value) {
    const { error } = await supabase
      .from('movies_library')
      .update(data)
      .eq('id', editingId.value)
    if (!error) {
      const idx = movies.value.findIndex((m) => m.id === editingId.value)
      if (idx !== -1) movies.value[idx] = { ...movies.value[idx], ...data }
    }
  } else {
    const { data: row, error } = await supabase
      .from('movies_library')
      .insert(data)
      .select()
      .single()
    if (!error && row) movies.value.unshift(row as Movie)
  }
  showForm.value = false
}

async function deleteMovie(movie: Movie) {
  if (!confirm(`确定删除 "${movie.title}"？`)) return
  const { error } = await supabase.from('movies_library').delete().eq('id', movie.id)
  if (!error) movies.value = movies.value.filter((m) => m.id !== movie.id)
}

onMounted(loadMovies)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <div class="relative flex-1">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="searchQuery"
          class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-9 text-sm outline-none transition focus:border-[var(--accent)]"
          placeholder="搜索电影..."
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
          @click="searchQuery = ''"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        v-if="canEdit"
        class="flex items-center gap-1.5 rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-85"
        @click="openCreate"
      >
        <Plus class="h-4 w-4" />
        添加电影
      </button>
    </div>

    <div v-if="loading" class="py-10 text-center text-sm text-[var(--text-secondary)]">加载中...</div>

    <div v-else-if="filteredMovies.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
      <Film class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">{{ searchQuery ? '没有匹配的电影' : '暂无电影' }}</p>
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <div
        v-for="movie in filteredMovies"
        :key="movie.id"
        class="group overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] transition hover:border-[var(--accent)]"
      >
        <div class="relative aspect-[2/3] bg-[var(--bg)]">
          <img
            v-if="movie.poster_path"
            :src="movie.poster_path"
            :alt="movie.title"
            class="h-full w-full object-cover"
          />
          <div v-else class="flex h-full w-full items-center justify-center">
            <Film class="h-10 w-10 text-[var(--text-secondary)] opacity-30" />
          </div>
          <div v-if="canEdit" class="absolute right-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100">
            <button
              class="grid h-7 w-7 place-items-center rounded bg-black/60 text-white/80 hover:bg-black/80 hover:text-white"
              @click="openEdit(movie)"
            >
              <Edit class="h-3.5 w-3.5" />
            </button>
            <button
              class="grid h-7 w-7 place-items-center rounded bg-black/60 text-white/80 hover:bg-red-500 hover:text-white"
              @click="deleteMovie(movie)"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
          <div v-if="movie.rating" class="absolute bottom-2 left-2 flex items-center gap-1 rounded bg-black/70 px-2 py-0.5 text-xs text-amber-400">
            <Star class="h-3 w-3 fill-current" />
            {{ movie.rating }}
          </div>
        </div>
        <div class="p-3">
          <div class="truncate text-sm font-medium text-[var(--text)]">{{ movie.title }}</div>
          <div class="mt-1 flex flex-wrap gap-1">
            <span
              v-for="genre in (movie.genres ?? [])"
              :key="genre"
              class="rounded-full border border-[var(--surface-border)] bg-[var(--bg)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
            >
              {{ genre }}
            </span>
          </div>
          <div class="mt-1 text-[11px] text-[var(--text-secondary)]">
            {{ movie.release_date?.slice(0, 4) ?? '—' }}
            <span class="mx-1">·</span>
            {{ movie.watch_status ?? '未标记' }}
          </div>
        </div>
      </div>
    </div>

    <!-- Modal form -->
    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showForm = false"
      >
        <div class="w-full max-w-md rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
          <h3 class="mb-4 text-sm font-semibold tracking-normal text-[var(--text)]">
            {{ editingId ? '编辑电影' : '添加电影' }}
          </h3>
          <div class="space-y-3">
            <input v-model="form.title" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="标题 *" />
            <input v-model="form.original_title" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="原名" />
            <input v-model="form.poster_path" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="海报 URL" />
            <textarea v-model="form.overview" rows="2" class="w-full resize-none rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="简介" />
            <div class="grid grid-cols-2 gap-3">
              <input v-model="form.release_date" type="date" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" />
              <input v-model.number="form.rating" type="number" min="0" max="10" step="0.1" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="评分" />
            </div>
            <input v-model="form.genres" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="类型（逗号分隔）" />
            <select v-model="form.watch_status" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">
              <option value="未看">未看</option>
              <option value="已看">已看</option>
              <option value="想看">想看</option>
            </select>
            <textarea v-model="form.notes" rows="2" class="w-full resize-none rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="备注" />
          </div>
          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" @click="showForm = false">取消</button>
            <button class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-85" @click="saveMovie">保存</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

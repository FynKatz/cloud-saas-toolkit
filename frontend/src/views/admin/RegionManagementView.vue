<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RefreshCw, Search } from 'lucide-vue-next'
import { supabase } from '../../lib/supabase'

interface RegionRow {
  province_code: string
  province_name: string
  city_code: string
  city_name: string
  district_code: string
  district_name: string
  active: boolean
  sort_order: number
  updated_at: string
}

const rows = ref<RegionRow[]>([])
const loading = ref(false)
const saving = ref('')
const errorMsg = ref('')
const notice = ref('')
const keyword = ref('')
const provinceCode = ref('')
const page = ref(1)
const pageSize = 100

const provinces = computed(() => {
  const map = new Map<string, RegionRow>()
  for (const r of rows.value) {
    if (!map.has(r.province_code)) map.set(r.province_code, r)
  }
  return [...map.values()]
})

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (provinceCode.value && r.province_code !== provinceCode.value) return false
    if (!q) return true
    return (
      r.province_name.toLowerCase().includes(q) ||
      r.city_name.toLowerCase().includes(q) ||
      r.district_name.toLowerCase().includes(q) ||
      r.province_code.toLowerCase().includes(q) ||
      r.city_code.toLowerCase().includes(q) ||
      r.district_code.toLowerCase().includes(q)
    )
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const paged = computed(() =>
  filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

const stats = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((r) => r.active).length,
  provinces: provinces.value.length,
  cities: new Set(rows.value.map((r) => r.city_code)).size,
}))

function flash(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = ''), 3000)
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  const PAGE = 1000
  const all: RegionRow[] = []
  let lastError = ''
  for (let from = 0, guard = 0; guard < 20; from += PAGE, guard += 1) {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .order('province_code')
      .order('city_code')
      .order('district_code')
      .range(from, from + PAGE - 1)
    if (error) {
      lastError = error.message
      break
    }
    const batch = (data as RegionRow[]) ?? []
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  loading.value = false
  if (lastError) {
    errorMsg.value = lastError
    return
  }
  rows.value = all
}

async function toggleRegion(row: RegionRow) {
  if (saving.value) return
  const next = !row.active
  if (!confirm(`确认${next ? '启用' : '停用'} ${row.province_name} ${row.city_name} ${row.district_name}？`)) return
  saving.value = row.district_code
  errorMsg.value = ''
  const { error } = await supabase
    .from('regions')
    .update({ active: next })
    .eq('district_code', row.district_code)
  saving.value = ''
  if (error) {
    errorMsg.value = error.message
    return
  }
  row.active = next
  flash(next ? '行政区已启用' : '行政区已停用')
}

watch([keyword, provinceCode], () => {
  page.value = 1
})

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 sm:grid-cols-4">
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">行政区总数</div>
        <div class="mt-1 text-xl font-semibold text-[var(--text)]">{{ stats.total }}</div>
      </div>
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">启用</div>
        <div class="mt-1 text-xl font-semibold text-emerald-600">{{ stats.active }}</div>
      </div>
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">省级</div>
        <div class="mt-1 text-xl font-semibold text-[var(--text)]">{{ stats.provinces }}</div>
      </div>
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">地市级</div>
        <div class="mt-1 text-xl font-semibold text-[var(--text)]">{{ stats.cities }}</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <select
        v-model="provinceCode"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]"
      >
        <option value="">全部省份</option>
        <option v-for="p in provinces" :key="p.province_code" :value="p.province_code">
          {{ p.province_name }}
        </option>
      </select>
      <label class="relative ml-auto block">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="keyword"
          class="h-9 w-64 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          placeholder="搜索名称或区划代码..."
        />
      </label>
      <button
        class="inline-flex h-9 items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="load"
      >
        <RefreshCw class="h-4 w-4" /> 刷新
      </button>
    </div>

    <div v-if="notice" class="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
      {{ notice }}
    </div>
    <div v-if="errorMsg" class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ errorMsg }}
    </div>

    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--surface-border)] text-left text-[11px] uppercase text-[var(--text-secondary)]">
              <th class="px-4 py-3 font-medium">省</th>
              <th class="px-4 py-3 font-medium">市</th>
              <th class="px-4 py-3 font-medium">区县</th>
              <th class="px-4 py-3 font-medium">区划代码</th>
              <th class="px-4 py-3 font-medium">状态</th>
              <th class="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--surface-border)]">
            <tr v-for="row in paged" :key="row.district_code" class="transition hover:bg-[var(--nav-hover)]">
              <td class="px-4 py-2.5 text-[var(--text)]">{{ row.province_name }}</td>
              <td class="px-4 py-2.5 text-[var(--text-secondary)]">{{ row.city_name }}</td>
              <td class="px-4 py-2.5 text-[var(--text-secondary)]">{{ row.district_name }}</td>
              <td class="px-4 py-2.5 font-mono text-[11px] text-[var(--text-secondary)]">{{ row.district_code }}</td>
              <td class="px-4 py-2.5">
                <span class="rounded px-2 py-0.5 text-[11px] font-medium" :class="row.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                  {{ row.active ? '启用' : '停用' }}
                </span>
              </td>
              <td class="px-4 py-2.5">
                <div class="flex items-center justify-end">
                  <button
                    class="rounded px-2.5 py-1 text-[11px] transition disabled:opacity-50"
                    :class="row.active ? 'text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]' : 'text-emerald-600 hover:bg-emerald-50'"
                    :disabled="saving === row.district_code"
                    @click="toggleRegion(row)"
                  >
                    {{ saving === row.district_code ? '保存中…' : row.active ? '停用' : '启用' }}
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="paged.length === 0">
              <td colspan="6" class="px-4 py-10 text-center text-[var(--text-secondary)]">没有匹配的行政区</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="totalPages > 1" class="flex items-center justify-between border-t border-[var(--surface-border)] px-4 py-3 text-sm text-[var(--text-secondary)]">
        <span>共 {{ filtered.length }} 条，第 {{ page }} / {{ totalPages }} 页</span>
        <div class="flex gap-1">
          <button class="rounded border border-[var(--surface-border)] px-2.5 py-1 disabled:opacity-40" :disabled="page <= 1" @click="page--">上一页</button>
          <button class="rounded border border-[var(--surface-border)] px-2.5 py-1 disabled:opacity-40" :disabled="page >= totalPages" @click="page++">下一页</button>
        </div>
      </div>
    </div>
  </div>
</template>

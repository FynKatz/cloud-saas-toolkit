<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Pencil, RefreshCw, Search, Trash2, X } from 'lucide-vue-next'
import { supabase } from '../../lib/supabase'

interface RegionRow {
  province_code: string
  province_name: string
  city_code: string
  city_name: string
  district_code: string
  district_name: string
  active: boolean
}

interface ParkingLocation {
  id: string
  name: string
  province_code: string | null
  province: string | null
  city_code: string | null
  city: string | null
  district_code: string | null
  district: string | null
  mall_id: string | null
  mall: string | null
  address: string | null
  free_duration: number | null
  charge_interval: number | null
  day_price: number | null
  night_price: number | null
  day_unit: string | null
  night_unit: string | null
  notes: string | null
  status: 'active' | 'inactive'
  user_id: string
  created_at: string
  updated_at: string
}

interface ParkingMall {
  id: string
  name: string
  province: string | null
  city: string | null
  district: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  status: 'active' | 'inactive'
}

const PAGE_SIZE = 20

const rows = ref<ParkingLocation[]>([])
const malls = ref<ParkingMall[]>([])
const regions = ref<RegionRow[]>([])
const creators = ref<Record<string, string>>({})
const loading = ref(false)
const saving = ref('')
const errorMsg = ref('')
const notice = ref('')
const keyword = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const page = ref(1)
const modalOpen = ref(false)
const editId = ref<string | null>(null)
const form = reactive({
  name: '',
  mall_id: '',
  province_code: '',
  city_code: '',
  district_code: '',
  address: '',
  free_duration: '',
  charge_interval: '',
  day_price: '',
  night_price: '',
  day_unit: '',
  night_unit: '',
  notes: '',
  status: 'active' as 'active' | 'inactive',
})

const provinceOptions = computed(() => {
  const map = new Map<string, RegionRow>()
  for (const r of regions.value) if (!map.has(r.province_code)) map.set(r.province_code, r)
  return [...map.values()]
})
const cityOptions = computed(() => {
  if (!form.province_code) return []
  const map = new Map<string, RegionRow>()
  for (const r of regions.value) {
    if (r.province_code === form.province_code && !map.has(r.city_code)) map.set(r.city_code, r)
  }
  return [...map.values()]
})
const districtOptions = computed(() =>
  regions.value.filter((r) => r.province_code === form.province_code && r.city_code === form.city_code),
)
const mallOptions = computed(() => malls.value.filter((m) => m.status === 'active'))

const filtered = computed(() => {
  const q = keyword.value.trim().toLowerCase()
  return rows.value.filter((r) => {
    if (statusFilter.value !== 'all' && r.status !== statusFilter.value) return false
    if (!q) return true
    return [r.name, r.mall, r.province, r.city, r.district, r.address, r.notes].some((v) =>
      (v ?? '').toLowerCase().includes(q),
    )
  })
})
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const paged = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const stats = computed(() => ({
  total: rows.value.length,
  active: rows.value.filter((r) => r.status === 'active').length,
  inactive: rows.value.filter((r) => r.status === 'inactive').length,
}))

function flash(msg: string) {
  notice.value = msg
  setTimeout(() => (notice.value = ''), 3000)
}

function toNum(v: string): number | null {
  if (v.trim() === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function priceText(v: number | null): string {
  return v === null || v === undefined ? '' : String(v)
}

async function load() {
  loading.value = true
  errorMsg.value = ''
  const [locResult, mallResult] = await Promise.all([
    supabase.from('parking_locations').select('*').order('created_at', { ascending: false }),
    supabase.from('parking_malls').select('*'),
  ])
  loading.value = false
  if (locResult.error) errorMsg.value = locResult.error.message
  else rows.value = (locResult.data as ParkingLocation[]) ?? []
  if (!mallResult.error) malls.value = (mallResult.data as ParkingMall[]) ?? []

  // 行政区在后台异步加载，不阻塞主表展示
  fetchAllRegions().then((r) => {
    if (!r.error) regions.value = r.rows
  })

  if (!locResult.error && locResult.data?.length) {
    const ids = [...new Set(locResult.data.map((r: ParkingLocation) => r.user_id))]
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .in('id', ids)
    creators.value = Object.fromEntries(
      ((profiles as { id: string; username: string; display_name?: string | null }[]) ?? []).map((p) => [
        p.id,
        p.display_name || p.username,
      ]),
    )
  }
}

async function fetchAllRegions(): Promise<{ rows: RegionRow[]; error?: { message: string } }> {
  const PAGE = 1000
  const all: RegionRow[] = []
  let lastError: { message: string } | undefined
  for (let from = 0, guard = 0; guard < 20; from += PAGE, guard += 1) {
    const { data, error } = await supabase
      .from('regions')
      .select('*')
      .eq('active', true)
      .order('province_code')
      .order('city_code')
      .order('district_code')
      .range(from, from + PAGE - 1)
    if (error) {
      lastError = error
      break
    }
    const batch = (data as RegionRow[]) ?? []
    all.push(...batch)
    if (batch.length < PAGE) break
  }
  return { rows: all, error: lastError }
}

function openEdit(row: ParkingLocation) {
  editId.value = row.id
  form.name = row.name
  form.mall_id = row.mall_id ?? ''
  form.province_code = row.province_code ?? ''
  form.city_code = row.city_code ?? ''
  form.district_code = row.district_code ?? ''
  form.address = row.address ?? ''
  form.free_duration = priceText(row.free_duration)
  form.charge_interval = priceText(row.charge_interval)
  form.day_price = priceText(row.day_price)
  form.night_price = priceText(row.night_price)
  form.day_unit = row.day_unit ?? ''
  form.night_unit = row.night_unit ?? ''
  form.notes = row.notes ?? ''
  form.status = row.status
  errorMsg.value = ''
  modalOpen.value = true
}

function closeModal() {
  modalOpen.value = false
  editId.value = null
}

function selectedRegion(): RegionRow | undefined {
  return regions.value.find((r) => r.district_code === form.district_code)
}

function selectedMall(): ParkingMall | undefined {
  return malls.value.find((m) => m.id === form.mall_id)
}

async function save() {
  if (!editId.value) return
  const name = form.name.trim()
  if (!name) {
    errorMsg.value = '请输入停车场名称'
    return
  }
  saving.value = '__form'
  errorMsg.value = ''
  const region = selectedRegion()
  const mall = selectedMall()
  const payload = {
    name,
    mall_id: mall?.id ?? null,
    mall: mall?.name ?? null,
    province: region?.province_name ?? null,
    province_code: region?.province_code ?? null,
    city: region?.city_name ?? null,
    city_code: region?.city_code ?? null,
    district: region?.district_name ?? null,
    district_code: region?.district_code ?? null,
    address: form.address.trim() || null,
    free_duration: toNum(form.free_duration),
    charge_interval: toNum(form.charge_interval),
    day_price: toNum(form.day_price),
    night_price: toNum(form.night_price),
    day_unit: form.day_unit.trim() || null,
    night_unit: form.night_unit.trim() || null,
    notes: form.notes.trim() || null,
    status: form.status,
  }
  const { error } = await supabase.from('parking_locations').update(payload).eq('id', editId.value)
  saving.value = ''
  if (error) {
    errorMsg.value = error.message
    return
  }
  flash('停车场已更新')
  closeModal()
  await load()
}

async function toggleStatus(row: ParkingLocation) {
  const next = row.status === 'active' ? 'inactive' : 'active'
  if (!confirm(`确认${next === 'active' ? '启用' : '停用'} ${row.name}？`)) return
  saving.value = row.id
  errorMsg.value = ''
  const { error } = await supabase.from('parking_locations').update({ status: next }).eq('id', row.id)
  saving.value = ''
  if (error) {
    errorMsg.value = error.message
    return
  }
  row.status = next
  flash(next === 'active' ? '停车场已启用' : '停车场已停用')
}

async function remove(row: ParkingLocation) {
  if (!confirm(`确认物理删除停车场 ${row.name}？收藏记录会级联删除，图片对象需另行清理。`)) return
  saving.value = row.id
  errorMsg.value = ''
  const { error } = await supabase.from('parking_locations').delete().eq('id', row.id)
  saving.value = ''
  if (error) {
    errorMsg.value = error.message
    return
  }
  rows.value = rows.value.filter((r) => r.id !== row.id)
  flash('停车场已删除')
}

watch([keyword, statusFilter], () => {
  page.value = 1
})
watch(() => form.province_code, () => {
  form.city_code = ''
  form.district_code = ''
})
watch(() => form.city_code, () => {
  form.district_code = ''
})

onMounted(load)
</script>

<template>
  <div class="space-y-5">
    <div class="grid gap-3 sm:grid-cols-3">
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">停车场总数</div>
        <div class="mt-1 text-xl font-semibold text-[var(--text)]">{{ stats.total }}</div>
      </div>
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">启用</div>
        <div class="mt-1 text-xl font-semibold text-emerald-600">{{ stats.active }}</div>
      </div>
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="text-[11px] text-[var(--text-secondary)]">已停用</div>
        <div class="mt-1 text-xl font-semibold text-[var(--text)]">{{ stats.inactive }}</div>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-3">
      <div class="flex gap-1">
        <button
          v-for="tab in [{ key: 'all', label: '全部' }, { key: 'active', label: '启用' }, { key: 'inactive', label: '已停用' }] as const"
          :key="tab.key"
          class="rounded-md px-3 py-1.5 text-sm transition"
          :class="statusFilter === tab.key ? 'bg-[var(--accent)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]'"
          @click="statusFilter = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>
      <label class="relative ml-auto block">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="keyword"
          class="h-9 w-64 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-3 text-sm outline-none transition focus:border-[var(--accent)]"
          placeholder="搜索名称、区域或地址..."
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
    <div v-if="errorMsg && !modalOpen" class="rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
      {{ errorMsg }}
    </div>

    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-[var(--surface-border)] text-left text-[11px] uppercase text-[var(--text-secondary)]">
              <th class="px-4 py-3 font-medium">停车场</th>
              <th class="px-4 py-3 font-medium">商场</th>
              <th class="px-4 py-3 font-medium">区域</th>
              <th class="px-4 py-3 font-medium">价格</th>
              <th class="px-4 py-3 font-medium">状态</th>
              <th class="px-4 py-3 font-medium">创建人</th>
              <th class="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--surface-border)]">
            <tr v-for="row in paged" :key="row.id" class="transition hover:bg-[var(--nav-hover)]">
              <td class="px-4 py-3">
                <div class="font-medium text-[var(--text)]">{{ row.name }}</div>
                <div class="text-[11px] text-[var(--text-secondary)]">{{ row.address || '—' }}</div>
              </td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">{{ row.mall || '—' }}</td>
              <td class="px-4 py-3 text-[var(--text-secondary)]">
                {{ [row.province, row.city, row.district].filter(Boolean).join(' / ') || '—' }}
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                {{ row.day_price != null ? `日间 ${row.day_price}${row.day_unit || ''}` : '' }}
                <template v-if="row.day_price != null && row.night_price != null"> / </template>
                {{ row.night_price != null ? `夜间 ${row.night_price}${row.night_unit || ''}` : '' }}
                <span v-if="row.day_price == null && row.night_price == null">—</span>
              </td>
              <td class="px-4 py-3">
                <span class="rounded px-2 py-0.5 text-[11px] font-medium" :class="row.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'">
                  {{ row.status === 'active' ? '启用' : '停用' }}
                </span>
              </td>
              <td class="whitespace-nowrap px-4 py-3 text-[var(--text-secondary)]">
                {{ creators[row.user_id] || row.user_id.slice(0, 8) }}
              </td>
              <td class="px-4 py-3">
                <div class="flex items-center justify-end gap-1">
                  <button class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" title="编辑" @click="openEdit(row)">
                    <Pencil class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-7 w-7 place-items-center rounded disabled:opacity-50"
                    :class="row.status === 'active' ? 'text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]' : 'text-emerald-600 hover:bg-emerald-50'"
                    :title="row.status === 'active' ? '停用' : '启用'"
                    :disabled="saving === row.id"
                    @click="toggleStatus(row)"
                  >
                    <RefreshCw class="h-4 w-4" />
                  </button>
                  <button class="grid h-7 w-7 place-items-center rounded text-rose-600 hover:bg-rose-50 disabled:opacity-50" title="删除" :disabled="saving === row.id" @click="remove(row)">
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
            <tr v-if="paged.length === 0">
              <td colspan="7" class="px-4 py-10 text-center text-[var(--text-secondary)]">没有匹配的停车场</td>
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

    <div v-if="modalOpen" class="fixed inset-0 z-50 grid place-items-center bg-black/40" @click.self="closeModal">
      <div class="max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5 shadow-xl">
        <div class="mb-4 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-[var(--text)]">编辑停车场</h3>
          <button class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" @click="closeModal">
            <X class="h-4 w-4" />
          </button>
        </div>

        <div v-if="errorMsg" class="mb-3 rounded-md border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {{ errorMsg }}
        </div>

        <div class="space-y-3">
          <div class="grid gap-3 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">停车场名称 *</span>
              <input v-model="form.name" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">商场</span>
              <select v-model="form.mall_id" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]">
                <option value="">无</option>
                <option v-for="m in mallOptions" :key="m.id" :value="m.id">{{ m.name }}</option>
              </select>
            </label>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">省</span>
              <select v-model="form.province_code" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]">
                <option value="">请选择</option>
                <option v-for="p in provinceOptions" :key="p.province_code" :value="p.province_code">{{ p.province_name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">市</span>
              <select v-model="form.city_code" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]" :disabled="!form.province_code">
                <option value="">请选择</option>
                <option v-for="c in cityOptions" :key="c.city_code" :value="c.city_code">{{ c.city_name }}</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">区县</span>
              <select v-model="form.district_code" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]" :disabled="!form.city_code">
                <option value="">请选择</option>
                <option v-for="d in districtOptions" :key="d.district_code" :value="d.district_code">{{ d.district_name }}</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="mb-1 block text-xs text-[var(--text-secondary)]">地址</span>
            <input v-model="form.address" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" />
          </label>
          <div class="grid gap-3 sm:grid-cols-4">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">免费时长</span>
              <input v-model="form.free_duration" type="number" min="0" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="分钟" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">计费周期</span>
              <input v-model="form.charge_interval" type="number" min="0" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="分钟" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">日间价格</span>
              <input v-model="form.day_price" type="number" min="0" step="0.01" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="0.00" />
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">夜间价格</span>
              <input v-model="form.night_price" type="number" min="0" step="0.01" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm outline-none focus:border-[var(--accent)]" placeholder="0.00" />
            </label>
          </div>
          <div class="grid gap-3 sm:grid-cols-3">
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">日间单位</span>
              <select v-model="form.day_unit" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]">
                <option value="">无</option>
                <option value="元/小时">元/小时</option>
                <option value="元/分钟">元/分钟</option>
                <option value="元/次">元/次</option>
                <option value="元/天">元/天</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">夜间单位</span>
              <select v-model="form.night_unit" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]">
                <option value="">无</option>
                <option value="元/小时">元/小时</option>
                <option value="元/分钟">元/分钟</option>
                <option value="元/次">元/次</option>
                <option value="元/天">元/天</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1 block text-xs text-[var(--text-secondary)]">状态</span>
              <select v-model="form.status" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm outline-none focus:border-[var(--accent)]">
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </label>
          </div>
          <label class="block">
            <span class="mb-1 block text-xs text-[var(--text-secondary)]">备注</span>
            <textarea v-model="form.notes" rows="2" class="w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
          </label>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="h-9 rounded-md border border-[var(--surface-border)] px-4 text-sm text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]" @click="closeModal">取消</button>
          <button :disabled="!!saving" class="h-9 rounded-md bg-[var(--accent)] px-4 text-sm font-medium text-white disabled:opacity-60" @click="save">
            {{ saving === '__form' ? '保存中…' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

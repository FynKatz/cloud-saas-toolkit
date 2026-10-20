<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import {
  Car,
  Clock,
  Edit,
  Image,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-vue-next'
import { supabase } from '../lib/supabase'
import { useToolsStore } from '../stores/tools'

interface ParkingRecord {
  id: string
  province: string | null
  city: string | null
  district: string | null
  mall: string | null
  address: string | null
  free_duration: number | null
  charge_interval: number | null
  day_price: number | null
  night_price: number | null
  day_unit: string | null
  night_unit: string | null
  notes: string | null
  images: string[] | null
  created_at: string
}

const records = ref<ParkingRecord[]>([])
const loading = ref(false)
const loadError = ref('')
const saving = ref(false)
const showForm = ref(false)
const editingId = ref<string | null>(null)
const searchQuery = ref('')
const provinceFilter = ref('')
const cityFilter = ref('')
const districtFilter = ref('')
const mallFilter = ref('')
const imageUrls = ref('')

const toolsStore = useToolsStore()
const canEdit = computed(() => toolsStore.canEdit('parking'))

const form = reactive({
  province: '',
  city: '',
  district: '',
  mall: '',
  address: '',
  free_duration: null as number | null,
  charge_interval: null as number | null,
  day_price: null as number | null,
  night_price: null as number | null,
  day_unit: '元/小时',
  night_unit: '元/小时',
  notes: '',
})

const provinceOptions = computed(() => uniqueValues('province'))
const cityOptions = computed(() => uniqueValues('city'))
const districtOptions = computed(() => uniqueValues('district'))
const mallOptions = computed(() => uniqueValues('mall'))

function uniqueValues(field: 'province' | 'city' | 'district' | 'mall') {
  const values = records.value
    .map((record) => record[field])
    .filter((value): value is string => Boolean(value))
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return records.value.filter((record) => {
    if (provinceFilter.value && record.province !== provinceFilter.value) return false
    if (cityFilter.value && record.city !== cityFilter.value) return false
    if (districtFilter.value && record.district !== districtFilter.value) return false
    if (mallFilter.value && record.mall !== mallFilter.value) return false

    if (!query) return true
    const haystack = [
      record.province,
      record.city,
      record.district,
      record.mall,
      record.address,
      record.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(query)
  })
})

function resetFilters() {
  searchQuery.value = ''
  provinceFilter.value = ''
  cityFilter.value = ''
  districtFilter.value = ''
  mallFilter.value = ''
}

async function loadRecords() {
  loading.value = true
  loadError.value = ''
  const { data, error } = await supabase
    .from('parking_info')
    .select('*')
    .order('created_at', { ascending: false })
  loading.value = false
  if (error) {
    loadError.value = error.message
    return
  }
  records.value = (data as ParkingRecord[]) ?? []
}

function openCreate() {
  editingId.value = null
  resetForm()
  showForm.value = true
}

function openEdit(record: ParkingRecord) {
  editingId.value = record.id
  form.province = record.province ?? ''
  form.city = record.city ?? ''
  form.district = record.district ?? ''
  form.mall = record.mall ?? ''
  form.address = record.address ?? ''
  form.free_duration = record.free_duration
  form.charge_interval = record.charge_interval
  form.day_price = record.day_price
  form.night_price = record.night_price
  form.day_unit = record.day_unit ?? '元/小时'
  form.night_unit = record.night_unit ?? '元/小时'
  form.notes = record.notes ?? ''
  imageUrls.value = (record.images ?? []).join(', ')
  showForm.value = true
}

function resetForm() {
  form.province = ''
  form.city = ''
  form.district = ''
  form.mall = ''
  form.address = ''
  form.free_duration = null
  form.charge_interval = null
  form.day_price = null
  form.night_price = null
  form.day_unit = '元/小时'
  form.night_unit = '元/小时'
  form.notes = ''
  imageUrls.value = ''
}

async function saveRecord() {
  if (!canEdit.value) return
  const payload = {
    province: form.province.trim() || null,
    city: form.city.trim() || null,
    district: form.district.trim() || null,
    mall: form.mall.trim() || null,
    address: form.address.trim() || null,
    free_duration: form.free_duration,
    charge_interval: form.charge_interval,
    day_price: form.day_price,
    night_price: form.night_price,
    day_unit: form.day_unit,
    night_unit: form.night_unit,
    notes: form.notes.trim() || null,
    images: imageUrls.value
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean),
  }

  saving.value = true
  if (editingId.value) {
    const { error } = await supabase
      .from('parking_info')
      .update(payload)
      .eq('id', editingId.value)
    if (!error) {
      const index = records.value.findIndex((record) => record.id === editingId.value)
      if (index !== -1) records.value[index] = { ...records.value[index], ...payload }
    }
  } else {
    const { data, error } = await supabase
      .from('parking_info')
      .insert(payload)
      .select()
      .single()
    if (!error && data) records.value.unshift(data as ParkingRecord)
  }
  saving.value = false
  showForm.value = false
}

async function deleteRecord(record: ParkingRecord) {
  if (!canEdit.value || !confirm(`确定删除「${record.mall ?? '该停车记录'}」？`)) return
  const { error } = await supabase.from('parking_info').delete().eq('id', record.id)
  if (!error) records.value = records.value.filter((item) => item.id !== record.id)
}

function priceText(price: number | null, unit: string | null) {
  if (price === null || price === undefined) return '—'
  return `${price} ${unit || '元/小时'}`
}

onMounted(loadRecords)
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-2">
      <div class="relative min-w-0 flex-1">
        <span
          class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
        >
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="searchQuery"
          class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-9 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
          placeholder="搜索商场、地址或备注..."
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
        添加记录
      </button>
    </div>

    <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      <select
        v-model="provinceFilter"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      >
        <option value="">所有省份</option>
        <option v-for="value in provinceOptions" :key="value" :value="value">{{ value }}</option>
      </select>
      <select
        v-model="cityFilter"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      >
        <option value="">所有城市</option>
        <option v-for="value in cityOptions" :key="value" :value="value">{{ value }}</option>
      </select>
      <select
        v-model="districtFilter"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      >
        <option value="">所有行政区</option>
        <option v-for="value in districtOptions" :key="value" :value="value">{{ value }}</option>
      </select>
      <select
        v-model="mallFilter"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
      >
        <option value="">所有商场</option>
        <option v-for="value in mallOptions" :key="value" :value="value">{{ value }}</option>
      </select>
    </div>

    <div v-if="loading" class="py-12 text-center text-sm text-[var(--text-secondary)]">加载中...</div>

    <div v-else-if="loadError" class="py-12 text-center text-sm text-[var(--text-secondary)]">
      加载失败：{{ loadError }}
      <button class="ml-2 text-[var(--accent)] hover:underline" @click="loadRecords">重试</button>
    </div>

    <div v-else-if="filteredRecords.length === 0" class="flex flex-col items-center py-12 text-[var(--text-secondary)]">
      <Car class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">暂无停车记录</p>
      <button v-if="searchQuery || provinceFilter || cityFilter || districtFilter || mallFilter" class="mt-2 text-xs text-[var(--accent)] hover:underline" @click="resetFilters">
        清除筛选
      </button>
    </div>

    <div v-else class="overflow-hidden rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-[var(--surface-border)] text-sm">
          <thead class="bg-[var(--bg)]">
            <tr class="text-left text-[var(--text-secondary)]">
              <th class="px-4 py-3 font-medium">区域</th>
              <th class="px-4 py-3 font-medium">商场</th>
              <th class="px-4 py-3 font-medium">地址</th>
              <th class="px-4 py-3 font-medium">免费 / 计费</th>
              <th class="px-4 py-3 font-medium">日间</th>
              <th class="px-4 py-3 font-medium">夜间</th>
              <th v-if="canEdit" class="px-4 py-3 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-[var(--surface-border)]">
            <tr v-for="record in filteredRecords" :key="record.id" class="align-top transition hover:bg-[var(--bg)]">
              <td class="px-4 py-3 text-[var(--text)]">
                <div>{{ record.city || '—' }} {{ record.district || '' }}</div>
                <div class="text-[11px] text-[var(--text-secondary)]">{{ record.province || '' }}</div>
              </td>
              <td class="px-4 py-3 text-[var(--text)]">
                <div class="font-medium">{{ record.mall || '—' }}</div>
                <div v-if="record.images?.length" class="mt-1 flex items-center gap-1 text-[11px] text-[var(--text-secondary)]">
                  <Image class="h-3 w-3" />
                  {{ record.images.length }} 张图片
                </div>
              </td>
              <td class="max-w-[240px] px-4 py-3 text-[var(--text-secondary)]">
                <div class="line-clamp-2">{{ record.address || '—' }}</div>
              </td>
              <td class="px-4 py-3 text-[var(--text)]">
                <div class="flex items-center gap-1">
                  <Clock class="h-3.5 w-3.5 text-[var(--text-secondary)]" />
                  <span>{{ record.free_duration ?? '—' }} 分钟</span>
                </div>
                <div class="mt-1 text-[11px] text-[var(--text-secondary)]">
                  重新计费 {{ record.charge_interval ?? '—' }} 分钟
                </div>
              </td>
              <td class="px-4 py-3 text-[var(--text)]">{{ priceText(record.day_price, record.day_unit) }}</td>
              <td class="px-4 py-3 text-[var(--text)]">{{ priceText(record.night_price, record.night_unit) }}</td>
              <td v-if="canEdit" class="px-4 py-3 text-right">
                <div class="inline-flex items-center gap-1">
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--accent)]"
                    title="编辑"
                    @click="openEdit(record)"
                  >
                    <Edit class="h-4 w-4" />
                  </button>
                  <button
                    class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-red-400"
                    title="删除"
                    @click="deleteRecord(record)"
                  >
                    <Trash2 class="h-4 w-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Teleport to="body">
      <div
        v-if="showForm"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="showForm = false"
      >
        <div class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold tracking-normal text-[var(--text)]">
              {{ editingId ? '编辑停车记录' : '添加停车记录' }}
            </h3>
            <button
              class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)]"
              @click="showForm = false"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <div class="mt-4 grid gap-3 sm:grid-cols-2">
            <input v-model="form.province" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="省份" />
            <input v-model="form.city" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="城市" />
            <input v-model="form.district" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="行政区" />
            <input v-model="form.mall" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="商场名称" />
            <div class="sm:col-span-2">
              <input v-model="form.address" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="详细地址" />
            </div>
            <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Clock class="h-4 w-4" />
              免费时长（分钟）
            </label>
            <input v-model.number="form.free_duration" type="number" min="0" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="15" />
            <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Clock class="h-4 w-4" />
              重新计费（分钟）
            </label>
            <input v-model.number="form.charge_interval" type="number" min="0" class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="30" />
            <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Car class="h-4 w-4" />
              日间价格
            </label>
            <div class="flex gap-2">
              <input v-model.number="form.day_price" type="number" min="0" step="0.01" class="h-9 min-w-0 flex-1 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="8" />
              <select v-model="form.day_unit" class="h-9 w-28 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">
                <option>元/小时</option>
                <option>元/次</option>
                <option>元/天</option>
              </select>
            </div>
            <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
              <Car class="h-4 w-4" />
              夜间价格
            </label>
            <div class="flex gap-2">
              <input v-model.number="form.night_price" type="number" min="0" step="0.01" class="h-9 min-w-0 flex-1 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="1" />
              <select v-model="form.night_unit" class="h-9 w-28 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">
                <option>元/小时</option>
                <option>元/次</option>
                <option>元/天</option>
              </select>
            </div>
            <div class="sm:col-span-2">
              <textarea v-model="form.notes" rows="2" class="w-full resize-none rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="备注信息" />
            </div>
            <div class="sm:col-span-2">
              <input v-model="imageUrls" class="h-9 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]" placeholder="图片 URL，多个用逗号分隔" />
            </div>
          </div>

          <div class="mt-4 flex justify-end gap-2">
            <button class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text)]" @click="showForm = false">取消</button>
            <button class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-85" :disabled="saving" @click="saveRecord">
              {{ saving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

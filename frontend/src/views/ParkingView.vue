<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import {
  Car,
  Edit,
  Eye,
  Heart,
  Image,
  LayoutList,
  LocateFixed,
  MapPin,
  Minus,
  Navigation,
  Pencil,
  Check,
  Plus,
  RefreshCw,
  Search,
  Star,
  Trash2,
  X,
  Zap,
} from 'lucide-vue-next'
import { useParking } from '../composables/useParking'
import { useRegions } from '../composables/useRegions'
import { useMalls } from '../composables/useMalls'
import { loadAMap, amapStatus, geocodeAddress, searchPlaces } from '../lib/amap'
import type { ParkingLocation } from '../types/parking'

type DrawerKind = 'detail' | 'form'

const parking = useParking()
const regions = useRegions()
const malls = useMalls()

const mapEl = ref<HTMLDivElement | null>(null)
const formMapEl = ref<HTMLDivElement | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const drawer = ref<DrawerKind | null>(null)
const selectedId = ref<string | null>(null)
const editingId = ref<string | null>(null)
const formBusy = ref(false)
const saveError = ref('')
const actionError = ref('')
const uploadFiles = ref<File[]>([])
const uploadPreviews = ref<string[]>([])
const existingImages = ref<string[]>([])
const mapReady = ref(false)
const formMapReady = ref(false)
const mapError = ref('')
const mapStatus = ref('')
const mapSearch = ref('')
const locating = ref(false)
const mapLoading = ref(false)
const showCreateMall = ref(false)
const newMallName = ref('')

let map: any = null
let formMap: any = null
let formMarker: any = null
let markers: any[] = []
let infoWindow: any = null
const searchQuery = ref('')
const provinceCode = ref('')
const cityCode = ref('')
const districtCode = ref('')
const mallId = ref('')
const favoritesOnly = ref(false)

const filterActive = computed(() =>
  Boolean(
    searchQuery.value ||
    provinceCode.value ||
    cityCode.value ||
    districtCode.value ||
    mallId.value ||
    favoritesOnly.value,
  ),
)

const provinces = computed(() => regions.provinces.value)

const cities = computed(() =>
  regions.cities.value.filter(
    (r) => !provinceCode.value || r.province_code === provinceCode.value,
  ),
)

const districts = computed(() =>
  regions.districts.value.filter(
    (r) => (cityCode.value
      ? r.city_code === cityCode.value
      : !provinceCode.value || r.province_code === provinceCode.value),
  ),
)

const filtered = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return parking.locations.value.filter((loc) => {
    if (favoritesOnly.value && !loc.is_favorited) return false
    if (provinceCode.value && loc.province_code !== provinceCode.value) return false
    if (cityCode.value && loc.city_code !== cityCode.value) return false
    if (districtCode.value && loc.district_code !== districtCode.value) return false
    if (mallId.value && loc.mall_id !== mallId.value) return false
    if (!q) return true
    const hay = [
      loc.name,
      loc.mall,
      loc.province,
      loc.city,
      loc.district,
      loc.address,
      loc.notes,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return hay.includes(q)
  })
})

const filteredTotal = computed(() => filtered.value.length)
const provinceTotal = computed(
  () => new Set(parking.locations.value.map((l) => l.province_code).filter(Boolean)).size,
)
const freeTotal = computed(
  () => parking.locations.value.filter((l) => (l.free_duration ?? 0) > 0).length,
)
const favoriteTotal = computed(
  () => parking.locations.value.filter((l) => l.is_favorited).length,
)

const metrics = computed(() => [
  { label: '全部记录', value: filteredTotal.value, note: '当前筛选结果', dot: true },
  { label: '覆盖省级', value: provinceTotal.value, note: '全国已收录', dot: false },
  { label: '免费停车', value: freeTotal.value, note: '含免费时长记录', dot: false },
  { label: '收藏停车场', value: favoriteTotal.value, note: '我的收藏', dot: false },
])

const selected = computed(() =>
  parking.locations.value.find((l) => l.id === selectedId.value) ?? null,
)

const form = reactive({
  name: '',
  province_code: '',
  city_code: '',
  district_code: '',
  mall_id: '',
  address: '',
  location: null as { lng: number; lat: number } | null,
  free_duration: null as number | null,
  charge_interval: null as number | null,
  day_price: null as number | null,
  night_price: null as number | null,
  day_unit: '元/小时',
  night_unit: '元/小时',
  notes: '',
})

const priceUnits = ['元/小时', '元/分钟', '元/次', '元/天']

const formRegionLabel = computed(() => {
  const p = regions.regions.value.find((r) => r.province_code === form.province_code)
  const c = regions.regions.value.find((r) => r.city_code === form.city_code)
  const d = regions.regions.value.find((r) => r.district_code === form.district_code)
  return [p?.province_name, c?.city_name, d?.district_name].filter(Boolean).join(' / ') ||
    '请选择省市县'
})

const provinceOptions = computed(() => regions.provinces.value)

const cityOptions = computed(() =>
  regions.cities.value.filter(
    (r) => !form.province_code || r.province_code === form.province_code,
  ),
)

const districtOptions = computed(() =>
  regions.districts.value.filter(
    (r) => !form.city_code || r.city_code === form.city_code,
  ),
)

function priceText(price: number | null, unit: string | null): string {
  if (price === null || price === undefined) return '—'
  return `${price} ${unit || '元/小时'}`
}

function freeText(loc: ParkingLocation): string {
  if (!loc.free_duration) return '无免费'
  return `免费 ${loc.free_duration} 分钟`
}

function intervalText(loc: ParkingLocation): string {
  return `${loc.charge_interval || '—'} 分钟重新计费`
}

function regionText(loc: Pick<ParkingLocation, 'province' | 'city' | 'district'>): string {
  return [loc.city, loc.district].filter(Boolean).join(' ') || loc.province || '—'
}

async function init() {
  parking.refresh()
  await Promise.all([regions.load(), malls.load()])
  initMap()
  await nextTick()
  initFormMap()
}

async function initMap() {
  await nextTick()
  if (!mapEl.value || mapReady.value) return
  const status = await amapStatus()
  if (!status.ok || !mapEl.value) {
    mapError.value = status.error || 'AMAP_LOAD_FAILED'
    return
  }
  try {
    const AMap = await loadAMap()
    map = new AMap.Map(mapEl.value, {
      zoom: 11,
      center: [116.397428, 39.90923],
      viewMode: '2D',
    })
    infoWindow = new AMap.InfoWindow({ offset: new AMap.Pixel(0, -30) })
    mapReady.value = true
    renderMarkers()
    map.on('click', (e: any) => {
      if (drawer.value === 'form') {
        const lng = e.lnglat.getLng()
        const lat = e.lnglat.getLat()
        setFormSelection(lng, lat)
        const picked = form.location
        form.address = form.address || (picked
          ? `已选坐标 ${picked.lng.toFixed(6)}, ${picked.lat.toFixed(6)}`
          : '')
      }
    })
  } catch (e) {
    mapError.value = e instanceof Error ? e.message : 'AMAP_INIT_FAILED'
  }
}

async function initFormMap(): Promise<void> {
  await nextTick()
  if (!drawer.value || drawer.value !== 'form') return
  if (!formMapEl.value || formMapReady.value) return
  const status = await amapStatus()
  if (!status.ok || !formMapEl.value) return
  try {
    const AMap = await loadAMap()
    formMap = new AMap.Map(formMapEl.value, {
      zoom: 12,
      center: [116.397428, 39.90923],
      viewMode: '2D',
    })
    formMapReady.value = true
    formMap.on('click', (e: any) => {
      setFormSelection(e.lnglat.getLng(), e.lnglat.getLat())
    })
    setTimeout(() => formMap?.resize?.(), 50)
  } catch {
    formMapReady.value = false
  }
}

function setFormSelection(lng: number, lat: number, address?: string) {
  form.location = { lng, lat }
  if (address) form.address = address
  if (formMap) {
    formMap.setCenter([lng, lat])
    formMap.setZoom(16)
    if (!formMarker) {
      const AMap = (window as any).AMap
      formMarker = new AMap.Marker({ anchor: 'bottom-center' })
    }
    formMarker.setMap(formMap)
    formMarker.setPosition([lng, lat])
  }
}

function clearFormSelection() {
  form.location = null
  if (formMap && formMarker) {
    formMarker.setMap(null)
    formMarker = null
  }
}

function clearMarkers() {
  markers.forEach((m) => m.setMap(null))
  markers = []
}

function renderMarkers() {
  if (!map) return
  clearMarkers()
  const visible = filtered.value.filter((l) => l.location)
  mapLoading.value = true
  visible.forEach((loc) => {
    if (!loc.location) return
    const marker = new (window as any).AMap.Marker({
      position: [loc.location.lng, loc.location.lat],
      title: loc.name,
      anchor: 'bottom-center',
    })
    marker.on('click', () => {
      openDetail(loc)
      setMapCenter(loc)
    })
    markers.push(marker)
    marker.setMap(map)
  })
  mapLoading.value = false
  if (!visible.length) {
    mapStatus.value = '暂无坐标，点击添加或使用地图搜索'
    return
  }
  if (selected.value) setMapCenter(selected.value)
  else fitMarkers()
}

function fitMarkers() {
  if (!map || !markers.length) return
  const points = markers.map((m) => m.getPosition())
  map.setFitView(markers, false, [60, 60, 60, 60])
  mapStatus.value = `共 ${points.length} 个停车场`
}

function setMapCenter(loc: ParkingLocation) {
  if (!map || !loc.location) return
  map.setZoom(Math.max(map.getZoom(), 13))
  map.setCenter([loc.location.lng, loc.location.lat])
  if (infoWindow) {
    infoWindow.setContent(`
      <div class="amap-info">
        <strong>${escapeHtml(loc.name)}</strong>
        <span>${escapeHtml(regionText(loc))}</span>
        <span>${escapeHtml(priceText(loc.day_price, loc.day_unit))} / ${escapeHtml(priceText(loc.night_price, loc.night_unit))}</span>
      </div>
    `)
    infoWindow.open(map, [loc.location.lng, loc.location.lat])
  }
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] as string,
  )
}

function imageUrl(id: string): string {
  return parking.imageUrls.value[id]?.[0] || ''
}

function imageList(id: string): string[] {
  return [...(parking.imageUrls.value[id] ?? [])]
}

function existingImageUrl(path: string): string {
  const key = editingId.value || ''
  const urls = parking.imageUrls.value[key] ?? []
  const index = existingImages.value.indexOf(path)
  return urls[index] || ''
}

function selectCard(loc: ParkingLocation) {
  selectedId.value = loc.id
  renderMarkers()
}

function openDetail(loc: ParkingLocation) {
  selectedId.value = loc.id
  actionError.value = ''
  drawer.value = 'detail'
}

function openCreate() {
  editingId.value = null
  resetForm()
  drawer.value = 'form'
  nextTick(() => initFormMap())
}

function openEdit(loc: ParkingLocation) {
  editingId.value = loc.id
  actionError.value = ''
  form.name = loc.name
  form.province_code = loc.province_code || ''
  form.city_code = loc.city_code || ''
  form.district_code = loc.district_code || ''
  form.mall_id = loc.mall_id || ''
  newMallName.value = loc.mall_id ? '' : (loc.mall || '')
  showCreateMall.value = false
  form.address = loc.address || ''
  form.location = loc.location ? { lng: loc.location.lng, lat: loc.location.lat } : null
  form.free_duration = loc.free_duration
  form.charge_interval = loc.charge_interval
  form.day_price = loc.day_price
  form.night_price = loc.night_price
  form.day_unit = loc.day_unit || '元/小时'
  form.night_unit = loc.night_unit || '元/小时'
  form.notes = loc.notes || ''
  existingImages.value = [...(loc.images ?? [])]
  uploadFiles.value = []
  uploadPreviews.value = []
  drawer.value = 'form'
  nextTick(() => {
    if (form.location) {
      setFormSelection(form.location.lng, form.location.lat)
    }
    initFormMap()
  })
}

function resetForm() {
  form.name = ''
  form.province_code = ''
  form.city_code = ''
  form.district_code = ''
  form.mall_id = ''
  form.address = ''
  form.location = null
  form.free_duration = null
  form.charge_interval = null
  form.day_price = null
  form.night_price = null
  form.day_unit = '元/小时'
  form.night_unit = '元/小时'
  form.notes = ''
  existingImages.value = []
  uploadFiles.value = []
  revokePreviews()
  showCreateMall.value = false
  newMallName.value = ''
  saveError.value = ''
  clearFormSelection()
  formMapReady.value = false
  if (formMap) {
    try {
      formMap.destroy()
    } catch {
      // AMap 实例可能已被页面销毁，忽略重开抽屉时的清理错误。
    }
    formMap = null
  }
  formMarker = null
}

function closeDrawer() {
  drawer.value = null
  revokePreviews()
}

function handleMallSelect(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  if (value === '__new') {
    showCreateMall.value = true
    form.mall_id = ''
    newMallName.value = ''
  }
}

function confirmNewMall() {
  if (!newMallName.value.trim()) return
  form.mall_id = '__new'
  showCreateMall.value = false
  saveError.value = ''
}

function cancelNewMall() {
  showCreateMall.value = false
  newMallName.value = ''
  form.mall_id = ''
}

async function saveForm() {
  const name = form.name.trim()
  if (!name) {
    saveError.value = '请填写停车场名称'
    return
  }
  if (!form.province_code || !form.city_code || !form.district_code) {
    saveError.value = '请选择省市县'
    return
  }
  if (!form.location) {
    saveError.value = '请在地图上点击选点，或使用地址解析回填坐标'
    return
  }

  formBusy.value = true
  saveError.value = ''
  try {
    const p = regions.regions.value.find((r) => r.province_code === form.province_code)
    const c = regions.regions.value.find((r) => r.city_code === form.city_code)
    const d = regions.regions.value.find((r) => r.district_code === form.district_code)
    const selectedMall = malls.malls.value.find((m) => m.id === form.mall_id)
    const mallName = selectedMall?.name || newMallName.value.trim()
    const payload = {
      name,
      province_code: form.province_code,
      province: p?.province_name || null,
      city_code: form.city_code,
      city: c?.city_name || null,
      district_code: form.district_code,
      district: d?.district_name || null,
      mall_id: selectedMall?.id ?? null,
      mall: mallName || null,
      address: form.address.trim() || null,
      location: form.location,
      free_duration: form.free_duration,
      charge_interval: form.charge_interval,
      day_price: form.day_price,
      night_price: form.night_price,
      day_unit: form.day_unit,
      night_unit: form.night_unit,
      notes: form.notes.trim() || null,
      images: existingImages.value.length ? existingImages.value : null,
    }

    if (editingId.value) {
      const res = await parking.updateLocation(editingId.value, {
        ...payload,
        images: existingImages.value,
      })
      if (res.error) {
        saveError.value = res.error
        return
      }
    } else {
      const res = await parking.createLocationWithImages(payload, uploadFiles.value)
      if (res.error) {
        saveError.value = res.error
        return
      }
    }
    drawer.value = null
    await malls.load()
    await parking.refresh()
    renderMarkers()
  } finally {
    formBusy.value = false
  }
}

function handleFileSelect(event: Event) {
  const input = event.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (!files.length) return
  uploadFiles.value.push(...files)
  uploadPreviews.value.push(...files.map((f) => URL.createObjectURL(f)))
  input.value = ''
}

function removeNewPreview(index: number) {
  const url = uploadPreviews.value[index]
  if (url) URL.revokeObjectURL(url)
  uploadPreviews.value.splice(index, 1)
  uploadFiles.value.splice(index, 1)
}

function removeExistingImage(path: string) {
  existingImages.value = existingImages.value.filter((p) => p !== path)
}

function revokePreviews() {
  uploadPreviews.value.forEach((url) => URL.revokeObjectURL(url))
  uploadPreviews.value = []
  uploadFiles.value = []
}

async function toggleFavorite(loc: ParkingLocation) {
  const res = await parking.toggleFavorite(loc.id, !loc.is_favorited)
  if (res.error) actionError.value = res.error
}

async function setStatus(loc: ParkingLocation, status: 'active' | 'inactive') {
  if (!confirm(`确认${status === 'inactive' ? '停用' : '启用'}「${loc.name}」？停用后普通用户将不可见。`)) return
  const res = await parking.setStatus(loc.id, status)
  if (res.error) {
    actionError.value = res.error
    return
  }
  if (status === 'inactive') drawer.value = null
  renderMarkers()
}

async function removeLocation(loc: ParkingLocation) {
  if (!confirm(`确认删除「${loc.name}」？删除后无法恢复。`)) return
  const res = await parking.deleteLocation(loc.id)
  if (res.error) {
    actionError.value = res.error
    return
  }
  drawer.value = null
  renderMarkers()
}

async function runAddressSearch() {
  const keyword = mapSearch.value.trim()
  if (!keyword || !map) return
  mapStatus.value = '正在搜索...'
  const results = await searchPlaces(keyword)
  mapStatus.value = results.length ? `找到 ${results.length} 个地点` : '未找到匹配地点'
  if (results[0]) {
    searchQuery.value = keyword
    map.setCenter([results[0].location.lng, results[0].location.lat])
    map.setZoom(14)
  }
}

async function applyMapSearch() {
  searchQuery.value = mapSearch.value.trim()
  if (!searchQuery.value) {
    mapStatus.value = ''
    return
  }
  if (filtered.value.length) {
    renderMarkers()
    // filtered 变更会触发 watch → renderMarkers → fitMarkers 覆写 mapStatus，
    // 等这一轮 flush 结束后再写过滤提示，避免被同步覆盖。
    await nextTick()
    mapStatus.value = `已按「${searchQuery.value}」过滤，共 ${filtered.value.length} 个停车场`
  } else {
    await runAddressSearch()
  }
}

async function locateMe() {
  locating.value = true
  try {
    if (!map) return
    const AMap = await loadAMap()
    const geolocation = new AMap.Geolocation({ enableHighAccuracy: true, timeout: 10000 })
    map.addControl(geolocation)
    geolocation.getCurrentPosition((status: string, result: any) => {
      locating.value = false
      if (status === 'complete' && result.position) {
        map.setCenter([result.position.lng, result.position.lat])
        map.setZoom(15)
        mapStatus.value = '已定位到当前位置'
      } else {
        mapStatus.value = '定位失败，请手动搜索或选点'
      }
    })
  } catch {
    locating.value = false
    mapStatus.value = '定位功能不可用'
  }
}

async function geocodeFormAddress() {
  const addr = form.address.trim()
  if (!addr) {
    saveError.value = '请先填写地址'
    return
  }
  mapStatus.value = '正在解析地址...'
  const result = await geocodeAddress(addr)
  if (result) {
    setFormSelection(result.lng, result.lat)
    mapStatus.value = '地址解析成功，坐标已回填'
    if (map) {
      map.setCenter([result.lng, result.lat])
      map.setZoom(15)
    }
  } else {
    mapStatus.value = '地址解析失败，请手动在地图上选点'
  }
}

function resetFilters() {
  searchQuery.value = ''
  mapSearch.value = ''
  provinceCode.value = ''
  cityCode.value = ''
  districtCode.value = ''
  mallId.value = ''
  favoritesOnly.value = false
}

watch([provinceCode, cityCode], ([p, c]) => {
  if (c && p) return
  if (!p) cityCode.value = ''
  districtCode.value = ''
  if (!c) districtCode.value = ''
})

watch(filtered, () => renderMarkers(), { deep: false })

onMounted(init)
onBeforeUnmount(() => {
  revokePreviews()
  if (map) {
    map.clearMap()
    map.destroy()
    map = null
  }
})
</script>

<template>
  <div class="parking-page">
    <div class="page-head">
      <div>
        <h1>停车收费</h1>
        <p>常用停车场、收藏与地图选点的统一入口，数据按权限共享维护。</p>
      </div>
      <button class="btn btn-primary" @click="openCreate">
        <Plus :size="16" />添加停车场
      </button>
    </div>

    <div class="metrics">
      <div v-for="m in metrics" :key="m.label" class="metric">
        <div class="metric-label">{{ m.label }}</div>
        <div class="metric-value">{{ m.value }}</div>
        <div class="metric-note">
          <span v-if="m.dot" class="dot" />{{ m.note }}
        </div>
      </div>
    </div>

    <div class="toolbar">
      <div class="search-wrap">
        <Search :size="15" class="icon" />
        <input v-model="searchQuery" class="search-input" placeholder="搜索商场、地址或备注..." />
        <button v-if="searchQuery" class="clear-search" title="清空" @click="searchQuery = ''">
          <X :size="13" />
        </button>
      </div>
      <div class="toolbar-actions">
        <button class="fav-toggle" :class="{ on: favoritesOnly }" @click="favoritesOnly = !favoritesOnly">
          <Star :size="13" :fill="favoritesOnly ? 'currentColor' : 'none'" />只看收藏
        </button>
        <button class="btn" @click="resetFilters">
          <RefreshCw :size="14" />重置
        </button>
      </div>
    </div>

    <div class="filter-bar">
      <select v-model="provinceCode" class="select">
        <option value="">所有省份</option>
        <option v-for="p in provinces" :key="p.province_code" :value="p.province_code">{{ p.province_name }}</option>
      </select>
      <select v-model="cityCode" class="select">
        <option value="">所有城市</option>
        <option v-for="c in cities" :key="c.city_code" :value="c.city_code">{{ c.city_name }}</option>
      </select>
      <select v-model="districtCode" class="select">
        <option value="">所有行政区</option>
        <option v-for="d in districts" :key="d.district_code" :value="d.district_code">{{ d.district_name }}</option>
      </select>
      <select v-model="mallId" class="select">
        <option value="">所有商场</option>
        <option v-for="m in malls.malls.value" :key="m.id" :value="m.id">{{ m.name }}</option>
      </select>
      <span class="filter-count">共 {{ filteredTotal }} 个停车场</span>
    </div>

    <div v-if="parking.error.value" class="error-banner">
      加载失败：{{ parking.error.value }}
      <button class="btn btn-sm" @click="parking.refresh()">重试</button>
    </div>

    <div class="panel table-panel">
      <div class="panel-head">
        <h3>常用停车场</h3>
        <span class="chip chip-violet">{{ filteredTotal }}</span>
      </div>
      <div v-if="parking.loading.value && !parking.locations.value.length" class="empty-state">
        <Car :size="30" />
        <div class="empty-title">正在加载停车场...</div>
      </div>
      <div v-else-if="filtered.length === 0" class="empty-state">
        <Car :size="30" />
        <div class="empty-title">没有符合条件的停车场</div>
        <div v-if="filterActive" class="empty-sub">换个关键词或清除筛选后重试</div>
        <button v-if="filterActive" class="btn btn-sm" @click="resetFilters">清除筛选</button>
      </div>
      <div v-else class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>位置</th>
              <th>区域</th>
              <th>地址</th>
              <th>免费 / 计费</th>
              <th>日间</th>
              <th>夜间</th>
              <th class="right">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="loc in filtered"
              :key="loc.id"
              :class="{ active: selectedId === loc.id }"
              @click="selectCard(loc)"
            >
              <td>
                <div class="cell-location">
                  <div class="thumb">
                    <img v-if="imageUrl(loc.id)" :src="imageUrl(loc.id)" alt="" />
                    <Image v-else :size="17" class="thumb-icon" />
                  </div>
                  <div>
                    <div class="cell-title">{{ loc.name }}</div>
                    <div v-if="loc.mall" class="cell-mall">{{ loc.mall }}</div>
                  </div>
                </div>
              </td>
              <td>
                <div class="region-cell">{{ regionText(loc) }}</div>
                <div class="sub-cell">{{ loc.province || '' }}</div>
              </td>
              <td>
                <div class="address-cell">{{ loc.address || '—' }}</div>
              </td>
              <td>
                <span class="free-badge">{{ freeText(loc) }}</span>
                <div class="sub-cell">{{ intervalText(loc) }}</div>
              </td>
              <td>
                <div class="price-main">{{ priceText(loc.day_price, loc.day_unit) }}</div>
              </td>
              <td>
                <div class="price-main">{{ priceText(loc.night_price, loc.night_unit) }}</div>
              </td>
              <td class="right">
                <div class="row-actions">
                  <button class="icon-btn-sm" title="详情" @click.stop="openDetail(loc)">
                    <Eye :size="15" />
                  </button>
                  <button
                    v-if="parking.canAdmin.value"
                    class="icon-btn-sm"
                    title="编辑"
                    @click.stop="openEdit(loc)"
                  >
                    <Edit :size="15" />
                  </button>
                  <button
                    v-if="parking.canAdmin.value"
                    class="icon-btn-sm danger"
                    title="删除"
                    @click.stop="removeLocation(loc)"
                  >
                    <Trash2 :size="15" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="map-layout">
      <div class="list-panel">
        <div class="list-head">
          <h3>停车场地图</h3>
          <span class="chip chip-violet">{{ filteredTotal }}</span>
        </div>
        <div class="list-search">
          <Search :size="14" class="icon" />
          <input v-model="mapSearch" class="filter-input" placeholder="搜索商场、地址或备注..." @keyup.enter="applyMapSearch" />
          <button class="btn btn-sm" @click="applyMapSearch">应用</button>
        </div>
        <div class="list-filters">
          <select v-model="provinceCode" class="select">
            <option value="">所有省份</option>
            <option v-for="p in provinces" :key="p.province_code" :value="p.province_code">{{ p.province_name }}</option>
          </select>
          <select v-model="cityCode" class="select">
            <option value="">所有城市</option>
            <option v-for="c in cities" :key="c.city_code" :value="c.city_code">{{ c.city_name }}</option>
          </select>
          <select v-model="districtCode" class="select">
            <option value="">所有行政区</option>
            <option v-for="d in districts" :key="d.district_code" :value="d.district_code">{{ d.district_name }}</option>
          </select>
        </div>
        <div v-if="filtered.length === 0" class="empty-state compact">
          <Car :size="24" />
          <div class="empty-title">没有停车场</div>
        </div>
        <div v-else class="records">
          <button
            v-for="loc in filtered"
            :key="loc.id"
            class="record-card"
            :class="{ active: selectedId === loc.id }"
            @click="selectCard(loc)"
          >
            <div class="record-thumb">
              <img v-if="imageUrl(loc.id)" :src="imageUrl(loc.id)" alt="" />
              <Image v-else :size="18" class="thumb-icon" />
            </div>
            <div class="record-body">
              <div class="record-title">
                {{ loc.name }}
                <Star v-if="loc.is_favorited" :size="12" class="favorite-dot" :fill="'currentColor'" />
              </div>
              <div class="record-region">{{ regionText(loc) }} · {{ loc.mall || '独立停车场' }}</div>
              <div class="record-price">
                <span class="item"><span class="num">{{ loc.day_price ?? '—' }}</span><span class="unit">{{ loc.day_unit || '元/小时' }}</span><span class="label">日间</span></span>
                <span class="item"><span class="num">{{ loc.night_price ?? '—' }}</span><span class="unit">{{ loc.night_unit || '元/小时' }}</span><span class="label">夜间</span></span>
              </div>
              <span v-if="loc.free_duration" class="free-chip">免费 {{ loc.free_duration }} 分钟 · {{ intervalText(loc) }}</span>
            </div>
          </button>
        </div>
      </div>

      <div class="map-wrap">
        <div v-if="mapError" class="map-fallback">
          <MapPin :size="28" />
          <div>地图暂时不可用：{{ mapError }}</div>
          <span>请检查高德 JS Key 与域名白名单，其余列表功能不受影响。</span>
        </div>
        <div v-else ref="mapEl" class="map-canvas" />
        <div class="map-controls">
          <button class="btn" title="放大" @click="map?.setZoom(map?.getZoom() + 1)"><Plus :size="16" /></button>
          <button class="btn" title="缩小" @click="map?.setZoom(map?.getZoom() - 1)"><Minus :size="16" /></button>
          <button class="btn" title="定位" @click="locateMe"><Navigation :size="16" /></button>
          <button class="btn" title="查看全部" @click="fitMarkers"><LayoutList :size="16" /></button>
        </div>
        <div v-if="mapStatus" class="map-status">{{ mapStatus }}</div>
        <div class="map-legend">
          <span><span class="legend-dot violet" />停车场</span>
          <span><span class="legend-dot active" />选中</span>
          <button class="legend-search" @click="runAddressSearch">
            <Search :size="13" />地图搜索
          </button>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="drawer === 'detail' && selected" class="drawer-backdrop" @click.self="closeDrawer">
        <aside class="drawer detail">
          <header class="drawer-head">
            <div>
              <span class="drawer-kicker">停车场详情</span>
              <h2>{{ selected.name }}</h2>
            </div>
            <button class="icon-btn" title="关闭" @click="closeDrawer"><X :size="17" /></button>
          </header>

          <div class="drawer-scroll">
            <div v-if="actionError" class="error-banner">{{ actionError }}</div>
            <div v-if="imageList(selected.id).length" class="image-strip">
              <img
                v-for="(url, i) in imageList(selected.id)"
                :key="i"
                :src="url"
                :alt="`停车场图片 ${i + 1}`"
              />
            </div>

            <div class="meta-grid">
              <div>
                <span class="meta-label">区域</span>
                <span class="meta-value">{{ regionText(selected) }} · {{ selected.province }}</span>
              </div>
              <div>
                <span class="meta-label">商场</span>
                <span class="meta-value">{{ selected.mall || '独立停车场' }}</span>
              </div>
              <div>
                <span class="meta-label">地址</span>
                <span class="meta-value">{{ selected.address || '—' }}</span>
              </div>
              <div>
                <span class="meta-label">状态</span>
                <span class="meta-value"><span class="status-dot" :class="selected.status" />{{ selected.status === 'active' ? '使用中' : '已停用' }}</span>
              </div>
            </div>

            <div class="fee-block">
              <div class="fee-item">
                <span class="fee-label">日间收费</span>
                <strong>{{ priceText(selected.day_price, selected.day_unit) }}</strong>
              </div>
              <div class="fee-item">
                <span class="fee-label">夜间收费</span>
                <strong>{{ priceText(selected.night_price, selected.night_unit) }}</strong>
              </div>
              <div class="fee-item">
                <span class="fee-label">免费时长</span>
                <strong>{{ selected.free_duration ? `${selected.free_duration} 分钟` : '无免费' }}</strong>
              </div>
              <div class="fee-item">
                <span class="fee-label">重新计费</span>
                <strong>{{ selected.charge_interval ? `${selected.charge_interval} 分钟` : '—' }}</strong>
              </div>
            </div>

            <div v-if="selected.notes" class="notes-block">
              <div class="meta-label">备注</div>
              <p>{{ selected.notes }}</p>
            </div>

            <div class="detail-meta">
              <span>录入于 {{ new Date(selected.created_at).toLocaleString('zh-CN') }}</span>
              <span>最后更新 {{ new Date(selected.updated_at).toLocaleString('zh-CN') }}</span>
            </div>
          </div>

          <footer class="drawer-foot">
            <button class="btn favorite-btn" :class="{ on: selected.is_favorited }" @click="toggleFavorite(selected)">
              <Heart :size="15" :fill="selected.is_favorited ? 'currentColor' : 'none'" />
              {{ selected.is_favorited ? '已收藏' : '收藏停车场' }}
            </button>
            <div class="foot-spacer" />
            <template v-if="parking.canAdmin.value">
              <button class="btn" @click="openEdit(selected)"><Edit :size="15" />编辑</button>
              <button class="btn" @click="setStatus(selected, selected.status === 'active' ? 'inactive' : 'active')">
                {{ selected.status === 'active' ? '停用' : '启用' }}
              </button>
              <button class="btn danger" @click="removeLocation(selected)"><Trash2 :size="15" />删除</button>
            </template>
          </footer>
        </aside>
      </div>

      <div v-if="drawer === 'form'" class="drawer-backdrop" @click.self="closeDrawer">
        <aside class="drawer form">
          <header class="drawer-head">
            <div>
              <span class="drawer-kicker">{{ editingId ? '编辑停车场' : '添加停车场' }}</span>
              <h2>{{ editingId ? '更新停车场信息' : '录入一个新的停车场' }}</h2>
            </div>
            <button class="icon-btn" title="关闭" @click="closeDrawer"><X :size="17" /></button>
          </header>

          <div class="drawer-scroll">
            <div v-if="saveError" class="error-banner">{{ saveError }}</div>

            <div class="form-section">
              <div class="form-label"><span>基本信息</span></div>
              <input v-model="form.name" class="input" placeholder="停车场名称（必填）" />
              <div class="region-selects">
                <select v-model="form.province_code" class="select">
                  <option value="">省份</option>
                  <option v-for="p in provinceOptions" :key="p.province_code" :value="p.province_code">{{ p.province_name }}</option>
                </select>
                <select v-model="form.city_code" class="select">
                  <option value="">城市</option>
                  <option v-for="c in cityOptions" :key="c.city_code" :value="c.city_code">{{ c.city_name }}</option>
                </select>
                <select v-model="form.district_code" class="select">
                  <option value="">区县</option>
                  <option v-for="d in districtOptions" :key="d.district_code" :value="d.district_code">{{ d.district_name }}</option>
                </select>
              </div>

              <div class="mall-field">
                <select
                  v-if="!showCreateMall"
                  v-model="form.mall_id"
                  class="select"
                  @change="handleMallSelect"
                >
                  <option value="">关联商场（可选）</option>
                  <option v-for="m in malls.malls.value" :key="m.id" :value="m.id">{{ m.name }}</option>
                  <option disabled>──</option>
                  <option value="__new">+ 新增商场</option>
                </select>
                <div v-else class="new-mall-row">
                  <input v-model="newMallName" class="input" placeholder="输入商场名称" />
                  <button class="btn btn-sm btn-primary" :disabled="!newMallName.trim()" @click="confirmNewMall">
                    <Check :size="13" />使用
                  </button>
                  <button class="btn btn-sm" @click="cancelNewMall"><X :size="13" />取消</button>
                </div>
                <div v-if="!showCreateMall && form.mall_id === '__new'" class="new-mall-confirm">
                  <span>新商场：{{ newMallName || '未命名' }}</span>
                  <button class="btn btn-sm" @click="showCreateMall = true"><Pencil :size="12" />改名</button>
                </div>
              </div>

              <textarea v-model="form.address" class="textarea" rows="2" placeholder="详细地址（可地址解析）"></textarea>
              <button class="btn address-parse" :disabled="!form.address.trim()" @click="geocodeFormAddress">
                <LocateFixed :size="14" />解析地址到地图
              </button>
              <div class="map-pick">
                <div ref="formMapEl" class="form-map" />
                <div class="map-pick-tip">
                  <MapPin :size="14" />
                  <span>{{ form.location ? `已选坐标 ${form.location.lng.toFixed(5)}, ${form.location.lat.toFixed(5)}` : '点击地图选点' }}</span>
                  <span v-if="formRegionLabel !== '请选择省市县'" class="region-tag">{{ formRegionLabel }}</span>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-label"><span>收费规则</span></div>
              <div class="fee-form-grid">
                <div class="field">
                  <label>免费时长（分钟）</label>
                  <input v-model.number="form.free_duration" type="number" min="0" class="input" placeholder="0" />
                </div>
                <div class="field">
                  <label>重新计费（分钟）</label>
                  <input v-model.number="form.charge_interval" type="number" min="0" class="input" placeholder="30" />
                </div>
                <div class="field">
                  <label>日间价格</label>
                  <div class="price-input">
                    <input v-model.number="form.day_price" type="number" min="0" step="0.01" class="input" placeholder="8" />
                    <select v-model="form.day_unit" class="select unit-select">
                      <option v-for="u in priceUnits" :key="u" :value="u">{{ u }}</option>
                    </select>
                  </div>
                </div>
                <div class="field">
                  <label>夜间价格</label>
                  <div class="price-input">
                    <input v-model.number="form.night_price" type="number" min="0" step="0.01" class="input" placeholder="1" />
                    <select v-model="form.night_unit" class="select unit-select">
                      <option v-for="u in priceUnits" :key="u" :value="u">{{ u }}</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-section">
              <div class="form-label">
                <span>图片</span>
                <button class="btn btn-sm" @click="fileInput?.click()"><Plus :size="13" />选择图片</button>
              </div>
              <input ref="fileInput" type="file" multiple accept="image/png,image/jpeg,image/webp" class="hidden-input" @change="handleFileSelect" />
              <div v-if="existingImages.length || uploadPreviews.length" class="image-grid">
                <div v-for="path in existingImages" :key="path" class="image-cell">
                  <img :src="path.startsWith('http') ? path : existingImageUrl(path)" alt="" />
                  <button class="remove-img" title="移除" @click="removeExistingImage(path)"><X :size="13" /></button>
                </div>
                <div v-for="(url, i) in uploadPreviews" :key="url" class="image-cell">
                  <img :src="url" alt="" />
                  <button class="remove-img" title="移除" @click="removeNewPreview(i)"><X :size="13" /></button>
                </div>
              </div>
              <p v-else class="form-hint">支持 PNG、JPG、WebP，图片保存在受保护的私有存储。</p>
            </div>

            <div class="form-section">
              <div class="form-label"><span>备注</span></div>
              <textarea v-model="form.notes" class="textarea" rows="3" placeholder="停车位提示、闸口位置等"></textarea>
            </div>
          </div>

          <footer class="drawer-foot">
            <button class="btn" @click="closeDrawer">取消</button>
            <div class="foot-spacer" />
            <button class="btn btn-primary" :disabled="formBusy" @click="saveForm">
              <Zap :size="15" />{{ formBusy ? '保存中...' : '保存停车场' }}
            </button>
          </footer>
        </aside>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.parking-page { color: var(--ink, var(--text)); font-size: 13.5px; }
.page-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 16px; flex-wrap: wrap; }
.page-head h1 { font-size: 22px; font-weight: 700; letter-spacing: 0; margin: 0; color: var(--ink, var(--text)); }
.page-head p { margin: 5px 0 0; color: var(--ink-2, var(--text-secondary)); font-size: 13px; }
.metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 14px; }
.metric { background: var(--card, var(--surface)); border: 1px solid var(--line, var(--surface-border)); border-radius: 12px; padding: 13px 15px; min-width: 0; }
.metric-label { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--ink-3, var(--text-secondary)); }
.metric-value { font-size: 22px; font-weight: 700; letter-spacing: -.3px; margin-top: 2px; color: var(--ink, var(--text)); }
.metric-note { font-size: 11px; color: var(--ink-2, var(--text-secondary)); margin-top: 1px; }
.metric-note .dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: var(--violet, var(--accent)); margin-right: 4px; }
.toolbar { display: flex; align-items: center; gap: 9px; margin-bottom: 14px; flex-wrap: wrap; }
.search-wrap { position: relative; width: min(340px, 100%); flex: 1 1 230px; }
.search-wrap .icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--ink-3, var(--text-secondary)); }
.search-input { width: 100%; height: 38px; border: 1px solid var(--line, var(--surface-border)); border-radius: 10px; background: var(--card, var(--surface)); color: var(--ink, var(--text)); padding: 0 34px 0 36px; outline: none; transition: border .12s; }
.search-input:focus, .input:focus, .textarea:focus, .select:focus { border-color: var(--violet, var(--accent)); }
.search-input::placeholder { color: var(--ink-3, var(--text-secondary)); }
.clear-search { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); width: 24px; height: 24px; border: none; background: transparent; color: var(--ink-3, var(--text-secondary)); cursor: pointer; display: grid; place-items: center; border-radius: 7px; }
.clear-search:hover { background: var(--hover, var(--nav-hover)); color: var(--ink, var(--text)); }
.toolbar-actions { display: flex; gap: 8px; margin-left: auto; }
.fav-toggle { height: 38px; border-radius: 10px; border: 1px solid var(--line, var(--surface-border)); background: var(--card, var(--surface)); color: var(--ink-2, var(--text-secondary)); padding: 0 13px; font-size: 12.5px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: all .12s; white-space: nowrap; }
.fav-toggle.on { background: var(--violet-soft, var(--accent-soft)); border-color: var(--violet-line); color: var(--violet, var(--accent)); }
.btn { height: 38px; border-radius: 10px; border: 1px solid var(--line, var(--surface-border)); background: var(--card, var(--surface)); color: var(--ink-2, var(--text-secondary)); padding: 0 14px; font-size: 13px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; transition: background .12s, color .12s, border .12s; white-space: nowrap; }
.btn:hover { background: var(--hover, var(--nav-hover)); color: var(--ink, var(--text)); }
.btn-primary { background: var(--violet-solid, var(--accent)); border-color: var(--violet-solid, var(--accent)); color: #fff; font-weight: 600; }
.btn-primary:hover { background: #6343ff; color: #fff; }
.btn-sm { height: 30px; padding: 0 10px; font-size: 12px; border-radius: 8px; }
.btn.danger { color: #e5484d; }
.btn.danger:hover { border-color: rgba(229,72,77,.4); color: #e5484d; background: rgba(229,72,77,.08); }
.filter-bar { display: flex; gap: 8px; margin-bottom: 14px; flex-wrap: wrap; align-items: center; padding: 10px; background: var(--chip-neutral, var(--nav-hover)); border-radius: 12px; }
.select { height: 34px; border: 1px solid var(--line, var(--surface-border)); border-radius: 9px; background: var(--card, var(--surface)); color: var(--ink, var(--text)); padding: 0 10px; outline: none; min-width: 120px; font-size: 12.5px; }
.filter-count { margin-left: auto; color: var(--ink-3, var(--text-secondary)); font-size: 12px; }
.error-banner { margin-bottom: 12px; padding: 10px 12px; border: 1px solid rgba(229,72,77,.35); border-radius: 10px; background: rgba(229,72,77,.08); color: #e5484d; font-size: 12.5px; display: flex; align-items: center; gap: 10px; }
.panel { background: var(--card, var(--surface)); border: 1px solid var(--line, var(--surface-border)); border-radius: 12px; overflow: hidden; }
.table-panel { margin-bottom: 14px; }
.panel-head { padding: 13px 16px; border-bottom: 1px solid var(--line, var(--surface-border)); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.panel-head h3, .list-head h3 { margin: 0; font-size: 14px; font-weight: 650; color: var(--ink, var(--text)); }
.chip { display: inline-flex; align-items: center; gap: 5px; height: 22px; padding: 0 8px; border-radius: 99px; background: var(--chip-neutral, var(--nav-hover)); color: var(--ink-2, var(--text-secondary)); font-size: 11px; white-space: nowrap; }
.chip-violet { background: var(--violet-soft, var(--accent-soft)); color: var(--violet, var(--accent)); }
.table-scroll { overflow-x: auto; }
.data-table { width: 100%; min-width: 840px; border-collapse: collapse; }
.data-table th { text-align: left; padding: 10px 14px; color: var(--ink-3, var(--text-secondary)); font-weight: 600; font-size: 10.5px; text-transform: uppercase; letter-spacing: .3px; border-bottom: 1px solid var(--line, var(--surface-border)); background: var(--card, var(--surface)); }
.data-table th.right, .data-table td.right { text-align: right; }
.data-table td { padding: 11px 14px; border-bottom: 1px solid var(--line, var(--surface-border)); vertical-align: top; color: var(--ink, var(--text)); }
.data-table tr { cursor: pointer; transition: background .12s; }
.data-table tr:hover { background: var(--hover, var(--nav-hover)); }
.data-table tr.active { background: var(--violet-soft, var(--accent-soft)); }
.cell-location { display: flex; align-items: center; gap: 11px; min-width: 190px; }
.thumb { width: 42px; height: 42px; border-radius: 9px; flex-shrink: 0; background: linear-gradient(135deg, var(--chip-neutral, #f0f0f6), var(--line, #e4e6ef)); display: grid; place-items: center; overflow: hidden; position: relative; }
.thumb img { width: 100%; height: 100%; object-fit: cover; }
.thumb-icon { color: var(--ink-3, var(--text-secondary)); }
.cell-title { font-weight: 600; font-size: 13px; }
.cell-mall { margin-top: 2px; font-size: 11.5px; color: var(--ink-3, var(--text-secondary)); }
.region-cell, .price-main { font-size: 13px; font-weight: 600; }
.sub-cell { margin-top: 3px; font-size: 11px; color: var(--ink-3, var(--text-secondary)); }
.address-cell { max-width: 220px; line-clamp: 2; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; color: var(--ink-2, var(--text-secondary)); font-size: 12px; }
.free-badge { display: inline-flex; align-items: center; height: 20px; padding: 0 7px; border-radius: 6px; background: var(--chip-neutral, var(--nav-hover)); border: 1px solid var(--line, var(--surface-border)); color: var(--ink-2, var(--text-secondary)); font-size: 11px; font-weight: 600; }
.row-actions { display: flex; gap: 4px; justify-content: flex-end; opacity: 0; transition: opacity .12s; }
.data-table tr:hover .row-actions { opacity: 1; }
.icon-btn-sm { width: 28px; height: 28px; border-radius: 7px; border: none; background: transparent; color: var(--ink-3, var(--text-secondary)); display: grid; place-items: center; cursor: pointer; }
.icon-btn-sm:hover { background: var(--hover, var(--nav-hover)); color: var(--ink, var(--text)); }
.icon-btn-sm.danger:hover { color: #e5484d; background: rgba(229,72,77,.08); }
.empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 54px 20px; color: var(--ink-3, var(--text-secondary)); text-align: center; }
.empty-state.compact { padding: 36px 16px; }
.empty-title { font-size: 13px; color: var(--ink-2, var(--text-secondary)); }
.empty-sub { font-size: 12px; color: var(--ink-3, var(--text-secondary)); }
.map-layout { display: grid; grid-template-columns: minmax(280px, 380px) 1fr; gap: 14px; align-items: start; }
.list-panel { height: 640px; overflow-y: auto; background: var(--card, var(--surface)); border: 1px solid var(--line, var(--surface-border)); border-radius: 12px; }
.list-head { padding: 13px 16px; border-bottom: 1px solid var(--line, var(--surface-border)); display: flex; align-items: center; justify-content: space-between; gap: 10px; position: sticky; top: 0; background: var(--card, var(--surface)); z-index: 2; }
.list-search { display: flex; align-items: center; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--line, var(--surface-border)); position: relative; }
.list-search .icon { position: absolute; left: 22px; top: 50%; transform: translateY(-50%); color: var(--ink-3, var(--text-secondary)); pointer-events: none; }
.list-search input { width: 100%; height: 32px; border: 1px solid var(--line, var(--surface-border)); border-radius: 8px; background: var(--card, var(--surface)); padding: 0 8px 0 30px; outline: none; font-size: 12.5px; color: var(--ink, var(--text)); }
.list-filters { display: flex; gap: 6px; padding: 10px 12px 12px; flex-wrap: wrap; }
.list-filters .select { height: 30px; min-width: 0; flex: 1; font-size: 12px; border-radius: 8px; padding: 0 7px; }
.records { display: flex; flex-direction: column; }
.record-card { display: flex; gap: 12px; padding: 13px 16px; border-bottom: 1px solid var(--line, var(--surface-border)); cursor: pointer; transition: background .12s; min-width: 0; background: none; border-left: none; border-right: none; border-top: none; width: 100%; text-align: left; font-family: inherit; }
.record-card:last-child { border-bottom: none; }
.record-card:hover { background: var(--hover, var(--nav-hover)); }
.record-card.active { background: var(--violet-soft, var(--accent-soft)); box-shadow: inset 3px 0 0 var(--violet, var(--accent)); }
.record-thumb { width: 46px; height: 46px; border-radius: 10px; background: linear-gradient(135deg, var(--chip-neutral, #f0f0f6), var(--line, #e4e6ef)); position: relative; flex-shrink: 0; overflow: hidden; display: grid; place-items: center; }
.record-thumb img { width: 100%; height: 100%; object-fit: cover; }
.record-body { min-width: 0; flex: 1; }
.record-title { display: flex; align-items: center; gap: 5px; font-size: 13px; font-weight: 600; color: var(--ink, var(--text)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.favorite-dot { color: var(--violet, var(--accent)); flex-shrink: 0; }
.record-region { margin-top: 3px; font-size: 11.5px; color: var(--ink-3, var(--text-secondary)); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-price { margin-top: 7px; display: flex; gap: 14px; align-items: center; flex-wrap: wrap; }
.record-price .item { display: flex; align-items: baseline; gap: 4px; }
.record-price .num { font-size: 14px; font-weight: 700; letter-spacing: -.2px; }
.record-price .unit, .record-price .label { font-size: 10.5px; color: var(--ink-3, var(--text-secondary)); }
.free-chip { height: 20px; padding: 0 7px; border-radius: 6px; background: var(--chip-neutral, var(--nav-hover)); border: 1px solid var(--line, var(--surface-border)); color: var(--ink-2, var(--text-secondary)); font-size: 10.5px; font-weight: 600; display: inline-flex; align-items: center; margin-top: 8px; white-space: nowrap; }
.map-wrap { position: relative; border-radius: 12px; overflow: hidden; min-height: 640px; border: 1px solid var(--line, var(--surface-border)); }
.map-canvas, .form-map { width: 100%; height: 100%; background: #eef0f3; }
.map-canvas { min-height: 640px; }
.form-map { min-height: 260px; border-radius: 10px; border: 1px solid var(--line, var(--surface-border)); }
.map-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; min-height: 640px; color: var(--ink-3, var(--text-secondary)); background: var(--chip-neutral, var(--nav-hover)); padding: 30px; text-align: center; }
.map-fallback span { font-size: 12px; max-width: 380px; }
.map-controls { position: absolute; right: 14px; top: 14px; z-index: 5; display: flex; flex-direction: column; gap: 8px; }
.map-controls .btn { width: 34px; height: 34px; padding: 0; justify-content: center; background: var(--card, #fff); box-shadow: 0 2px 8px rgba(0,0,0,.12); }
.map-status { position: absolute; left: 14px; top: 14px; z-index: 5; background: var(--card, #fff); border: 1px solid var(--line, var(--surface-border)); border-radius: 8px; padding: 6px 10px; font-size: 11px; color: var(--ink-2, var(--text-secondary)); box-shadow: 0 2px 8px rgba(0,0,0,.08); max-width: 60%; }
.map-legend { position: absolute; left: 14px; bottom: 14px; z-index: 5; background: var(--card, #fff); border: 1px solid var(--line, var(--surface-border)); border-radius: 10px; padding: 8px 11px; font-size: 11px; color: var(--ink-2, var(--text-secondary)); display: flex; gap: 12px; align-items: center; box-shadow: 0 2px 10px rgba(0,0,0,.08); flex-wrap: wrap; }
.legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; vertical-align: middle; }
.legend-dot.violet { background: var(--violet, var(--accent)); }
.legend-dot.active { background: #ff6b81; box-shadow: 0 0 0 4px rgba(255,107,129,.18); }
.legend-search { border: none; background: var(--chip-neutral, var(--nav-hover)); color: var(--ink-2, var(--text-secondary)); height: 26px; border-radius: 7px; padding: 0 8px; font-size: 11px; display: inline-flex; align-items: center; gap: 4px; cursor: pointer; }

.drawer-backdrop { position: fixed; inset: 0; z-index: 80; background: rgba(0,0,0,.5); backdrop-filter: blur(2px); }
.drawer { position: absolute; right: 0; top: 0; bottom: 0; width: min(480px, 94vw); background: var(--card, var(--surface)); color: var(--ink, var(--text)); display: flex; flex-direction: column; box-shadow: -12px 0 40px rgba(0,0,0,.18); animation: slide-in .18s ease; }
.drawer.form { width: min(560px, 96vw); }
@keyframes slide-in { from { transform: translateX(24px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
.drawer-head { padding: 18px 20px; border-bottom: 1px solid var(--line, var(--surface-border)); display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.drawer-head h2 { margin: 4px 0 0; font-size: 17px; font-weight: 700; letter-spacing: 0; }
.drawer-kicker { font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .4px; color: var(--violet, var(--accent)); }
.icon-btn { width: 32px; height: 32px; display: grid; place-items: center; border: 1px solid var(--line, var(--surface-border)); background: var(--card, var(--surface)); border-radius: 9px; color: var(--ink-2, var(--text-secondary)); cursor: pointer; padding: 0; }
.icon-btn:hover { background: var(--hover, var(--nav-hover)); color: var(--ink, var(--text)); }
.drawer-scroll { flex: 1; overflow-y: auto; padding: 18px 20px; }
.image-strip { display: flex; gap: 10px; overflow-x: auto; padding-bottom: 6px; margin-bottom: 16px; }
.image-strip img { width: 150px; height: 100px; border-radius: 10px; object-fit: cover; border: 1px solid var(--line, var(--surface-border)); flex-shrink: 0; }
.meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; margin-bottom: 16px; }
.meta-grid > div { background: var(--chip-neutral, var(--nav-hover)); border: 1px solid var(--line, var(--surface-border)); border-radius: 10px; padding: 10px 12px; min-width: 0; }
.meta-label { display: block; font-size: 10.5px; font-weight: 600; text-transform: uppercase; letter-spacing: .3px; color: var(--ink-3, var(--text-secondary)); }
.meta-value { display: block; margin-top: 5px; font-size: 12.5px; font-weight: 550; color: var(--ink, var(--text)); }
.status-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
.status-dot.active { background: #2ecc71; }
.status-dot.inactive { background: #e5484d; }
.fee-block { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 16px; }
.fee-item { border: 1px solid var(--line, var(--surface-border)); border-radius: 10px; padding: 11px 13px; }
.fee-label { display: block; font-size: 11px; color: var(--ink-3, var(--text-secondary)); }
.fee-item strong { display: block; margin-top: 5px; font-size: 15px; font-weight: 700; color: var(--ink, var(--text)); }
.notes-block { border-left: 3px solid var(--violet-line, var(--accent-soft)); background: var(--chip-neutral, var(--nav-hover)); border-radius: 0 10px 10px 0; padding: 12px 14px; margin-bottom: 16px; }
.notes-block p { margin: 7px 0 0; font-size: 12.5px; color: var(--ink-2, var(--text-secondary)); white-space: pre-wrap; }
.detail-meta { display: flex; flex-direction: column; gap: 4px; font-size: 11px; color: var(--ink-3, var(--text-secondary)); }
.drawer-foot { padding: 14px 20px; border-top: 1px solid var(--line, var(--surface-border)); display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.favorite-btn { border-color: var(--violet-line, var(--violet-soft)); color: var(--violet, var(--accent)); }
.favorite-btn.on { background: var(--violet-soft, var(--accent-soft)); }
.foot-spacer { flex: 1; }
.form-section { margin-bottom: 18px; }
.form-section:last-child { margin-bottom: 0; }
.form-label { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 9px; }
.form-label > span { font-size: 11px; font-weight: 650; text-transform: uppercase; letter-spacing: .3px; color: var(--ink-3, var(--text-secondary)); }
.input, .textarea { width: 100%; border: 1px solid var(--line, var(--surface-border)); border-radius: 9px; background: var(--bg, var(--surface)); color: var(--ink, var(--text)); padding: 9px 11px; outline: none; font-size: 13px; box-sizing: border-box; }
.input { margin-bottom: 10px; }
.textarea { resize: vertical; margin-bottom: 10px; }
.region-selects { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; }
.region-selects .select { width: 100%; min-width: 0; }
.mall-field { margin-bottom: 10px; }
.mall-field .select { width: 100%; }
.new-mall-row { display: flex; gap: 8px; align-items: center; }
.new-mall-row .input { margin: 0; flex: 1; }
.confirm-mall { margin-top: 8px; background: var(--violet-soft, var(--accent-soft)); border-color: var(--violet-line); color: var(--violet, var(--accent)); }
.address-parse { margin-bottom: 10px; background: var(--violet-soft, var(--accent-soft)); border-color: var(--violet-line, var(--accent-soft)); color: var(--violet, var(--accent)); }
.map-pick { position: relative; }
.map-pick-tip { display: flex; align-items: center; gap: 7px; margin-top: 8px; font-size: 12px; color: var(--ink-2, var(--text-secondary)); flex-wrap: wrap; }
.region-tag { margin-left: auto; padding: 3px 8px; border-radius: 99px; background: var(--chip-neutral, var(--nav-hover)); color: var(--ink-2, var(--text-secondary)); }
.fee-form-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.field label { display: block; margin-bottom: 6px; font-size: 11.5px; color: var(--ink-2, var(--text-secondary)); }
.price-input { display: flex; gap: 6px; }
.price-input .input { margin: 0; min-width: 0; }
.unit-select { width: 92px; min-width: 92px; flex-shrink: 0; }
.hidden-input { display: none; }
.image-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; }
.image-cell { position: relative; aspect-ratio: 1.35; border-radius: 9px; overflow: hidden; border: 1px solid var(--line, var(--surface-border)); background: var(--chip-neutral, var(--nav-hover)); }
.image-cell img { width: 100%; height: 100%; object-fit: cover; }
.remove-img { position: absolute; right: 6px; top: 6px; width: 24px; height: 24px; border: none; border-radius: 7px; background: rgba(0,0,0,.62); color: #fff; display: grid; place-items: center; cursor: pointer; }
.form-hint { margin: 0; font-size: 11.5px; color: var(--ink-3, var(--text-secondary)); }

@media (max-width: 1100px) {
  .metrics { grid-template-columns: repeat(2, 1fr); }
  .map-layout { grid-template-columns: 1fr; }
  .map-wrap, .map-canvas { min-height: 520px; }
  .list-panel { height: 520px; }
}
@media (max-width: 720px) {
  .metrics { grid-template-columns: repeat(2, 1fr); gap: 9px; }
  .filter-bar .select { flex: 1 1 calc(50% - 4px); min-width: 0; }
  .filter-count { display: none; }
  .region-selects { grid-template-columns: 1fr; }
  .fee-form-grid { grid-template-columns: 1fr; }
  .meta-grid, .fee-block { grid-template-columns: 1fr; }
  .drawer-foot .favorite-btn { width: 100%; }
}
</style>

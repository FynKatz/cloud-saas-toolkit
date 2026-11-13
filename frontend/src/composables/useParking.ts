import { computed, readonly, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'
import { useToolsStore } from '../stores/tools'
import type {
  CreateParkingPayload,
  ParkingLocation,
} from '../types/parking'

/** 共享停车场数据层：查询走 RLS，写操作按权限走 RPC / admin 直连。 */
export function useParking() {
  const auth = useAuthStore()
  const toolsStore = useToolsStore()
  const locations = ref<ParkingLocation[]>([])
  const favoriteIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const error = ref('')
  const loadingImages = ref(false)
  /** locationId -> 签名 URL 列表；只用于展示，images 字段始终保留对象路径。 */
  const imageUrls = ref<Record<string, string[]>>({})

  const canView = computed(() => auth.isAdmin || toolsStore.hasTool('parking'))
  /**
   * 写权限必须与 RLS 同源：parking 的 with check 是 has_tool_permission('parking','edit')，
   * 而该函数 = is_admin() 或 角色显式授予 edit。
   * 之前只看 auth.isAdmin，导致「家庭成员」「测试员」两个持有 parking/edit 的角色
   * 在界面上看不到任何写入口（数据库其实允许他们写），属功能不可达。
   * 与 MovieView / TodoView 统一走 toolsStore.canEdit。
   */
  const canAdmin = computed(() => auth.isAdmin || toolsStore.canEdit('parking'))

  function priceNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    return Number.isFinite(num) ? num : null
  }

  function mapRow(row: ParkingLocation): ParkingLocation {
    return {
      ...row,
      free_duration: priceNumber(row.free_duration),
      charge_interval: priceNumber(row.charge_interval),
      day_price: priceNumber(row.day_price),
      night_price: priceNumber(row.night_price),
      location:
        row.location && typeof row.location === 'object'
          ? row.location
          : null,
    }
  }

  async function loadFavorites(): Promise<void> {
    if (!auth.user || auth.user.id === 'dev') {
      favoriteIds.value = new Set()
      return
    }
    const { data, error: err } = await supabase
      .from('user_parking_favorites')
      .select('parking_location_id')
      .eq('user_id', auth.user.id)
    if (err) {
      error.value = err.message
      return
    }
    favoriteIds.value = new Set(
      (data as { parking_location_id: string }[]).map((r) => r.parking_location_id),
    )
  }

  async function loadLocations(): Promise<void> {
    if (!canView.value) return
    loading.value = true
    error.value = ''
    try {
      const locResult = await supabase
        .from('parking_locations')
        .select('*')
        .order('created_at', { ascending: false })
      if (locResult.error) {
        error.value = locResult.error.message
        return
      }
      await loadFavorites()
      locations.value = ((locResult.data ?? []) as ParkingLocation[]).map((row) => {
        const m = mapRow(row)
        m.is_favorited = favoriteIds.value.has(m.id)
        return m
      })
    } finally {
      loading.value = false
    }
  }

  /** 私有 bucket 图片：按对象路径生成短期签名 URL（展示用）。 */
  async function signedImageUrl(path: string): Promise<string | null> {
    if (!path) return null
    const { data, error: err } = await supabase.storage
      .from('parking-images')
      .createSignedUrl(path, 3600)
    return err ? null : data.signedUrl
  }

  async function resolveImages(items: ParkingLocation[]): Promise<Record<string, string[]>> {
    const paths = new Set<string>()
    for (const item of items) for (const img of item.images ?? []) if (!img.startsWith('http')) paths.add(img)
    if (paths.size === 0) return {}
    loadingImages.value = true
    try {
      const entries = await Promise.all(
        [...paths].map(async (path) => [path, await signedImageUrl(path)] as const),
      )
      const map = new Map(entries)
      const result: Record<string, string[]> = {}
      for (const row of items) {
        result[row.id] = (row.images ?? []).map((img) =>
          img.startsWith('http') ? img : map.get(img) ?? '',
        )
      }
      return result
    } finally {
      loadingImages.value = false
    }
  }

  async function loadLocationsWithImages(): Promise<void> {
    await loadLocations()
    imageUrls.value = await resolveImages([...locations.value])
  }

  async function uploadParkingImages(
    files: File[],
    existing?: readonly string[] | null,
  ): Promise<{ urls: string[]; error?: string }> {
    const stored: string[] = [...(existing ?? [])].filter((u) => u.startsWith('http') || !u.includes('..'))
    if (files.length === 0) return { urls: stored }
    loadingImages.value = true
    try {
      for (const file of files) {
        const ext = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg'
        const path = `parking/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const { error: err } = await supabase.storage
          .from('parking-images')
          .upload(path, file, { cacheControl: '3600', upsert: false })
        if (err) return { urls: [], error: err.message }
        stored.push(path)
      }
      return { urls: stored }
    } finally {
      loadingImages.value = false
    }
  }

  async function createLocation(
    payload: CreateParkingPayload,
  ): Promise<{ error?: string }> {
    const normalized = {
      ...payload,
      name: payload.name?.trim() || '',
      province: payload.province?.trim() || null,
      province_code: payload.province_code?.trim() || null,
      city: payload.city?.trim() || null,
      city_code: payload.city_code?.trim() || null,
      district: payload.district?.trim() || null,
      district_code: payload.district_code?.trim() || null,
      mall: payload.mall?.trim() || null,
      address: payload.address?.trim() || null,
      notes: payload.notes?.trim() || null,
      free_duration: priceNumber(payload.free_duration),
      charge_interval: priceNumber(payload.charge_interval),
      day_price: priceNumber(payload.day_price),
      night_price: priceNumber(payload.night_price),
      day_unit: payload.day_unit?.trim() || null,
      night_unit: payload.night_unit?.trim() || null,
      location: payload.location && Object.keys(payload.location).length
        ? payload.location
        : null,
    }
    const { data, error: err } = await supabase.rpc('create_parking_location', {
      payload: normalized,
    })
    if (err) return { error: err.message }
    if (data) {
      const row = mapRow(data as ParkingLocation)
      locations.value.unshift(row)
      imageUrls.value[row.id] = []
    }
    return {}
  }

  async function createLocationWithImages(
    payload: CreateParkingPayload,
    files: File[],
  ): Promise<{ error?: string }> {
    const uploaded = await uploadParkingImages(files, payload.images ?? null)
    if (uploaded.error) return { error: uploaded.error }
    return createLocation({ ...payload, images: uploaded.urls })
  }

  async function refresh(): Promise<void> {
    await loadLocationsWithImages()
  }

  async function toggleFavorite(
    locationId: string,
    favorite: boolean,
  ): Promise<{ error?: string }> {
    const { error: err } = await supabase.rpc('toggle_parking_favorite', {
      p_location_id: locationId,
      p_favorite: favorite,
    })
    if (err) return { error: err.message }
    if (favorite) favoriteIds.value.add(locationId)
    else favoriteIds.value.delete(locationId)
    const item = locations.value.find((l) => l.id === locationId)
    if (item) item.is_favorited = favorite
    return {}
  }

  async function updateLocation(
    id: string,
    patch: Partial<CreateParkingPayload>,
  ): Promise<{ error?: string }> {
    if (!canAdmin.value) return { error: 'PERMISSION_DENIED' }
    const normalized: Record<string, unknown> = {
      name: patch.name?.trim() || null,
      province_code: patch.province_code?.trim() || null,
      province: patch.province?.trim() || null,
      city_code: patch.city_code?.trim() || null,
      city: patch.city?.trim() || null,
      district_code: patch.district_code?.trim() || null,
      district: patch.district?.trim() || null,
      mall_id: patch.mall_id ?? null,
      mall: patch.mall?.trim() || null,
      address: patch.address?.trim() || null,
      location: patch.location ?? null,
      images: patch.images ?? null,
      free_duration: priceNumber(patch.free_duration),
      charge_interval: priceNumber(patch.charge_interval),
      day_price: priceNumber(patch.day_price),
      night_price: priceNumber(patch.night_price),
      day_unit: patch.day_unit || null,
      night_unit: patch.night_unit || null,
      notes: patch.notes?.trim() || null,
    }
    const { error: err } = await supabase
      .from('parking_locations')
      .update(normalized)
      .eq('id', id)
    if (err) return { error: err.message }
    await loadLocationsWithImages()
    return {}
  }

  async function setStatus(
    id: string,
    status: 'active' | 'inactive',
  ): Promise<{ error?: string }> {
    if (!canAdmin.value) return { error: 'PERMISSION_DENIED' }
    const { error: err } = await supabase
      .from('parking_locations')
      .update({ status })
      .eq('id', id)
    if (err) return { error: err.message }
    await loadLocationsWithImages()
    return {}
  }

  async function deleteLocation(id: string): Promise<{ error?: string }> {
    if (!canAdmin.value) return { error: 'PERMISSION_DENIED' }
    const { error: err } = await supabase
      .from('parking_locations')
      .delete()
      .eq('id', id)
    if (err) return { error: err.message }
    favoriteIds.value.delete(id)
    locations.value = locations.value.filter((l) => l.id !== id)
    delete imageUrls.value[id]
    return {}
  }

  async function isFavorited(id: string): Promise<boolean> {
    if (favoriteIds.value.size === 0 && locations.value.some((l) => l.id === id)) {
      await loadFavorites()
    }
    return favoriteIds.value.has(id)
  }

  return {
    locations: readonly(locations),
    favoriteIds: readonly(favoriteIds),
    loading,
    error,
    canView,
    canAdmin,
    loadLocations,
    loadLocationsWithImages,
    loadFavorites,
    imageUrls,
    createLocation,
    createLocationWithImages,
    uploadParkingImages,
    signedImageUrl,
    resolveImages,
    toggleFavorite,
    updateLocation,
    setStatus,
    deleteLocation,
    isFavorited,
    refresh,
    loadingImages,
  }
}

import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { RegionRow } from '../types/parking'

/** 全国省市行政区字典：按需查询，前端只读；admin 数据管理页另行维护 active。 */
export function useRegions() {
  const loading = ref(false)
  const error = ref('')
  const regions = ref<RegionRow[]>([])

  /** PostgREST 默认单次最多返回 1000 行；全国数据约 2850 行，按页码取全量。 */
  async function fetchAll(
    builder: (rangeFrom: number, rangeTo: number) => PromiseLike<{ data: unknown; error: unknown }>,
    activeOnly = true,
  ): Promise<{ rows: RegionRow[]; error?: string }> {
    const PAGE = 1000
    let from = 0
    const rows: RegionRow[] = []
    let lastError = ''
    for (let guard = 0; guard < 20; guard += 1) {
      const { data, error } = await builder(from, from + PAGE - 1)
      if (error) {
        lastError = typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : String(error)
        break
      }
      const batch = (data as RegionRow[]) ?? []
      rows.push(...batch)
      if (batch.length < PAGE) break
      from += PAGE
    }
    if (lastError) return { rows: [], error: lastError }
    if (activeOnly) return { rows: rows.filter((r) => r.active) }
    return { rows }
  }

  const provinces = computed(() => {
    const map = new Map<string, RegionRow>()
    for (const r of regions.value) {
      const key = r.province_code
      if (!map.has(key)) map.set(key, r)
    }
    return [...map.values()]
  })

  const cities = computed(() => {
    const map = new Map<string, RegionRow>()
    for (const r of regions.value) {
      const key = r.city_code
      if (!map.has(key)) map.set(key, r)
    }
    return [...map.values()]
  })

  const districts = computed(() => regions.value)

  async function load(): Promise<void> {
    if (loading.value || regions.value.length > 0) return
    loading.value = true
    error.value = ''
    const result = await fetchAll((from, to) =>
      supabase
        .from('regions')
        .select('*')
        .eq('active', true)
        .order('province_code')
        .order('city_code')
        .order('district_code')
        .range(from, to),
      false,
    )
    loading.value = false
    if (result.error) {
      error.value = result.error
      return
    }
    regions.value = result.rows
  }

  function loadAdminAll(): void {
    // admin 管理页需要含 inactive；由调用方直接用 supabase 查询，避免
    // 这里把普通用户可见性假设带进数据字典。
    regions.value = []
  }

  return {
    loading,
    error,
    regions: computed(() => regions.value),
    provinces,
    cities,
    districts,
    load,
    loadAdminAll,
  }
}

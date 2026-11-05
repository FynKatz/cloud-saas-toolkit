import { computed, ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { ParkingMall } from '../types/parking'

/** 商场字典：下拉只读 active；admin 数据管理页负责维护。 */
export function useMalls() {
  const loading = ref(false)
  const error = ref('')
  const malls = ref<ParkingMall[]>([])

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    const { data, error: err } = await supabase
      .from('parking_malls')
      .select('*')
      .eq('status', 'active')
      .order('name')
    loading.value = false
    if (err) {
      error.value = err.message
      return
    }
    malls.value = (data ?? []) as ParkingMall[]
  }

  const activeMalls = computed(() => malls.value)

  return {
    loading,
    error,
    malls: activeMalls,
    load,
  }
}

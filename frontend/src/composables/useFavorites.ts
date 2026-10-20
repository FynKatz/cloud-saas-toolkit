import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface FavoriteRecord {
  user_id: string
  tool_id: string
  created_at: string
}

export function useFavorites(userId: Ref<string | undefined>) {
  const favoriteIds = ref<Set<string>>(new Set())
  const loading = ref(false)
  const loaded = ref(false)

  async function load(): Promise<void> {
    if (!userId.value) return
    loading.value = true
    const { data, error } = await supabase
      .from('user_favorites')
      .select('tool_id')
      .eq('user_id', userId.value)
    loading.value = false
    loaded.value = true
    if (!error && data) {
      favoriteIds.value = new Set((data as { tool_id: string }[]).map((row) => row.tool_id))
    }
  }

  async function toggle(toolId: string): Promise<void> {
    if (!userId.value) return
    if (favoriteIds.value.has(toolId)) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', userId.value)
        .eq('tool_id', toolId)
      favoriteIds.value.delete(toolId)
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: userId.value, tool_id: toolId })
      if (!error) favoriteIds.value.add(toolId)
    }
  }

  function isFavorited(toolId: string): boolean {
    return favoriteIds.value.has(toolId)
  }

  watch(userId, () => {
    favoriteIds.value = new Set()
    loaded.value = false
    load()
  })

  return { favoriteIds, loading, loaded, load, toggle, isFavorited }
}

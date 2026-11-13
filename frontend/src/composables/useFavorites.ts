import { ref, watch } from 'vue'
import type { Ref } from 'vue'
import { supabase } from '../lib/supabase'

export interface FavoriteRecord {
  user_id: string
  tool_id: string
  created_at: string
}

/**
 * 状态是模块级单例，和 useRecent 同一套约定。
 *
 * 之前每个调用方各建一份：DashboardView 的星标写的是它自己那份，
 * AppShellV2 的 L2 收藏分组读的是另一份，于是收藏永远同步不到侧栏。
 * 现在两边共用同一集合，写入一次、两处同时更新。
 */
const favoriteIds = ref<Set<string>>(new Set())
const loading = ref(false)
const loaded = ref(false)
// 收藏读取与用户点击（写入）会并发。两组计数器分工：
//   loadVersion   —— 只仲裁「读 vs 读」，旧快照不得覆盖新快照；
//   pendingWrites —— 读发生在写入落库期间时（结果可能早于写入），直接丢弃，
//                    由写入收尾后的对账 load() 用已提交的数据兜底。
// 这样写入的乐观更新永远不会被一次无关的并发读取吞掉。
let loadVersion = 0
let pendingWrites = 0

export function useFavorites(userId: Ref<string | undefined>) {

  async function load(): Promise<void> {
    const uid = userId.value
    const version = ++loadVersion
    loading.value = true
    if (!uid) {
      // 状态改成模块级单例后，登出必须显式清空，
      // 否则上一个账号的收藏会留给下一个登录的用户。
      favoriteIds.value = new Set()
      loading.value = false
      loaded.value = true
      return
    }
    const { data, error } = await supabase
      .from('user_favorites')
      .select('tool_id')
      .eq('user_id', uid)
    if (version !== loadVersion || uid !== userId.value || pendingWrites > 0) return
    loading.value = false
    loaded.value = true
    if (!error && data) {
      favoriteIds.value = new Set((data as { tool_id: string }[]).map((row) => row.tool_id))
    }
  }

  async function toggle(toolId: string): Promise<void> {
    const uid = userId.value
    if (!uid) return
    pendingWrites += 1
    loading.value = true
    const currentlyFavorited = favoriteIds.value.has(toolId)
    try {
      if (currentlyFavorited) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', uid)
          .eq('tool_id', toolId)
        if (!error) favoriteIds.value.delete(toolId)
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: uid, tool_id: toolId })
        if (!error) favoriteIds.value.add(toolId)
      }
      loaded.value = true
    } finally {
      pendingWrites -= 1
      if (pendingWrites === 0) {
        loading.value = false
        // 写入落库后拉一次真实状态对账，避免与并发读取打架。
        void load()
      }
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

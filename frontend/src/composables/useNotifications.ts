import { inject, ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuthStore } from '../stores/auth'

export interface NotificationBannerRow {
  id: string
  title: string
  content: string
  type: string
  priority: string
  target_route: string | null
  published_at: string
  status: string
  expires_at: string | null
}

export interface NotificationItem extends NotificationBannerRow {
  read_at: string | null
  dismissed_at: string | null
}

export const NOTIFICATION_KEY = Symbol('notifications')

/* 模块级状态，所有 useNotifications 调用共享 */
const loading = ref(false)
const listLoading = ref(false)
const error = ref('')
const currentBanner = ref<NotificationBannerRow | null>(null)
const unreadCount = ref(0)
const notificationList = ref<NotificationItem[]>([])
const bannerDismissing = ref(false)

export function useNotifications() {
  const auth = useAuthStore()

  async function loadBanner() {
    if (!auth.isAuthenticated || auth.user?.id === 'dev') return
    loading.value = true
    error.value = ''
    currentBanner.value = null
    unreadCount.value = 0
    try {
      const now = new Date().toISOString()
      const { data: all, error: e1 } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('status', 'published')
        .lte('published_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('published_at', { ascending: false })
      if (e1) { error.value = e1.message; return }
      if (!all || all.length === 0) return

      const { data: reads, error: e2 } = await supabase
        .from('user_notification_reads')
        .select('notification_id,dismissed_at')
        .eq('user_id', auth.user!.id)
      if (e2) { error.value = e2.message; return }
      const dismissedSet = new Set(
        (reads ?? []).filter((r) => r.dismissed_at).map((r) => r.notification_id),
      )

      const undismissed = all.filter((n) => !dismissedSet.has(n.id))
      if (undismissed.length === 0) return
      currentBanner.value = undismissed[0]
      unreadCount.value = undismissed.length - 1
    } finally {
      loading.value = false
    }
  }

  async function dismissed(notificationId: string) {
    if (!auth.user || auth.user?.id === 'dev') return
    bannerDismissing.value = true
    await supabase.from('user_notification_reads').upsert(
      { notification_id: notificationId, user_id: auth.user.id, dismissed_at: new Date().toISOString() },
      { onConflict: 'notification_id, user_id' },
    )
    currentBanner.value = null
    bannerDismissing.value = false
  }

  async function markRead(notificationId: string) {
    if (!auth.user || auth.user?.id === 'dev') return
    await supabase.from('user_notification_reads').upsert(
      { notification_id: notificationId, user_id: auth.user.id, read_at: new Date().toISOString() },
      { onConflict: 'notification_id, user_id' },
    )
  }

  async function markAllRead() {
    if (!auth.user || auth.user?.id === 'dev') return
    const now = new Date().toISOString()
    const { data: published } = await supabase
      .from('system_notifications')
      .select('id')
      .eq('status', 'published')
      .lte('published_at', now)
      .or(`expires_at.is.null,expires_at.gt.${now}`)
    if (!published || published.length === 0) return
    const rows = published.map((n) => ({
      notification_id: n.id,
      user_id: auth.user!.id,
      read_at: now,
    }))
    await supabase.from('user_notification_reads').upsert(rows, {
      onConflict: 'notification_id, user_id',
    })
    await loadBanner()
    await loadAll()
  }

  async function loadAll() {
    if (!auth.isAuthenticated || auth.user?.id === 'dev') return
    listLoading.value = true
    try {
      const now = new Date().toISOString()
      const { data: all, error: e1 } = await supabase
        .from('system_notifications')
        .select('*')
        .eq('status', 'published')
        .lte('published_at', now)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order('priority', { ascending: false })
        .order('published_at', { ascending: false })
      if (e1) { error.value = e1.message; return }
      if (!all) return

      const { data: reads, error: e2 } = await supabase
        .from('user_notification_reads')
        .select('notification_id,read_at,dismissed_at')
        .eq('user_id', auth.user!.id)
      if (e2) { error.value = e2.message; return }
      const readsMap = new Map((reads ?? []).map((r) => [r.notification_id, r]))

      notificationList.value = all.map((n) => {
        const r = readsMap.get(n.id)
        return { ...n, read_at: r?.read_at ?? null, dismissed_at: r?.dismissed_at ?? null }
      })
    } finally {
      listLoading.value = false
    }
  }

  return {
    loading,
    listLoading,
    error,
    currentBanner,
    unreadCount,
    bannerDismissing,
    loadBanner,
    dismissed,
    markRead,
    markAllRead,
    notificationList,
    loadAll,
  }
}

export function useInjectNotifications(): ReturnType<typeof useNotifications> {
  return inject(NOTIFICATION_KEY)!
}

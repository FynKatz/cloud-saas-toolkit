<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'
import { Check, ChevronRight } from 'lucide-vue-next'
import { useNotifications, type NotificationItem } from '../composables/useNotifications'
import { useRouter } from 'vue-router'

const notifications = useNotifications()
const router = useRouter()

const expandedId = ref<string | null>(null)
const filterUnread = ref(false)

const filtered = computed(() => {
  if (!filterUnread.value) return notifications.notificationList.value
  return notifications.notificationList.value.filter((n) => !n.read_at)
})

const unreadFilterCount = computed(() =>
  notifications.notificationList.value.filter((n) => !n.read_at).length,
)

function toggleExpand(id: string, item: NotificationItem) {
  if (expandedId.value === id) {
    expandedId.value = null
  } else {
    expandedId.value = id
    if (!item.read_at) {
      notifications.markRead(id)
    }
  }
}

function handleGo(route: string | null) {
  if (route) router.push(route)
}


function typeLabel(t: string): string {
  switch (t) {
    case 'maintenance': return '维护'
    case 'new_tool': return '新工具'
    case 'announcement': return '公告'
    case 'alert': return '告警'
    default: return t
  }
}

function daysAgo(ts: string): string {
  const d = new Date(ts)
  const diff = Date.now() - d.getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  return `${days} 天前`
}

onMounted(() => {
  notifications.loadAll()
})
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h2>系统通知</h2>
      <div class="spacer" />
      <div class="filter-row">
        <button
          class="filter-btn"
          :class="{ active: !filterUnread }"
          @click="filterUnread = false"
        >全部</button>
        <button
          class="filter-btn"
          :class="{ active: filterUnread }"
          @click="filterUnread = true"
        >未读 ({{ unreadFilterCount }})</button>
      </div>
      <button
        v-if="unreadFilterCount > 0"
        class="action-btn"
        @click="notifications.markAllRead()"
      >
        <Check class="h-4 w-4" />全部已读
      </button>
    </div>

    <div v-if="notifications.listLoading.value" class="empty">
      <p>加载中...</p>
    </div>
    <div v-else-if="filtered.length === 0" class="empty">
      <p>{{ filterUnread ? '没有未读通知' : '暂无通知' }}</p>
    </div>

    <div v-else class="list">
      <div
        v-for="item in filtered"
        :key="item.id"
        class="list-item"
        :class="{ expanded: expandedId === item.id }"
      >
        <div class="item-main" @click="toggleExpand(item.id, item)">
          <span class="read-dot" :class="{ unread: !item.read_at }" />
          <div class="item-left">
            <div class="item-title">{{ item.title }}</div>
            <div class="item-meta">
              <span class="tag" :class="item.type">{{ typeLabel(item.type) }}</span>
              <span class="date">{{ daysAgo(item.published_at) }}</span>
              <span class="priority" :class="item.priority">{{ item.priority === 'important' ? '高' : item.priority === 'warning' ? '中' : '低' }}</span>
            </div>
          </div>
          <div class="spacer" />
          <ChevronRight class="chev" :class="{ open: expandedId === item.id }" />
        </div>
        <Transition name="slide">
          <div v-if="expandedId === item.id" class="item-detail">
            <p class="detail-content">{{ item.content }}</p>
            <button
              v-if="item.target_route"
              class="detail-go"
              @click.stop="handleGo(item.target_route)"
            >前往配置 ›</button>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
.page-head { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 24px; }
.page-head h2 { font-size: 20px; font-weight: 680; }
.spacer { flex: 1; }
.filter-row { display: flex; gap: 4px; background: var(--chip-neutral); border-radius: 99px; padding: 3px; }
.filter-btn { padding: 5px 14px; border-radius: 99px; font-size: 12.5px; font-weight: 500; border: none; background: none; cursor: pointer; color: var(--ink-2); transition: all .12s; }
.filter-btn.active { background: var(--card); color: var(--ink); box-shadow: 0 1px 3px rgba(0,0,0,.08); }
.action-btn { display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 9px; border: 1px solid var(--line); background: var(--card); color: var(--ink); font-size: 13px; cursor: pointer; font-family: inherit; transition: all .12s; }
.action-btn:hover { background: var(--hover); }

.empty { text-align: center; padding: 60px 0; color: var(--ink-3); }
.empty p { font-size: 14px; }

.list { display: flex; flex-direction: column; gap: 6px; }
.list-item { border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--card); overflow: hidden; transition: border-color .12s; }
.list-item:hover { border-color: var(--violet-line); }
.item-main { display: flex; align-items: center; gap: 12px; padding: 14px 18px; cursor: pointer; }
.read-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--ink-3); flex-shrink: 0; }
.read-dot.unread { background: var(--violet); }
.item-left { min-width: 0; flex: 1; }
.item-title { font-size: 14px; font-weight: 600; margin-bottom: 4px; }
.item-meta { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--ink-2); }
.tag { padding: 1px 7px; border-radius: 99px; font-size: 11px; font-weight: 600; background: var(--chip-neutral); }
.tag.maintenance { background: #fff3cd; color: #856404; }
.tag.new_tool { background: #d1ecf1; color: #0c5460; }
.tag.announcement { background: #d4edda; color: #155724; }
.tag.alert { background: #f8d7da; color: #721c24; }
.priority { padding: 1px 6px; border-radius: 4px; font-size: 11px; }
.priority.important { background: #fce4ec; color: #c62828; }
.priority.warning { background: #fff3e0; color: #e65100; }
.priority.info { background: var(--chip-neutral); color: var(--ink-2); }
.chev { width: 16px; height: 16px; color: var(--ink-3); transition: transform .15s; flex-shrink: 0; }
.chev.open { transform: rotate(90deg); }
.item-detail { border-top: 1px solid var(--line); padding: 14px 18px 18px; }
.detail-content { font-size: 13px; color: var(--ink-2); line-height: 1.6; white-space: pre-wrap; margin-bottom: 12px; }
.detail-go { background: var(--violet-soft); color: var(--violet); border: 1px solid var(--violet-line); border-radius: 8px; padding: 6px 14px; font-size: 12px; font-weight: 600; cursor: pointer; font-family: inherit; transition: all .12s; }
.detail-go:hover { background: var(--violet); color: #fff; }

.slide-enter-active, .slide-leave-active { transition: all .18s ease; overflow: hidden; }
.slide-enter-from, .slide-leave-to { max-height: 0; opacity: 0; padding-top: 0; padding-bottom: 0; }
</style>

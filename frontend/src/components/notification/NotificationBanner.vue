<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useInjectNotifications } from '../../composables/useNotifications'

const notifications = useInjectNotifications()
const router = useRouter()

function handleDismiss() {
  if (notifications.currentBanner.value && !notifications.bannerDismissing.value) {
    notifications.dismissed(notifications.currentBanner.value.id)
  }
}

function handleDetail() {
  if (notifications.currentBanner.value) {
    notifications.markRead(notifications.currentBanner.value.id)
    const target = notifications.currentBanner.value.target_route
    if (target) {
      router.push(target)
    } else {
      router.push('/notifications')
    }
  }
}

function goCenter() {
  router.push('/notifications')
}

/** 横幅类型 → 小图标文字 */
function typeIcon(t: string) {
  switch (t) {
    case 'alert': return '⚠'
    case 'maintenance': return '🔧'
    case 'new_tool': return '🛠'
    case 'announcement': return '📣'
    default: return '⚡'
  }
}
</script>

<template>
  <Transition name="notif-slide">
    <div v-if="notifications.currentBanner.value" class="banner notif-banner">
      <div class="banner-badge">{{ typeIcon(notifications.currentBanner.value.type) }}</div>
      <div class="banner-main">
        <h4>{{ notifications.currentBanner.value.title }}</h4>
        <p>{{ notifications.currentBanner.value.content }}</p>
      </div>
      <button class="banner-cta" @click="handleDetail">查看详情 →</button>
      <button class="notif-close" title="关闭" @click="handleDismiss">✕</button>
      <div v-if="notifications.unreadCount.value > 0" class="notif-more-row">
        <div class="notif-divider" />
        <button class="notif-more-btn" @click="goCenter">还有 {{ notifications.unreadCount.value }} 条未读通知 →</button>
        <div class="notif-divider" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.notif-banner {
  position: relative;
  flex-wrap: wrap;
  padding: 13px 14px 10px;
  gap: 10px;
}
.notif-close {
  position: absolute;
  top: 12px;
  right: 12px;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: none;
  color: var(--ink-3);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  transition: background .12s, color .12s;
}
.notif-close:hover {
  background: var(--hover);
  color: var(--ink);
}
.notif-more-row {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 2px;
}
.notif-divider {
  flex: 1;
  height: 1px;
  background: var(--violet-line);
}
.notif-more-btn {
  border: none;
  background: none;
  font-size: 12px;
  color: var(--violet);
  cursor: pointer;
  font-family: inherit;
  padding: 2px 0;
  white-space: nowrap;
  user-select: none;
}
.notif-more-btn:hover {
  text-decoration: underline;
}

/* 退场动画 */
.notif-slide-leave-active {
  transition: opacity .2s, transform .2s;
}
.notif-slide-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>

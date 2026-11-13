<script setup lang="ts">
import { computed } from 'vue'
import { X, ArrowUpRight } from 'lucide-vue-next'
import { useInjectNotifications } from '../composables/useNotifications'
import { useRouter } from 'vue-router'

const notifications = useInjectNotifications()
const router = useRouter()

const visible = computed(() => !!notifications.currentBanner.value && !notifications.bannerDismissing.value)

function typeIcon(t: string) {
  switch (t) {
    case 'alert': return '⚠'
    case 'maintenance': return '🔧'
    case 'new_tool': return '🛠'
    case 'announcement': return '📣'
    default: return '⚡'
  }
}

function handleDismiss() {
  const banner = notifications.currentBanner.value
  if (banner) notifications.dismissed(banner.id)
}

function handleDetail() {
  const banner = notifications.currentBanner.value
  if (!banner) return
  notifications.markRead(banner.id)
  if (banner.target_route) {
    router.push(banner.target_route)
  } else {
    router.push('/notifications')
  }
}

function goCenter() {
  router.push('/notifications')
}
</script>

<template>
  <Transition name="v2-notif-banner">
    <div v-if="visible" class="v2-notif-banner" role="alert" aria-live="polite">
      <div class="v2-notif-banner-badge">{{ typeIcon(notifications.currentBanner.value!.type) }}</div>
      <div class="v2-notif-banner-body">
        <div class="v2-notif-banner-title">{{ notifications.currentBanner.value!.title }}</div>
        <div class="v2-notif-banner-text">{{ notifications.currentBanner.value!.content }}</div>
      </div>
      <button class="v2-notif-banner-action" @click="handleDetail">
        <span>查看详情</span>
        <ArrowUpRight :size="13" />
      </button>
      <button class="v2-notif-banner-close" @click="handleDismiss" aria-label="关闭通知">
        <X :size="16" />
      </button>
      <div v-if="notifications.unreadCount.value > 0" class="v2-notif-banner-more">
        <div class="v2-notif-banner-more-line" />
        <button class="v2-notif-banner-more-btn" @click="goCenter">
          还有 {{ notifications.unreadCount.value }} 条未读通知 →
        </button>
        <div class="v2-notif-banner-more-line" />
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.v2-notif-banner {
  position: fixed;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 760px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  background: var(--v2-card-bg);
  border: 1px solid var(--v2-accent);
  border-radius: var(--v2-radius);
  box-shadow: 0 8px 32px rgba(0,0,0,.14);
  z-index: var(--v2-z-notification-banner);
}
.v2-notif-banner-badge {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: var(--v2-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  flex-shrink: 0;
}
.v2-notif-banner-body {
  flex: 1;
  min-width: 0;
}
.v2-notif-banner-title {
  font-size: 13.5px;
  font-weight: 650;
  color: var(--v2-ink);
}
.v2-notif-banner-text {
  font-size: 12.5px;
  color: var(--v2-ink-2);
  margin-top: 2px;
  line-height: 1.4;
}
.v2-notif-banner-action {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid var(--v2-accent);
  background: var(--v2-card-bg);
  color: var(--v2-accent);
  border-radius: var(--v2-radius-sm);
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background .12s, color .12s;
}
.v2-notif-banner-action:hover {
  background: var(--v2-accent);
  color: #fff;
}
.v2-notif-banner-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--v2-ink-2);
  cursor: pointer;
  border-radius: var(--v2-radius-sm);
  flex-shrink: 0;
  transition: background .12s;
}
.v2-notif-banner-close:hover {
  background: var(--v2-btn-ghost-hover);
  color: var(--v2-ink);
}
.v2-notif-banner-more {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 2px;
}
.v2-notif-banner-more-line {
  flex: 1;
  height: 1px;
  background: var(--v2-border);
  opacity: .35;
}
.v2-notif-banner-more-btn {
  border: none;
  background: none;
  font-size: 12px;
  color: var(--v2-accent);
  cursor: pointer;
  padding: 2px 0;
  white-space: nowrap;
  font-family: inherit;
  transition: opacity .12s;
}
.v2-notif-banner-more-btn:hover {
  opacity: .8;
}

.v2-notif-banner-enter-active { transition: all .3s ease-out; }
.v2-notif-banner-leave-active { transition: all .2s ease-in; }
.v2-notif-banner-enter-from { opacity: 0; transform: translateX(-50%) translateY(-20px); }
.v2-notif-banner-leave-to { opacity: 0; transform: translateX(-50%) translateY(-12px); }
</style>

<script setup lang="ts">
import { Bell, LayoutDashboard, Search, ShieldCheck, User } from 'lucide-vue-next'
import type { L1Context } from '../stores/preferences'

defineProps<{
  l1Context: L1Context
  isAdmin: boolean
  pendingUsers: number
  unreadCount: number
}>()

const emit = defineEmits<{
  select: [ctx: L1Context | 'search']
  openSidebar: []
}>()
</script>

<template>
  <nav class="v2-mobile-tabbar" role="navigation" aria-label="Mobile navigation">
    <button class="v2-mobile-tab" :class="{ active: l1Context === 'workspace' }" aria-label="工作台" @click="() => { emit('select', 'workspace'); emit('openSidebar') }">
      <LayoutDashboard :size="20" />
      <span>工作台</span>
    </button>
    <button class="v2-mobile-tab" aria-label="搜索" @click="emit('select', 'search')">
      <Search :size="20" />
      <span>搜索</span>
    </button>
    <button class="v2-mobile-tab" :class="{ active: l1Context === 'notifications' }" aria-label="通知" @click="emit('select', 'notifications')">
      <Bell :size="20" />
      <span v-if="unreadCount > 0" class="v2-mobile-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      <span>通知</span>
    </button>
    <button v-if="isAdmin" class="v2-mobile-tab" :class="{ active: l1Context === 'admin' }" aria-label="管理台" @click="emit('select', 'admin')">
      <ShieldCheck :size="20" />
      <span v-if="pendingUsers > 0" class="v2-mobile-badge v2-mobile-badge-red">{{ pendingUsers > 99 ? '99+' : pendingUsers }}</span>
      <span>管理台</span>
    </button>
    <button class="v2-mobile-tab" aria-label="用户" @click="emit('select', 'workspace')">
      <User :size="20" />
      <span>用户</span>
    </button>
  </nav>
</template>

<style scoped>
.v2-mobile-tabbar { display: none; }

@media (max-width: 768px) {
  .v2-mobile-tabbar {
    display: flex;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 48px;
    background: var(--v2-l2-bg);
    border-top: 1px solid var(--v2-divider);
    z-index: var(--v2-z-sticky);
  }

  .v2-mobile-tab {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 1px;
    border: none;
    background: transparent;
    color: var(--v2-ink-2);
    font-size: 10px;
    cursor: pointer;
    padding: 4px 0;
    position: relative;
    min-width: 44px;
    min-height: 44px;
  }

  .v2-mobile-tab.active { color: var(--v2-accent); }
  .v2-mobile-tab:hover { color: var(--v2-ink); }

  .v2-mobile-badge {
    position: absolute;
    top: 2px;
    right: calc(50% - 18px);
    min-width: 15px;
    height: 15px;
    border-radius: 8px;
    background: var(--v2-error);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    line-height: 1;
  }
  .v2-mobile-badge-red { background: var(--v2-warning); }
}
</style>

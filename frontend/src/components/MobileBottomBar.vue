<script setup lang="ts">
import CuIcon from './v2/CuIcon.vue'
import { i18n } from '../i18n'
import type { L1Context } from '../stores/preferences'

const { t } = i18n.global

defineProps<{
  l1Context: L1Context
  isAdmin: boolean
  pendingUsers: number
  unreadCount: number
  avatarOpen: boolean
}>()

const emit = defineEmits<{
  select: [ctx: L1Context | 'search']
  openSidebar: []
  openAvatar: []
}>()
</script>

<template>
  <nav class="v2-mobile-tabbar" role="navigation" aria-label="Mobile navigation">
    <button class="v2-mobile-tab" :class="{ active: l1Context === 'workspace' }" :aria-label="t('nav.workspace')" @click="() => { emit('select', 'workspace'); emit('openSidebar') }">
      <CuIcon name="home" :size="20" />
      <span>{{ t('nav.workspace') }}</span>
    </button>
    <button class="v2-mobile-tab" :aria-label="t('nav.search')" @click="emit('select', 'search')">
      <CuIcon name="search" :size="20" />
      <span>{{ t('nav.search') }}</span>
    </button>
    <button class="v2-mobile-tab" :class="{ active: l1Context === 'notifications' }" :aria-label="t('nav.notifications')" @click="emit('select', 'notifications')">
      <CuIcon name="bell" :size="20" />
      <span v-if="unreadCount > 0" class="v2-mobile-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      <span>{{ t('nav.notifications') }}</span>
    </button>
    <button v-if="isAdmin" class="v2-mobile-tab" :class="{ active: l1Context === 'admin' }" :aria-label="t('nav.admin')" @click="emit('select', 'admin')">
      <CuIcon name="grid-dots" :size="20" />
      <span v-if="pendingUsers > 0" class="v2-mobile-badge v2-mobile-badge-red">{{ pendingUsers > 99 ? '99+' : pendingUsers }}</span>
      <span>{{ t('nav.admin') }}</span>
    </button>
    <!-- 打开头像下拉。不能再 emit('select','workspace')：那会连带 push('/') 把用户弹回概览 -->
    <button class="v2-mobile-tab" :class="{ active: avatarOpen }" :aria-label="t('account.changePassword')" @click="emit('openAvatar')">
      <CuIcon name="user-plus" :size="20" />
      <span>{{ t('nav.account') }}</span>
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
    height: var(--cu-mobile-tabbar-height);
    background: var(--cu-mobile-tabbar-bg);
    border-top: 1px solid var(--cu-seam-1);
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
    color: var(--cu-nav-muted-icon);
    font-size: 10px;
    cursor: pointer;
    padding: 4px 0;
    position: relative;
    min-width: 44px;
    min-height: 44px;
  }

  .v2-mobile-tab.active { color: var(--cu-nav-text-strong); }
  .v2-mobile-tab:hover { color: var(--cu-nav-text); }

  .v2-mobile-badge {
    position: absolute;
    top: 2px;
    right: calc(50% - 18px);
    min-width: 15px;
    height: 15px;
    border-radius: 8px;
    background: var(--cu-l1-badge);
    color: #fff;
    font-size: 9px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 3px;
    line-height: 1;
  }
  .v2-mobile-badge-red { background: var(--cu-l1-badge); }
}
</style>

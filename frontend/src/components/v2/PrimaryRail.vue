<script setup lang="ts">
import {
  Bell,
  Menu,
  Search,
   Wrench,
   LayoutDashboard,
} from 'lucide-vue-next'
import type { L1Context } from '../../stores/preferences'

defineProps<{
  l1Context: L1Context
  labelPanelOpen: boolean
  isAdmin: boolean
  pendingUsers: number
  unreadCount: number
}>()

const emit = defineEmits<{
  setL1Context: [ctx: L1Context | 'search']
  openSearch: []
  toggleLabelPanel: []
  openLabelPanel: []
  closeLabelPanel: []
}>()
</script>

<template>
  <!-- L1: PrimaryRail -->
  <nav class="v2-l1" :class="{ 'v2-l1-expanded': labelPanelOpen }" role="navigation" aria-label="Primary navigation">
    <div class="v2-l1-header">
      <span v-if="labelPanelOpen" class="v2-l1-brand-text">Taulko</span>
      <button class="v2-l1-btn v2-l1-btn-toggle" aria-label="Toggle labels" @click="emit('toggleLabelPanel')">
        <Menu :size="16" />
      </button>
    </div>
    <button class="v2-l1-btn" :class="{ active: l1Context === 'workspace' && !labelPanelOpen }" aria-label="Toolkit" @click="emit('setL1Context', 'workspace')">
      <LayoutDashboard :size="16" />
      <span v-if="labelPanelOpen" class="v2-l1-label">工作台</span>
    </button>
    <button class="v2-l1-btn" :class="{ active: false }" aria-label="Search" @click="emit('openSearch')">
      <Search :size="16" />
      <span v-if="labelPanelOpen" class="v2-l1-label">搜索</span>
    </button>
    <button class="v2-l1-btn v2-l1-badge-btn" :class="{ active: l1Context === 'notifications' }" aria-label="Notifications" @click="emit('setL1Context', 'notifications')">
      <Bell :size="16" />
      <span v-if="labelPanelOpen" class="v2-l1-label">通知</span>
      <span v-if="unreadCount > 0" class="v2-l1-badge" aria-live="assertive">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
    </button>
    <div class="v2-l1-spacer" />
    <button v-if="isAdmin" class="v2-l1-btn v2-l1-badge-btn" :class="{ active: l1Context === 'admin' }" aria-label="Admin" @click="emit('setL1Context', 'admin')">
      <Wrench :size="16" />
      <span v-if="labelPanelOpen" class="v2-l1-label">管理台</span>
      <span v-if="pendingUsers > 0" class="v2-l1-badge v2-l1-badge-red">{{ pendingUsers > 99 ? '99+' : pendingUsers }}</span>
    </button>
  </nav>
</template>

<style scoped>
/* L1 PrimaryRail */
.v2-l1 { width: var(--v2-l1-width); min-width: var(--v2-l1-width); background: var(--v2-l1-bg); display: flex; flex-direction: column; align-items: center; padding: 6px 0; gap: var(--v2-nav-item-gap); z-index: var(--v2-z-sticky); transition: width .18s ease, min-width .18s ease; overflow: hidden; }
.v2-l1-expanded { width: var(--v2-l1-expanded-width); min-width: var(--v2-l1-expanded-width); align-items: stretch; }

.v2-l1-header { display: flex; align-items: center; width: var(--v2-l1-width); justify-content: center; flex-shrink: 0; }
.v2-l1-expanded .v2-l1-header { width: 100%; justify-content: space-between; padding: 0 8px 0 10px; }
.v2-l1-brand-text { font-size: var(--v2-l1-label-size); font-weight: 600; color: var(--v2-l1-icon-active); white-space: nowrap; line-height: 1; user-select: none; }

.v2-l1-btn { width: var(--v2-nav-item-height); height: var(--v2-nav-item-height); display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-l1-icon); cursor: pointer; border-radius: 6px; position: relative; transition: background .12s ease, color .12s ease; padding: 0; flex-shrink: 0; }
.v2-l1-expanded .v2-l1-btn { width: 100%; justify-content: flex-start; gap: var(--v2-nav-item-gap); padding: 0 10px; }
.v2-l1-expanded .v2-l1-btn-toggle { width: var(--v2-nav-item-height); justify-content: center; padding: 0; gap: 0; align-self: center; }
.v2-l1-btn:hover { background: var(--v2-l1-hover); color: var(--v2-l1-icon-hover); }
.v2-l1-btn.active { color: var(--v2-l1-icon-active); }
.v2-l1-btn.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--v2-l1-active-indicator); border-radius: 0 3px 3px 0; }
.v2-l1-label { font-size: var(--v2-l1-label-size); color: var(--v2-l1-icon); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.v2-l1-spacer { flex: 1; }

.v2-l1-badge-btn { position: relative; }
.v2-l1-badge { position: absolute; top: 4px; right: 4px; min-width: 16px; height: 16px; border-radius: 8px; background: var(--v2-error); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; padding: 0 4px; line-height: 1; }
.v2-l1-badge-red { background: var(--v2-warning); }
@media (max-width: 768px) {
  .v2-l1 { display: none !important; }
}
</style>

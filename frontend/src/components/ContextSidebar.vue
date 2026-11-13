<script setup lang="ts">
import {
  Bell,
  PanelLeftClose,
  ChevronRight,
  Search,
  X,
  LayoutDashboard,
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { L1Context } from '../stores/preferences'

const props = defineProps<{
  l1Context: L1Context
  sidebarCollapsed: boolean
  recentTools: { id: string; name: string; icon: any; route: string }[]
  favoriteTools: { id: string; name: string; icon: any; route: string }[]
  toolGroups: { name: string; items: { id: string; name: string; icon: any; route: string }[] }[]
  adminNav: { id: string; name: string; icon: any; route: string }[]
  collapsedGroups: Record<string, boolean>
  l2SearchQuery: string
  mobileL2Open?: boolean
  isMobile?: boolean
  activeRoute: (path: string) => boolean
}>()

const emit = defineEmits<{
  toggleSidebar: []
  navigateTo: [path: string, toolId?: string]
  toggleGroup: [name: string]
  updateL2Search: [query: string]
  closeMobileL2: []
}>()

const filteredGroups = computed(() => {
  const q = props.l2SearchQuery.trim().toLowerCase()
  if (!q) return props.toolGroups
  return props.toolGroups
    .map(g => ({
      name: g.name,
      items: g.items.filter(item => item.name.toLowerCase().includes(q)),
    }))
    .filter(g => g.items.length > 0)
})

function isGroupCollapsed(name: string): boolean {
  return props.collapsedGroups[name] === true
}
</script>

<template>
  <div v-if="isMobile && mobileL2Open" class="v2-l2-backdrop" @click="emit('closeMobileL2')" aria-hidden="true" />
  <Transition name="v2-l2">
    <aside v-if="!sidebarCollapsed || mobileL2Open" class="v2-l2" role="navigation" aria-label="Context navigation" :aria-expanded="!sidebarCollapsed || !!mobileL2Open">
      <!-- Workspace -->
      <template v-if="l1Context === 'workspace'">
        <div class="v2-l2-header">
          <span class="v2-l2-title">工作台</span>
          <div class="v2-l2-header-actions">
            <button class="v2-l2-collapse-btn" @click="emit('toggleSidebar')" aria-label="收起侧栏">
              <PanelLeftClose :size="16" />
            </button>
            <button class="v2-l2-mobile-close" @click="emit('closeMobileL2')" aria-label="关闭侧栏">
              <X :size="16" />
            </button>
          </div>
        </div>
        <div class="v2-l2-search">
          <Search :size="16" class="v2-l2-search-icon" />
          <input
            :value="l2SearchQuery"
            class="v2-l2-search-input"
            placeholder="搜索工具…"
            @input="emit('updateL2Search', ($event.target as HTMLInputElement).value)"
          />
          <button v-if="l2SearchQuery" class="v2-l2-search-clear" @click="emit('updateL2Search', '')"><X :size="16" /></button>
        </div>
        <div class="v2-l2-content" role="list">
          <button class="v2-l2-item" :class="{ active: activeRoute('/') }" @click="emit('navigateTo', '/')" role="listitem">
            <LayoutDashboard :size="16" /> <span>概览</span>
          </button>

          <div v-if="recentTools.length" class="v2-l2-group">
            <button class="v2-l2-group-header" :aria-expanded="!isGroupCollapsed('__recent__')" @click="emit('toggleGroup', '__recent__')">
              <ChevronRight :size="16" class="v2-l2-chevron" :class="{ rotated: !isGroupCollapsed('__recent__') }" />
              <span>最近使用</span>
            </button>
            <div v-if="!isGroupCollapsed('__recent__')" class="v2-l2-subitems" role="list">
              <button v-for="item in recentTools" :key="item.id" class="v2-l2-item v2-l2-subitem" :class="{ active: activeRoute(item.route) }" @click="emit('navigateTo', item.route, item.id)" role="listitem">
                <component :is="item.icon" :size="16" /> <span>{{ item.name }}</span>
              </button>
            </div>
          </div>

          <div v-if="favoriteTools.length" class="v2-l2-group">
            <button class="v2-l2-group-header" :aria-expanded="!isGroupCollapsed('__favorites__')" @click="emit('toggleGroup', '__favorites__')">
              <ChevronRight :size="16" class="v2-l2-chevron" :class="{ rotated: !isGroupCollapsed('__favorites__') }" />
              <span>收藏</span>
            </button>
            <div v-if="!isGroupCollapsed('__favorites__')" class="v2-l2-subitems" role="list">
              <button v-for="item in favoriteTools" :key="item.id" class="v2-l2-item v2-l2-subitem" :class="{ active: activeRoute(item.route) }" @click="emit('navigateTo', item.route, item.id)" role="listitem">
                <component :is="item.icon" :size="16" /> <span>{{ item.name }}</span>
              </button>
            </div>
          </div>

          <div v-for="group in filteredGroups" :key="group.name" class="v2-l2-group">
            <button class="v2-l2-group-header" :aria-expanded="!isGroupCollapsed(group.name)" @click="emit('toggleGroup', group.name)">
              <ChevronRight :size="16" class="v2-l2-chevron" :class="{ rotated: !isGroupCollapsed(group.name) }" />
              <span>{{ group.name }}</span>
            </button>
            <div v-if="!isGroupCollapsed(group.name)" class="v2-l2-subitems" role="list">
              <button v-for="item in group.items" :key="item.id" class="v2-l2-item v2-l2-subitem" :class="{ active: activeRoute(item.route) }" @click="emit('navigateTo', item.route, item.id)" role="listitem">
                <component :is="item.icon" :size="16" /> <span>{{ item.name }}</span>
              </button>
            </div>
          </div>
        </div>
      </template>

      <!-- Admin -->
      <template v-if="l1Context === 'admin'">
        <div class="v2-l2-header">
          <span class="v2-l2-title">管理台</span>
          <div class="v2-l2-header-actions">
            <button class="v2-l2-collapse-btn" @click="emit('toggleSidebar')" aria-label="收起侧栏">
              <PanelLeftClose :size="16" />
            </button>
            <button class="v2-l2-mobile-close" @click="emit('closeMobileL2')" aria-label="关闭侧栏">
              <X :size="16" />
            </button>
          </div>
        </div>
        <div class="v2-l2-content" role="list">
          <button v-for="item in adminNav" :key="item.id" class="v2-l2-item" :class="{ active: activeRoute(item.route) }" @click="emit('navigateTo', item.route)" role="listitem">
            <component :is="item.icon" :size="16" /> <span>{{ item.name }}</span>
          </button>
        </div>
      </template>

      <!-- Notifications -->
      <template v-if="l1Context === 'notifications'">
        <div class="v2-l2-header">
          <span class="v2-l2-title">通知</span>
          <div class="v2-l2-header-actions">
            <button class="v2-l2-collapse-btn" @click="emit('toggleSidebar')" aria-label="收起侧栏">
              <PanelLeftClose :size="16" />
            </button>
            <button class="v2-l2-mobile-close" @click="emit('closeMobileL2')" aria-label="关闭侧栏">
              <X :size="16" />
            </button>
          </div>
        </div>
        <div class="v2-l2-content" role="list">
          <button class="v2-l2-item" :class="{ active: activeRoute('/notifications') }" @click="emit('navigateTo', '/notifications')" role="listitem">
            <Bell :size="16" /> <span>通知中心</span>
          </button>
        </div>
      </template>
    </aside>
  </Transition>
</template>

<style scoped>
.v2-l2 { width: 232px; min-width: 232px; background: var(--v2-l2-bg); background: color-mix(in srgb, var(--v2-l2-bg) 88%, transparent); box-shadow: 1px 0 0 var(--v2-divider), 2px 0 8px rgba(0,0,0,.03); border-right: none; display: flex; flex-direction: column; overflow: hidden; }
.v2-l2-enter-active { transition: width .25s ease-out, opacity .15s ease-out; }
.v2-l2-leave-active { transition: width .25s ease-out, opacity .15s ease-out; }
.v2-l2-enter-from, .v2-l2-leave-to { opacity: 0; }

.v2-l2-header { display: flex; align-items: center; justify-content: space-between; padding: 8px 14px 6px; flex-shrink: 0; }
.v2-l2-title { font-size: var(--v2-l2-group-header-size); font-weight: 600; color: var(--v2-ink-2); }
.v2-l2-header-actions { display: flex; align-items: center; gap: 4px; }
.v2-l2-collapse-btn { width: var(--v2-nav-item-height); height: var(--v2-nav-item-height); display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: 6px; transition: background .12s; }
.v2-l2-collapse-btn:hover { background: var(--v2-btn-ghost-hover); }

.v2-l2-search { margin: 0 10px 6px; position: relative; flex-shrink: 0; }
.v2-l2-search-icon { position: absolute; left: 8px; top: 50%; transform: translateY(-50%); color: var(--v2-ink-2); }
.v2-l2-search-input { width: 100%; padding: 6px 28px 6px 28px; border: 1px solid var(--v2-border); border-radius: var(--v2-radius-sm); background: transparent; font-size: var(--v2-l2-item-size); color: var(--v2-ink); outline: none; transition: border-color .15s; }
.v2-l2-search-input:focus { border-color: var(--v2-accent); }
.v2-l2-search-input::placeholder { color: var(--v2-ink-2); }
.v2-l2-search-clear { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; padding: 2px; font-size: 16px; }

.v2-l2-content { flex: 1; overflow-y: auto; padding: 0 8px 12px; }
.v2-l2-item { display: flex; align-items: center; gap: var(--v2-nav-item-gap); width: 100%; padding: 0 10px; height: var(--v2-nav-item-height); border: none; background: transparent; text-align: left; font-size: var(--v2-l2-item-size); color: var(--v2-ink); cursor: pointer; border-radius: var(--v2-radius-sm); transition: background .12s, color .12s; line-height: 1; }
.v2-l2-item:hover { background: var(--v2-btn-ghost-hover); }
.v2-l2-item.active { background: var(--v2-accent-light); color: var(--v2-accent); font-weight: 600; position: relative; }
.v2-l2-item.active::before { content: ''; position: absolute; left: 0; top: 6px; bottom: 6px; width: 3px; background: var(--v2-accent); border-radius: 0 3px 3px 0; }

.v2-l2-group { margin-top: 4px; }
.v2-l2-group-header { display: flex; align-items: center; gap: var(--v2-nav-item-gap); width: 100%; padding: 0 10px; height: var(--v2-nav-item-height); border: none; background: transparent; text-align: left; font-size: var(--v2-l2-group-header-size); font-weight: 600; color: var(--v2-ink-2); cursor: pointer; transition: color .12s; border-radius: var(--v2-radius-sm); }
.v2-l2-group-header:hover { color: var(--v2-ink); }
.v2-l2-chevron { transition: transform .15s ease; flex-shrink: 0; }
.v2-l2-chevron.rotated { transform: rotate(90deg); }
.v2-l2-subitems { padding-left: 4px; }
.v2-l2-subitem { font-size: var(--v2-l2-item-size); padding: 0 10px 0 24px; height: var(--v2-nav-item-height); }

@media (max-width: 768px) {
  .v2-l2 {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 48px;
    width: 232px;
    min-width: 232px;
    z-index: var(--v2-z-drawer);
    box-shadow: 0 8px 30px rgba(0,0,0,.15);
  }
  .v2-l2-enter-from, .v2-l2-leave-to { transform: translateX(-100%); }
  .v2-l2-enter-active { transition: transform .25s ease-out; }
  .v2-l2-leave-active { transition: transform .2s ease-in; }

  .v2-l2-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,.4);
    z-index: calc(var(--v2-z-drawer) - 1);
  }
}

.v2-l2-mobile-close {
  display: none;
}

@media (max-width: 768px) {
  .v2-l2-mobile-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--v2-nav-item-height);
    height: var(--v2-nav-item-height);
    border: none;
    background: transparent;
    color: var(--v2-ink-2);
    cursor: pointer;
    border-radius: 6px;
  }
  .v2-l2-mobile-close:hover {
    background: var(--v2-btn-ghost-hover);
  }
}
</style>

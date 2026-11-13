<script setup lang="ts">
// 这条栏已降级为「页面副标题栏」：主题 / 语言 / 头像上移到 components/v2/GlobalTopbar.vue。
// 侧栏收折是一对互补入口：L2 头部按钮负责「收起」，这里只在收起态提供「展开」——
// 因为 L2 一旦收折整个 aside 就不渲染了，它内部的按钮也随之消失，
// 没有这个回展开按钮，鼠标用户就只能靠 ⌘\ 才能把侧栏找回来。
import { i18n } from '../i18n'
import CuIcon from './v2/CuIcon.vue'

const { t } = i18n.global

defineProps<{
  offline: boolean
  sidebarCollapsed: boolean
  breadcrumbs: { label: string; route?: string }[]
}>()

const emit = defineEmits<{
  navigateTo: [path: string]
  toggleSidebar: []
}>()
</script>

<template>
  <header class="v2-topbar">
    <div class="v2-topbar-left">
      <button
        v-if="sidebarCollapsed"
        class="v2-topbar-expand"
        :aria-label="t('nav.expandSidebar')"
        :title="t('nav.expandSidebar')"
        @click="emit('toggleSidebar')"
      >
        <CuIcon name="panel-left-open" :size="16" />
      </button>
      <nav class="v2-breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
          <span v-if="idx > 0" class="v2-breadcrumb-sep">/</span>
          <a v-if="crumb.route" class="v2-breadcrumb-link" href="#" @click.prevent="emit('navigateTo', crumb.route)">{{ crumb.label }}</a>
          <span v-else class="v2-breadcrumb-current">{{ crumb.label }}</span>
        </template>
      </nav>
    </div>
    <div v-if="offline" class="v2-offline-bar" role="status">{{ t('common.offline') }}</div>
  </header>
</template>

<style scoped>
.v2-topbar {
  height: var(--cu-subbar-height);
  min-height: var(--cu-subbar-height);
  flex-shrink: 0;
  background: var(--cu-subbar-bg);
  border-bottom: 1px solid var(--cu-seam-1);
  display: flex; align-items: center; padding: 0 20px; gap: 12px;
  z-index: var(--v2-z-sticky); position: relative;
}
.v2-topbar-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.v2-topbar-expand {
  width: 28px; height: 28px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 6px;
  color: var(--cu-nav-muted-icon); cursor: pointer; padding: 0;
  transition: background .12s, color .12s;
}
.v2-topbar-expand:hover { background: var(--cu-nav-hover-bg); color: var(--cu-nav-text-strong); }
.v2-breadcrumbs { display: flex; align-items: center; gap: 6px; font-size: 13px; overflow: hidden; }
.v2-breadcrumb-link { color: var(--v2-ink-2); text-decoration: none; white-space: nowrap; transition: color .12s; }
.v2-breadcrumb-link:hover { color: var(--v2-ink); }
.v2-breadcrumb-current { color: var(--v2-ink); font-weight: 500; white-space: nowrap; }
.v2-breadcrumb-sep { color: var(--v2-border); font-size: 14px; flex-shrink: 0; }
.v2-offline-bar { font-size: 12px; color: var(--v2-warning); background: var(--v2-warning-bg); padding: 3px 10px; border-radius: var(--v2-radius-sm); white-space: nowrap; }
@media (max-width: 768px) {
  .v2-topbar {
    padding: 0 12px;
    height: var(--cu-mobile-subbar-height);
    min-height: var(--cu-mobile-subbar-height);
  }
  /* 移动端 L2 是抽屉，由底部 tab 打开，这里不重复提供入口 */
  .v2-topbar-expand { display: none; }
}
</style>

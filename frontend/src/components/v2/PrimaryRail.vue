<script setup lang="ts">
import CuIcon from './CuIcon.vue'
import { i18n } from '../../i18n'
import type { L1Context } from '../../stores/preferences'

const { t } = i18n.global

defineProps<{
  l1Context: L1Context
  isAdmin: boolean
  pendingUsers: number
  unreadCount: number
}>()

// 搜索已上移到全宽顶栏的胶囊，L1 不再承担搜索入口，
// 因此这里的 setL1Context 只接受真实上下文，不再需要 'search' 分支。
const emit = defineEmits<{
  setL1Context: [ctx: L1Context]
}>()
</script>

<template>
  <nav class="v2-l1" role="navigation" aria-label="Primary navigation">
    <div class="v2-l1-panel">
      <button
        class="v2-l1-item"
        :class="{ active: l1Context === 'workspace' }"
        :aria-label="t('nav.workspace')"
        @click="emit('setL1Context', 'workspace')"
      >
        <span class="v2-l1-icon-wrap">
          <span v-if="l1Context === 'workspace'" class="v2-l1-glow" aria-hidden="true" />
          <CuIcon name="home" :size="18" class="v2-l1-icon" />
        </span>
        <span class="v2-l1-label" :title="t('nav.workspace')">{{ t('nav.workspace') }}</span>
      </button>

      <button
        class="v2-l1-item"
        :class="{ active: l1Context === 'notifications' }"
        :aria-label="t('nav.notifications')"
        @click="emit('setL1Context', 'notifications')"
      >
        <span class="v2-l1-icon-wrap">
          <span v-if="l1Context === 'notifications'" class="v2-l1-glow" aria-hidden="true" />
          <CuIcon name="bell" :size="18" class="v2-l1-icon" />
        </span>
        <span class="v2-l1-label" :title="t('nav.notifications')">{{ t('nav.notifications') }}</span>
        <span v-if="unreadCount > 0" class="v2-l1-badge" aria-live="assertive">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
      </button>

      <button
        v-if="isAdmin"
        class="v2-l1-item"
        :class="{ active: l1Context === 'admin' }"
        :aria-label="t('nav.admin')"
        @click="emit('setL1Context', 'admin')"
      >
        <span class="v2-l1-icon-wrap">
          <span v-if="l1Context === 'admin'" class="v2-l1-glow" aria-hidden="true" />
          <CuIcon name="grid-dots" :size="18" class="v2-l1-icon" />
        </span>
        <span class="v2-l1-label" :title="t('nav.admin')">{{ t('nav.admin') }}</span>
        <span v-if="pendingUsers > 0" class="v2-l1-badge" aria-live="assertive">{{ pendingUsers > 99 ? '99+' : pendingUsers }}</span>
      </button>

      <div class="v2-l1-spacer" />

      <!-- 静态视觉：参考稿底部是 Invite，我们没有邀请通道，保留剪影但不做成按钮 -->
      <div class="v2-l1-item v2-l1-static" aria-hidden="true" tabindex="-1">
        <span class="v2-l1-icon-wrap"><CuIcon name="user-plus" :size="18" class="v2-l1-icon" /></span>
        <span class="v2-l1-label">Invite</span>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* L1 轨道：67 = 5px 左沟槽 + 55px 黑面板 + 6px 右沟槽 + 1px 接缝（border-right 归本元素） */
.v2-l1 {
  width: var(--cu-rail-width);
  min-width: var(--cu-rail-width);
  box-sizing: border-box;
  background: var(--cu-nav-rail-bg);
  border-right: 1px solid var(--cu-seam-1);
  padding: 0 6px 4px 5px;
  z-index: var(--v2-z-sticky);
  display: flex;
}

.v2-l1-panel {
  width: var(--cu-l1-panel-width);
  border-radius: var(--cu-l1-panel-radius);
  background: var(--cu-l1-panel-bg);
  box-shadow: 0 0 4px rgba(0, 0, 0, .14);
  /* overflow 是辉光的裁切边界：blur 若配错，光晕会溢出 55px 面板糊到标签 */
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px 0;
}

.v2-l1-item {
  position: relative;
  width: 100%;
  height: 66px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 11px 0;
  box-sizing: border-box;
  border: none;
  background: transparent;
  color: var(--cu-l1-item);
  cursor: pointer;
  font-family: var(--cu-font-nav);
  transition: color .12s ease;
}
.v2-l1-item:hover { color: var(--cu-l1-item-hover); }
.v2-l1-item.active { color: var(--cu-l1-item-active); }

.v2-l1-icon-wrap { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.v2-l1-icon { position: relative; z-index: 1; display: block; }
/* 18px 图标 + 上下各 11px = 40px 光晕，与图标同心 */
.v2-l1-glow {
  position: absolute;
  inset: -11px;
  border-radius: 50%;
  background: var(--cu-l1-glow);
  filter: blur(var(--cu-l1-glow-blur));
  opacity: .9;
  z-index: 0;
}

.v2-l1-label {
  font-size: 11px;
  line-height: 16px;
  font-weight: 500;
  max-width: 49px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.v2-l1-item.active .v2-l1-label { font-weight: 600; }

.v2-l1-spacer { flex: 1; }

/* 徽标定位基准是面板（按钮已铺满面板宽度），距面板右缘 6px。
   写成相对图标盒的 right:-6px 会被面板 overflow:hidden 裁掉。 */
.v2-l1-badge {
  position: absolute;
  top: 5px;
  right: 6px;
  min-width: 16px;
  height: 16px;
  border-radius: 8px;
  background: var(--cu-l1-badge);
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  line-height: 1;
}

.v2-l1-static { cursor: default; pointer-events: none; }

@media (max-width: 768px) {
  .v2-l1 { display: none !important; }
}
</style>

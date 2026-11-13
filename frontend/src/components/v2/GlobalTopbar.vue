<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import CuIcon from './CuIcon.vue'
import { i18n } from '../../i18n'
import type { ThemeMode, Locale } from '../../stores/preferences'

const { t } = i18n.global

const props = defineProps<{
  avatarOpen: boolean
  username: string
  isAdmin: boolean
  theme: ThemeMode
  locale: Locale
}>()

const emit = defineEmits<{
  toggleTheme: []
  toggleLocale: []
  toggleAvatar: []
  closeAvatar: []
  changePassword: []
  logout: []
  openSearch: []
  openWorkspace: []
}>()

const root = ref<HTMLElement | null>(null)

// 点击外部关闭头像下拉：状态归 AppShellV2，这里只负责判定点击落在组件外
function onDocPointerDown(e: PointerEvent) {
  if (!props.avatarOpen) return
  if (root.value && !root.value.contains(e.target as Node)) emit('closeAvatar')
}

onMounted(() => document.addEventListener('pointerdown', onDocPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointerDown))
</script>

<template>
  <header ref="root" class="v2-global-topbar" role="banner">
    <div class="v2-tb-left">
      <button class="v2-ws-pill" :aria-label="t('nav.workspace')" @click="emit('openWorkspace')">
        <img class="v2-ws-mark" src="/brand-mark.svg" alt="" aria-hidden="true" />
        <span class="v2-ws-name">{{ t('brand.name') }}</span>
        <!-- 静态：单 workspace，没有切换目标，不做成按钮 -->
        <span class="v2-static" aria-hidden="true" tabindex="-1"><CuIcon name="chevron-down" :size="10" /></span>
      </button>
      <!-- 静态装饰。刻意不挂 title：本元素 pointer-events: none，浏览器不会显示提示，
           留着只会误导维护者以为有 tooltip。 -->
      <span class="v2-static v2-tb-cal" aria-hidden="true" tabindex="-1">
        <CuIcon name="calendar" :size="16" />
      </span>
    </div>

    <button class="v2-search-pill" :aria-label="t('nav.search')" @click="emit('openSearch')">
      <CuIcon name="search" :size="16" class="v2-search-icon" />
      <span class="v2-search-text">{{ t('nav.searchPill') }}</span>
      <span class="v2-search-kbd">⌘K</span>
      <span class="v2-search-anchor" aria-hidden="true"><CuIcon name="gem" :size="14" /></span>
    </button>

    <div class="v2-tb-right">
      <button
        class="v2-tb-icon"
        :aria-label="theme === 'dark' ? t('prefs.light') : t('prefs.dark')"
        :title="theme === 'dark' ? t('prefs.light') : t('prefs.dark')"
        @click="emit('toggleTheme')"
      >
        <CuIcon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
      </button>
      <button class="v2-tb-icon" :aria-label="t('prefs.language')" :title="t('prefs.language')" @click="emit('toggleLocale')">
        <CuIcon name="globe" :size="16" />
      </button>
      <!-- 侧栏收折入口移回 L2 头部（ContextSidebar）。在顶栏里 panel-left 字形在 16px 下
           容易被读成「二级菜单的搜索框」，而它位于侧栏内部时语义自然得多。 -->

      <button
        class="v2-tb-avatar-btn"
        :class="{ active: avatarOpen }"
        :aria-label="username"
        :aria-expanded="avatarOpen"
        aria-haspopup="menu"
        @click="emit('toggleAvatar')"
      >
        <span class="v2-avatar">
          {{ (username || '?')[0].toUpperCase() }}
          <span class="v2-avatar-dot" aria-hidden="true" />
        </span>
        <CuIcon name="chevron-down" :size="10" class="v2-avatar-caret" />
      </button>
    </div>

    <Transition name="v2-popover">
      <div v-if="avatarOpen" class="v2-avatar-popover" role="menu">
        <div class="v2-pop-head">
          <span class="v2-pop-avatar">{{ (username || '?')[0].toUpperCase() }}</span>
          <span>
            <span class="v2-pop-name">{{ username }}</span>
            <span class="v2-pop-role">{{ isAdmin ? t('account.admin') : t('account.member') }}</span>
          </span>
        </div>
        <button class="v2-pop-item" role="menuitem" @click="emit('changePassword')">
          <span>{{ t('account.changePassword') }}</span>
        </button>
        <button class="v2-pop-item v2-pop-logout" role="menuitem" @click="emit('logout')">
          <CuIcon name="logout" :size="15" /> <span>{{ t('account.logout') }}</span>
        </button>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
/* 三列网格：中间列 auto 且两侧 1fr 等宽，搜索胶囊因此落在视口正中，
   而不是 flex 剩余空间的中点（左右簇不等宽会偏约 12px）。 */
.v2-global-topbar {
  height: var(--cu-topbar-height);
  min-height: var(--cu-topbar-height);
  flex-shrink: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 12px;
  background: var(--cu-topbar-bg);
  border-bottom: 1px solid var(--cu-seam-1);
  font-family: var(--cu-font-nav);
  position: relative;
  /* 必须高于副标题栏/L1/L2 的 15，否则头像下拉会被副标题栏盖住：
     面板的 z-index 困在本元素创建的层叠上下文内部出不去。见 style.css --cu-z-topbar。 */
  z-index: var(--cu-z-topbar);
}

.v2-tb-left { grid-column: 1; justify-self: start; display: flex; align-items: center; gap: 10px; min-width: 0; }
.v2-tb-right { grid-column: 3; justify-self: end; display: flex; align-items: center; }

.v2-ws-pill {
  display: flex; align-items: center; gap: 8px;
  width: 138px; height: 30px; padding: 0 8px;
  border: none; border-radius: 6px; background: var(--cu-pill-bg);
  cursor: pointer; transition: background .12s; flex-shrink: 0;
}
.v2-ws-pill:hover { background: var(--cu-nav-hover-bg); }
.v2-ws-mark { width: 18px; height: 18px; border-radius: 5px; flex-shrink: 0; display: block; }
.v2-ws-name {
  font-size: 14px; font-weight: 500; color: var(--cu-nav-text-strong);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; text-align: left;
}

/* 静态视觉元素：不响应 hover、不可聚焦、不改变指针形状 */
.v2-static {
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--cu-nav-muted-icon); cursor: default; pointer-events: none;
}

.v2-search-pill {
  grid-column: 2; justify-self: center;
  display: flex; align-items: center; gap: 8px;
  width: 316px; height: 32px; padding: 0 12px;
  border: 1px solid var(--cu-nav-field-border); border-radius: 16px;
  background: var(--cu-nav-field-bg); color: var(--cu-nav-muted-icon);
  cursor: pointer; transition: border-color .12s;
}
.v2-search-pill:hover { border-color: var(--cu-nav-text-faint); }
.v2-search-icon { flex-shrink: 0; }
.v2-search-text { font-size: 14px; color: var(--cu-nav-muted-icon); white-space: nowrap; }
.v2-search-kbd { font-size: 12px; color: var(--cu-nav-muted-icon); opacity: .75; font-family: inherit; }
.v2-search-anchor {
  margin-left: auto; display: inline-flex; align-items: center;
  color: var(--cu-search-anchor); flex-shrink: 0;
}

.v2-tb-icon {
  width: var(--cu-icon-slot); height: var(--cu-icon-slot);
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; color: var(--cu-nav-muted-icon);
  border-radius: 6px; cursor: pointer; padding: 0; transition: background .12s, color .12s;
}
.v2-tb-icon:hover { background: var(--cu-nav-hover-bg); color: var(--cu-nav-text-strong); }

.v2-tb-avatar-btn {
  display: inline-flex; align-items: center; gap: 2px;
  border: none; background: transparent; cursor: pointer; padding: 0 0 0 4px;
  border-radius: 6px; height: var(--cu-icon-slot);
}
.v2-tb-avatar-btn:hover, .v2-tb-avatar-btn.active { background: var(--cu-nav-hover-bg); }
.v2-avatar {
  position: relative; width: 25px; height: 25px; border-radius: 50%;
  background: var(--cu-avatar-bg); color: #fff;
  font-size: 11px; font-weight: 600;
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.v2-avatar-dot {
  position: absolute; right: -1px; bottom: -1px;
  width: 7px; height: 8px; border-radius: 50%;
  background: var(--cu-presence-dot); border: 1px solid var(--cu-topbar-bg);
}
.v2-avatar-caret { color: var(--cu-nav-muted-icon); flex-shrink: 0; }

.v2-avatar-popover {
  position: absolute; top: 100%; right: 8px; margin-top: 4px;
  width: 200px; padding: 8px 0;
  background: var(--v2-card-bg); border: 1px solid var(--cu-nav-field-border);
  border-radius: var(--v2-radius); box-shadow: 0 8px 30px rgba(0,0,0,.16);
  z-index: var(--cu-z-topbar-popover);
}
.v2-pop-head { display: flex; align-items: center; gap: 10px; padding: 10px 14px 12px; border-bottom: 1px solid var(--cu-seam-1); }
.v2-pop-avatar {
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  background: var(--cu-avatar-bg); color: #fff;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 600;
}
.v2-pop-name { display: block; font-size: 13.5px; font-weight: 600; color: var(--cu-nav-text-strong); }
.v2-pop-role { display: block; font-size: 12px; color: var(--cu-nav-text); margin-top: 1px; }
.v2-pop-item {
  display: flex; align-items: center; gap: 8px; width: 100%;
  padding: 9px 14px; border: none; background: transparent; text-align: left;
  font-size: 13px; color: var(--cu-nav-text-strong); cursor: pointer; transition: background .1s;
}
.v2-pop-item:hover { background: var(--cu-nav-hover-bg); }
.v2-pop-logout { color: var(--v2-error); }

.v2-popover-enter-active { transition: opacity .12s, transform .12s ease-out; }
.v2-popover-leave-active { transition: opacity .1s, transform .1s ease-in; }
.v2-popover-enter-from, .v2-popover-leave-to { opacity: 0; transform: scale(.95); }

@media (max-width: 768px) {
  /* 移动端只保留品牌块与右侧控件，搜索入口走底部 tab，避免与内容挤在一行 */
  .v2-search-pill { display: none; }
  .v2-tb-cal { display: none; }
  .v2-ws-pill { width: auto; }
  .v2-ws-name { display: none; }
  .v2-tb-icon { width: 44px; height: 44px; }
  .v2-tb-avatar-btn { height: 44px; }
}
</style>

<script setup lang="ts">
import { PanelLeftClose, Sun, Moon, LogOut } from 'lucide-vue-next'
import type { ThemeMode, Locale } from '../stores/preferences'
import { i18n } from '../i18n'

const { t } = i18n.global

defineProps<{
  sidebarCollapsed: boolean
  offline: boolean
  breadcrumbs: { label: string; route?: string }[]
  avatarOpen: boolean
  username: string
  isAdmin: boolean
  theme: ThemeMode
  locale: Locale
}>()

const emit = defineEmits<{
  toggleSidebar: []
  navigateTo: [path: string]
  toggleTheme: []
  toggleLocale: []
  toggleAvatar: []
  changePassword: []
  logout: []
}>()
</script>

<template>
  <header class="v2-topbar">
    <div class="v2-topbar-left">
      <button
        v-if="sidebarCollapsed"
        class="v2-topbar-hamburger"
        @click="emit('toggleSidebar')"
        aria-label="展开侧栏"
      >
        <PanelLeftClose :size="18" />
      </button>
      <nav class="v2-breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(crumb, idx) in breadcrumbs" :key="idx">
          <span v-if="idx > 0" class="v2-breadcrumb-sep">/</span>
          <a v-if="crumb.route" class="v2-breadcrumb-link" href="#" @click.prevent="emit('navigateTo', crumb.route)">{{ crumb.label }}</a>
          <span v-else class="v2-breadcrumb-current">{{ crumb.label }}</span>
        </template>
      </nav>
    </div>
    <div v-if="offline" class="v2-offline-bar" role="status">你当前处于离线状态</div>
    <div class="v2-topbar-right">
      <button
        class="v2-topbar-icon-btn"
        :aria-label="theme === 'dark' ? t('prefs.light') : t('prefs.dark')"
        @click="emit('toggleTheme')"
      >
        <Moon v-if="theme === 'dark'" :size="16" />
        <Sun v-else :size="16" />
      </button>
      <button
        class="v2-topbar-locale-btn"
        :aria-label="t('prefs.language')"
        @click="emit('toggleLocale')"
      >
        {{ locale === 'zh' ? 'EN' : '中' }}
      </button>
      <button
        class="v2-topbar-avatar-btn"
        :class="{ active: avatarOpen }"
        :aria-label="t('account.changePassword')"
        @click="emit('toggleAvatar')"
      >
        <div class="v2-topbar-avatar">{{ (username || '?')[0].toUpperCase() }}</div>
      </button>
    </div>

    <Transition name="v2-popover">
      <div v-if="avatarOpen" class="v2-avatar-popover" role="menu">
        <div class="v2-avatar-popover-header">
          <div class="v2-avatar-popover-avatar">{{ (username || '?')[0].toUpperCase() }}</div>
          <div>
            <div class="v2-avatar-popover-name">{{ username }}</div>
            <div class="v2-avatar-popover-role">{{ isAdmin ? t('account.admin') : t('account.member') }}</div>
          </div>
        </div>
        <button class="v2-avatar-popover-item" role="menuitem" @click="emit('changePassword')">
          <span>{{ t('account.changePassword') }}</span>
        </button>
        <button class="v2-avatar-popover-item v2-avatar-popover-logout" role="menuitem" @click="emit('logout')">
          <LogOut :size="15" /> <span>{{ t('account.logout') }}</span>
        </button>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.v2-topbar { height: var(--v2-topbar-height); min-height: var(--v2-topbar-height); background: var(--v2-l2-bg); background: color-mix(in srgb, var(--v2-l2-bg) 88%, transparent); box-shadow: 0 1px 0 var(--v2-divider), 0 2px 8px rgba(0,0,0,.03); border-bottom: none; display: flex; align-items: center; padding: 0 20px; gap: 12px; z-index: var(--v2-z-sticky); position: relative; }
.v2-topbar-left { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.v2-topbar-hamburger { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: 6px; transition: background .12s; flex-shrink: 0; }
.v2-topbar-hamburger:hover { background: var(--v2-btn-ghost-hover); color: var(--v2-ink); }
.v2-breadcrumbs { display: flex; align-items: center; gap: 6px; font-size: 13px; overflow: hidden; }
.v2-breadcrumb-link { color: var(--v2-ink-2); text-decoration: none; white-space: nowrap; transition: color .12s; }
.v2-breadcrumb-link:hover { color: var(--v2-ink); }
.v2-breadcrumb-current { color: var(--v2-ink); font-weight: 500; white-space: nowrap; }
.v2-breadcrumb-sep { color: var(--v2-border); font-size: 14px; flex-shrink: 0; }
.v2-offline-bar { font-size: 12px; color: var(--v2-warning); background: var(--v2-warning-bg); padding: 3px 10px; border-radius: var(--v2-radius-sm); white-space: nowrap; }

.v2-topbar-right { display: flex; align-items: center; gap: 4px; flex-shrink: 0; margin-left: auto; }
.v2-topbar-icon-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: 6px; transition: background .12s, color .12s; flex-shrink: 0; }
.v2-topbar-icon-btn:hover { background: var(--v2-btn-ghost-hover); color: var(--v2-ink); }
.v2-topbar-locale-btn { height: 28px; padding: 0 7px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: 6px; font-size: 12px; font-weight: 600; transition: background .12s, color .12s; flex-shrink: 0; }
.v2-topbar-locale-btn:hover { background: var(--v2-btn-ghost-hover); color: var(--v2-ink); }
.v2-topbar-avatar-btn { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; cursor: pointer; border-radius: 6px; flex-shrink: 0; transition: background .12s; }
.v2-topbar-avatar-btn:hover { background: var(--v2-btn-ghost-hover); }
.v2-topbar-avatar-btn.active { background: var(--v2-btn-ghost-hover); }
.v2-topbar-avatar { width: 26px; height: 26px; border-radius: 50%; background: var(--v2-accent); color: #fff; font-size: 12px; font-weight: 600; display: flex; align-items: center; justify-content: center; }

.v2-avatar-popover { position: absolute; top: 100%; right: 8px; width: 200px; background: var(--v2-card-bg); border: 1px solid var(--v2-border); border-radius: var(--v2-radius); box-shadow: 0 8px 30px rgba(0,0,0,.12); z-index: 30; padding: 8px 0; margin-top: 4px; }
.v2-avatar-popover-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px 12px; border-bottom: 1px solid var(--v2-border); }
.v2-avatar-popover-avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--v2-accent); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 600; flex-shrink: 0; }
.v2-avatar-popover-name { font-size: 13.5px; font-weight: 600; color: var(--v2-ink); }
.v2-avatar-popover-role { font-size: 12px; color: var(--v2-ink-2); margin-top: 1px; }
.v2-avatar-popover-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 9px 14px; border: none; background: transparent; text-align: left; font-size: 13px; color: var(--v2-ink); cursor: pointer; transition: background .1s; }
.v2-avatar-popover-item:hover { background: var(--v2-btn-ghost-hover); }
.v2-avatar-popover-logout { color: var(--v2-error); }

.v2-popover-enter-active { transition: opacity .12s, transform .12s ease-out; }
.v2-popover-leave-active { transition: opacity .1s, transform .1s ease-in; }
.v2-popover-enter-from { opacity: 0; transform: scale(.95); }
.v2-popover-leave-to { opacity: 0; transform: scale(.95); }

@media (max-width: 768px) {
  .v2-topbar { padding: 0 12px; }
}
</style>

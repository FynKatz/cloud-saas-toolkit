<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import CuIcon from './v2/CuIcon.vue'
import { i18n } from '../i18n'
import type { L1Context } from '../stores/preferences'
import type { NavGroup, NavItem, NavToolItem } from '../types/nav'

const { t } = i18n.global

const props = defineProps<{
  l1Context: L1Context
  /** 唯一真值源在 AppShellV2：桌面看 sidebarCollapsed，移动看 mobileL2Open。 */
  navVisible: boolean
  recentTools: NavToolItem[]
  favoriteTools: NavToolItem[]
  toolGroups: NavGroup[]
  adminNav: NavItem[]
  collapsedGroups: string[]
  l2SearchQuery: string
  mobileL2Open?: boolean
  isMobile?: boolean
  activeRoute: (path: string) => boolean
}>()

const emit = defineEmits<{
  navigateTo: [path: string, toolId?: string]
  toggleGroup: [name: string]
  updateL2Search: [query: string]
  closeMobileL2: []
  toggleSidebar: []
}>()

const RECENT = '__recent__'
const FAVORITES = '__favorites__'

const filteredGroups = computed(() => {
  const q = props.l2SearchQuery.trim().toLowerCase()
  if (!q) return props.toolGroups
  return props.toolGroups
    .map(g => ({ name: g.name, items: g.items.filter(item => item.name.toLowerCase().includes(q)) }))
    .filter(g => g.items.length > 0)
})

function isGroupCollapsed(name: string): boolean {
  return props.collapsedGroups.includes(name)
}

const favoritesEl = ref<HTMLElement | null>(null)

// chip 是「就地展开 + 滚过去」，不是 toggle：默认全展开，直接 toggle 会反而折叠。
// 子项在 v-if 下要到下一帧才进 DOM，必须 nextTick 之后再滚动。
async function revealFavorites() {
  if (isGroupCollapsed(FAVORITES)) emit('toggleGroup', FAVORITES)
  await nextTick()
  favoritesEl.value?.scrollIntoView({ block: 'nearest' })
}
</script>

<template>
  <div v-if="isMobile && mobileL2Open" class="v2-l2-backdrop" @click="emit('closeMobileL2')" aria-hidden="true" />
  <Transition name="v2-l2">
    <aside v-if="navVisible" class="v2-l2" role="navigation" aria-label="Context navigation">
      <div class="v2-l2-col">
      <!-- ============ 工作台 ============ -->
      <template v-if="l1Context === 'workspace'">
        <div class="v2-l2-head">
          <span class="v2-l2-title">{{ t('nav.workspace') }}</span>
          <button
            class="v2-l2-collapse-btn"
            :aria-label="t('nav.collapseSidebar')"
            :title="t('nav.collapseSidebar')"
            @click="emit('toggleSidebar')"
          >
            <CuIcon name="panel-left" :size="16" />
          </button>
          <span class="v2-static v2-l2-create" aria-hidden="true" tabindex="-1">+ Create</span>
          <button class="v2-l2-mobile-close" :aria-label="t('common.close')" @click="emit('closeMobileL2')">
            <CuIcon name="x" :size="16" />
          </button>
        </div>

        <div class="v2-l2-search">
          <span class="v2-l2-search-icon"><CuIcon name="search" :size="16" /></span>
          <input
            :value="l2SearchQuery"
            class="v2-l2-search-input"
            :placeholder="t('nav.searchPlaceholder')"
            :aria-label="t('nav.searchPlaceholder')"
            @input="emit('updateL2Search', ($event.target as HTMLInputElement).value)"
          />
        </div>

        <div class="v2-l2-scroll">
          <button
            v-if="!l2SearchQuery.trim()"
            class="v2-l2-item"
            :class="{ active: activeRoute('/') }"
            @click="emit('navigateTo', '/')"
          >
            <CuIcon name="home" :size="16" class="v2-l2-item-icon" />
            <span class="v2-l2-item-text">{{ t('nav.overview') }}</span>
          </button>

          <div v-if="recentTools.length" class="v2-l2-group">
            <div class="v2-l2-group-head">
              <button class="v2-l2-group-toggle" :aria-expanded="!isGroupCollapsed(RECENT)" @click="emit('toggleGroup', RECENT)">
                <span>{{ t('nav.recent') }}</span>
              </button>
            </div>
            <div v-if="!isGroupCollapsed(RECENT)" class="v2-l2-subitems" role="list">
              <button
                v-for="item in recentTools"
                :key="item.id"
                class="v2-l2-item v2-l2-subitem"
                :class="{ active: activeRoute(item.route) }"
                role="listitem"
                @click="emit('navigateTo', item.route, item.id)"
              >
                <CuIcon :name="item.icon" :size="16" class="v2-l2-item-icon" />
                <span class="v2-l2-item-text">
                  {{ item.name }}<span v-if="item.category" class="v2-l2-item-faint"> - {{ item.category }}</span>
                </span>
                <CuIcon v-if="item.dataScope === 'private'" name="lock" :size="12" class="v2-l2-item-lock" />
              </button>
            </div>
          </div>

          <div v-if="favoriteTools.length" ref="favoritesEl" class="v2-l2-group">
            <div class="v2-l2-group-head">
              <button class="v2-l2-group-toggle" :aria-expanded="!isGroupCollapsed(FAVORITES)" @click="emit('toggleGroup', FAVORITES)">
                <span>{{ t('nav.favorites') }}</span>
              </button>
            </div>
            <div v-if="!isGroupCollapsed(FAVORITES)" class="v2-l2-subitems" role="list">
              <button
                v-for="item in favoriteTools"
                :key="item.id"
                class="v2-l2-item v2-l2-subitem"
                :class="{ active: activeRoute(item.route) }"
                role="listitem"
                @click="emit('navigateTo', item.route, item.id)"
              >
                <CuIcon name="gem" :size="16" class="v2-l2-item-icon" />
                <span class="v2-l2-item-text">
                  {{ item.name }}<span v-if="item.category" class="v2-l2-item-faint"> - {{ item.category }}</span>
                </span>
                <CuIcon v-if="item.dataScope === 'private'" name="lock" :size="12" class="v2-l2-item-lock" />
              </button>
            </div>
          </div>

          <div class="v2-l2-divider" role="presentation" />

          <div v-for="group in filteredGroups" :key="group.name" class="v2-l2-group">
            <div class="v2-l2-group-head">
              <button class="v2-l2-group-toggle" :aria-expanded="!isGroupCollapsed(group.name)" @click="emit('toggleGroup', group.name)">
                <span>{{ group.name }}</span>
              </button>
              <!-- 静态：新增工具要改 migration + 路由 + 视图，不是用户可执行动作 -->
              <span class="v2-static v2-l2-group-plus" aria-hidden="true" tabindex="-1">
                <CuIcon name="plus" :size="14" />
              </span>
            </div>
            <div v-if="!isGroupCollapsed(group.name)" class="v2-l2-subitems" role="list">
              <button
                v-for="item in group.items"
                :key="item.id"
                class="v2-l2-item v2-l2-subitem"
                :class="{ active: activeRoute(item.route) }"
                role="listitem"
                @click="emit('navigateTo', item.route, item.id)"
              >
                <CuIcon :name="item.icon" :size="16" class="v2-l2-item-icon" />
                <!-- 分组行不加弱化副标题：整组同分类，重复分类名只会让一列发虚。
                     参考稿的 " - X" 后缀只出现在跨分类的列表（最近使用 / 收藏）里。 -->
                <span class="v2-l2-item-text">{{ item.name }}</span>
                <CuIcon v-if="item.dataScope === 'private'" name="lock" :size="12" class="v2-l2-item-lock" />
              </button>
            </div>
          </div>

          <!-- 静态：参考稿整块只有一条 ••• More，不是每个分组一条。
               必须留在同一个滚动容器内，另开一层会多出第二个滚动区并打乱行距。 -->
          <div class="v2-l2-item v2-l2-more" aria-hidden="true" tabindex="-1">
            <CuIcon name="dots" :size="16" class="v2-l2-item-icon" />
            <span class="v2-l2-item-text">More</span>
          </div>
        </div>

        <div v-if="favoriteTools.length" class="v2-l2-chip-row">
          <button class="v2-l2-chip" @click="revealFavorites">
            <CuIcon name="flag" :size="14" />
            <span>{{ t('nav.favoritesCount', { count: favoriteTools.length }) }}</span>
          </button>
        </div>
      </template>

      <!-- ============ 管理台 ============ -->
      <template v-else-if="l1Context === 'admin'">
        <div class="v2-l2-head">
          <span class="v2-l2-title">{{ t('nav.admin') }}</span>
          <button
            class="v2-l2-collapse-btn"
            :aria-label="t('nav.collapseSidebar')"
            :title="t('nav.collapseSidebar')"
            @click="emit('toggleSidebar')"
          >
            <CuIcon name="panel-left" :size="16" />
          </button>
          <button class="v2-l2-mobile-close" :aria-label="t('common.close')" @click="emit('closeMobileL2')">
            <CuIcon name="x" :size="16" />
          </button>
        </div>
        <div class="v2-l2-scroll">
          <template v-for="item in adminNav" :key="item.id">
            <button class="v2-l2-item" :class="{ active: activeRoute(item.route) }" @click="emit('navigateTo', item.route)">
              <CuIcon :name="item.icon" :size="16" class="v2-l2-item-icon" />
              <span class="v2-l2-item-text">{{ t(item.nameKey) }}</span>
            </button>
            <div v-if="item.children" class="v2-l2-subitems" role="list">
              <button
                v-for="child in item.children"
                :key="child.id"
                class="v2-l2-item v2-l2-subitem"
                :class="{ active: activeRoute(child.route) }"
                role="listitem"
                @click="emit('navigateTo', child.route)"
              >
                <CuIcon name="folder" :size="16" class="v2-l2-item-icon" />
                <span class="v2-l2-item-text">{{ t(child.nameKey) }}</span>
              </button>
            </div>
          </template>
        </div>
      </template>

      <!-- ============ 通知 ============ -->
      <template v-else>
        <div class="v2-l2-head">
          <span class="v2-l2-title">{{ t('nav.notifications') }}</span>
          <button
            class="v2-l2-collapse-btn"
            :aria-label="t('nav.collapseSidebar')"
            :title="t('nav.collapseSidebar')"
            @click="emit('toggleSidebar')"
          >
            <CuIcon name="panel-left" :size="16" />
          </button>
          <button class="v2-l2-mobile-close" :aria-label="t('common.close')" @click="emit('closeMobileL2')">
            <CuIcon name="x" :size="16" />
          </button>
        </div>
        <div class="v2-l2-scroll">
          <button class="v2-l2-item" :class="{ active: activeRoute('/notifications') }" @click="emit('navigateTo', '/notifications')">
            <CuIcon name="bell" :size="16" class="v2-l2-item-icon" />
            <span class="v2-l2-item-text">{{ t('nav.notificationCenter') }}</span>
          </button>
        </div>
      </template>
      </div>
    </aside>
  </Transition>
</template>

<style scoped>
/*
 * 宽度分解（box-sizing: border-box，由 Tailwind preflight 全局提供）：
 *   281 外层 = 269 列（含 1px 右边框）+ 12px 沟槽 padding
 *   269 列  = 268 内容 + 1px border-right  → 边框正好落在 x335，与参考稿一致
 *   268 内容 - padding 左 8 右 9           → 行命中区恒为 251
 *
 * 沟槽必须由 padding 提供，不能指望滚动条占位：这台 Chromium 上
 * ::-webkit-scrollbar { width } 不保留布局宽度（实测 clientWidth 等于全宽），
 * 依赖它会让行宽从 251 变成 263。滚动条因此显式隐藏，参考稿沟槽里本来也没有滑块。
 */
.v2-l2 {
  width: var(--cu-l2-width);
  min-width: var(--cu-l2-width);
  box-sizing: border-box;
  background: var(--cu-nav-rail-bg);
  padding-right: var(--cu-l2-gutter);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--cu-font-nav);
}
.v2-l2-col {
  width: calc(var(--cu-l2-inner) + 1px);
  box-sizing: border-box;
  border-right: 1px solid var(--cu-seam-2);
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}
.v2-l2-enter-active, .v2-l2-leave-active { transition: width .25s ease-out, opacity .15s ease-out; }
.v2-l2-enter-from, .v2-l2-leave-to { opacity: 0; }

.v2-l2-head {
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 9px 0 14px;
}
.v2-l2-title { font-size: 16px; font-weight: 600; color: var(--cu-nav-text-strong); flex: 1; min-width: 0; }
/* 收折入口。放在标题与黑胶囊之间，黑胶囊仍是最后一个子元素，
   因此右缘照旧与行命中区对齐（实测 326），不会在右侧留空洞。 */
.v2-l2-collapse-btn {
  width: 28px; height: 28px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border: none; background: transparent; border-radius: 6px;
  color: var(--cu-nav-muted-icon); cursor: pointer; padding: 0;
  transition: background .12s, color .12s;
}
.v2-l2-collapse-btn:hover { background: var(--cu-nav-hover-bg); color: var(--cu-nav-text-strong); }
.v2-l2-create {
  width: 82px; height: 29px; flex-shrink: 0;
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px;
  background: var(--cu-black-pill-bg);
  color: var(--cu-black-pill-text);
  border: 1px solid var(--cu-black-pill-border);
  font-size: 13px; font-weight: 600;
  /* 静态弱化只在亮色生效（--cu-static-opacity 暗色为 1）。
     暗色靠描边可见 + 非实心表达「不是按钮」，降透明度会让它彻底消失。 */
  opacity: var(--cu-static-opacity);
}

.v2-l2-search { position: relative; flex-shrink: 0; padding: 0 9px 6px 8px; }
.v2-l2-search-icon {
  position: absolute; left: 18px; top: 14px;
  color: var(--cu-nav-muted-icon); display: inline-flex; pointer-events: none;
}
.v2-l2-search-input {
  width: 100%; height: 28px; box-sizing: border-box;
  padding: 0 10px 0 30px;
  border: 1px solid var(--cu-nav-field-border); border-radius: 6px;
  background: var(--cu-nav-field-bg);
  font-size: 14px; color: var(--cu-nav-text); outline: none;
  transition: border-color .15s;
}
.v2-l2-search-input:focus { border-color: var(--v2-accent); }
.v2-l2-search-input::placeholder { color: var(--cu-nav-muted-icon); }

.v2-l2-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: scroll;
  padding: 0 9px 12px 8px;
  scrollbar-width: none;
}
.v2-l2-scroll::-webkit-scrollbar { width: 0; height: 0; display: none; }

/* 行：命中区 251 宽、高 29、pitch 32、radius 6 */
.v2-l2-item {
  display: flex; align-items: center;
  width: 100%; height: var(--cu-nav-row-height);
  /* 参考稿是 pitch 32 里画 29 高的胶囊：上下各留 1.5px，并用 background-clip 只让
     内容盒吃背景，否则整行 32px 都会上色，比原稿高 3px。
     左右仍是 10px，所以文字左界仍落在 x113。 */
  padding: 1.5px 10px; box-sizing: border-box;
  background-clip: content-box;
  border: none; background: transparent; text-align: left;
  border-radius: 6px; cursor: pointer;
  font-size: 14px; color: var(--cu-nav-text);
  transition: background .12s, color .12s;
}
.v2-l2-item:hover { background: var(--cu-nav-hover-bg); }
.v2-l2-item.active { background: var(--cu-nav-active-bg); color: var(--cu-nav-text-strong); font-weight: 500; }
.v2-l2-item-icon { flex-shrink: 0; margin-right: 12px; }
.v2-l2-item-text {
  flex: 1; min-width: 0;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.v2-l2-item-faint { color: var(--cu-nav-text-faint); }
/* 私有锁紧贴名字，不是右对齐 */
.v2-l2-item-lock { flex-shrink: 0; margin-left: 4px; color: var(--cu-nav-text-faint); }

/* 子项：引导线落在父图标中心（相对命中区左缘 17px），随组起止不贯穿列表 */
.v2-l2-subitems { position: relative; padding-left: 34px; }
.v2-l2-subitems::before {
  content: '';
  position: absolute;
  left: 17px;
  top: 0;
  bottom: 0;
  width: 1px;
  background: var(--cu-seam-2);
}
.v2-l2-subitem { padding-left: 0; }

.v2-l2-group { margin-top: 4px; }
.v2-l2-group-head {
  display: flex; align-items: center;
  height: var(--cu-nav-row-height);
  padding-left: 8px;
}
.v2-l2-group-toggle {
  flex: 1; min-width: 0;
  display: flex; align-items: center;
  height: 100%; padding: 0;
  border: none; background: transparent; text-align: left;
  font-size: 13px; font-weight: 400; color: var(--cu-nav-text);
  cursor: pointer; border-radius: 6px;
  transition: color .12s;
}
.v2-l2-group-toggle:hover { color: var(--cu-nav-text-strong); }
.v2-l2-group-plus {
  width: 21px; height: 21px; border-radius: 6px;
  background: var(--cu-pill-bg);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--cu-nav-text); flex-shrink: 0;
}

/* 分隔线内缩 13（相对 268 内层），不是通栏 */
.v2-l2-divider { height: 1px; background: var(--cu-seam-1); margin: 8px 5px; }

.v2-l2-more { color: var(--cu-nav-text-faint); font-size: 13px; }

.v2-l2-chip-row { flex-shrink: 0; padding: 0 9px 12px 8px; }
.v2-l2-chip {
  min-width: 101px; height: 26px;
  display: inline-flex; align-items: center; gap: 6px;
  padding: 0 8px; box-sizing: border-box;
  border: 1px solid var(--cu-nav-field-border); border-radius: 6px;
  background: var(--cu-nav-field-bg); color: var(--cu-nav-text);
  font-size: 13px; cursor: pointer;
  transition: background .12s;
}
.v2-l2-chip:hover { background: var(--cu-nav-hover-bg); }

.v2-static { cursor: default; pointer-events: none; }
.v2-l2-mobile-close { display: none; }

@media (max-width: 768px) {
  .v2-l2 {
    position: fixed;
    /* 全宽顶栏在上，抽屉必须让出它的高度，否则盖住搜索胶囊与头像 */
    top: var(--cu-topbar-height);
    left: 0;
    bottom: var(--cu-mobile-tabbar-height);
    width: var(--cu-l2-width);
    min-width: var(--cu-l2-width);
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

  .v2-l2-create { display: none; }
  /* 移动端 L2 是抽屉，收折走头部 X；这里的按钮会与之语义打架 */
  .v2-l2-collapse-btn { display: none; }
  .v2-l2-mobile-close {
    display: inline-flex; align-items: center; justify-content: center;
    width: 44px; height: 44px; margin-right: -12px;
    border: none; background: transparent; color: var(--cu-nav-muted-icon);
    cursor: pointer; border-radius: 6px;
  }
  .v2-l2-mobile-close:hover { background: var(--cu-nav-hover-bg); }
}
</style>

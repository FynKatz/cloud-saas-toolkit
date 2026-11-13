<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { Search } from 'lucide-vue-next'
import type { Tool } from '../types/tools'

const props = defineProps<{
  open: boolean
  tools: Tool[]
  iconFor: (tool: Tool) => any
}>()

const emit = defineEmits<{
  close: []
  select: [tool: Tool]
}>()

const query = ref('')
const selectedIndex = ref(0)

const filteredTools = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return props.tools
  return props.tools.filter(t => t.name.toLowerCase().includes(q))
})

watch(() => props.open, (open) => {
  if (open) { query.value = ''; selectedIndex.value = 0; nextTick(() => inputRef.value?.focus()) }
})

const inputRef = ref<HTMLInputElement | null>(null)

watch(query, () => {
  selectedIndex.value = 0
})

function moveSelection(delta: number) {
  const total = filteredTools.value.length
  if (!total) return
  selectedIndex.value = (selectedIndex.value + delta + total) % total
}

function selectCurrent() {
  const tool = filteredTools.value[selectedIndex.value]
  if (tool) emit('select', tool)
}

function handleInputKeydown(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    moveSelection(1)
    return
  }
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    moveSelection(-1)
    return
  }
  if (e.key === 'Enter') {
    e.preventDefault()
    selectCurrent()
    return
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="v2-search-overlay">
      <div v-if="open" class="v2-search-overlay" @click.self="emit('close')">
        <div class="v2-search-palette" role="dialog" aria-modal="true" aria-label="Search tools">
          <div class="v2-search-input-wrap">
            <Search :size="18" class="v2-search-input-icon" />
            <input
              ref="inputRef"
              v-model="query"
              class="v2-search-input-main"
              placeholder="搜索工具、命令…"
              @keydown.escape="emit('close')"
              @keydown="handleInputKeydown"
            />
            <kbd class="v2-search-kbd">Esc</kbd>
          </div>
          <div class="v2-search-section">
            <template v-if="!query.trim()">
              <div class="v2-search-section-title">工具</div>
              <button
                v-for="(tool, index) in tools"
                :key="tool.id"
                class="v2-search-result"
                :class="{ 'v2-search-result-selected': index === selectedIndex }"
                @mouseenter="selectedIndex = index"
                @click="emit('select', tool)"
              >
                <component :is="iconFor(tool)" :size="16" /> <span>{{ tool.name }}</span>
                <span class="v2-search-tag">{{ tool.category }}</span>
              </button>
            </template>
            <template v-else>
              <div class="v2-search-section-title">搜索结果</div>
              <template v-for="(tool, index) in filteredTools" :key="tool.id">
                <button
                  class="v2-search-result"
                  :class="{ 'v2-search-result-selected': index === selectedIndex }"
                  @mouseenter="selectedIndex = index"
                  @click="emit('select', tool)"
                >
                  <component :is="iconFor(tool)" :size="16" /> <span>{{ tool.name }}</span>
                  <span class="v2-search-tag">{{ tool.category }}</span>
                </button>
              </template>
              <div v-if="!filteredTools.length" class="v2-search-empty">
                未找到匹配的搜索结果
              </div>
            </template>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.v2-search-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: var(--v2-z-command-palette); display: flex; justify-content: center; padding-top: 15vh; }
.v2-search-palette { width: 480px; max-height: 60vh; background: var(--v2-card-bg); border-radius: var(--v2-radius); box-shadow: 0 16px 60px rgba(0,0,0,.2); overflow: hidden; display: flex; flex-direction: column; }
.v2-search-input-wrap { display: flex; align-items: center; padding: 12px 14px; gap: 10px; border-bottom: 1px solid var(--v2-border); }
.v2-search-input-icon { color: var(--v2-ink-2); flex-shrink: 0; }
.v2-search-input-main { flex: 1; border: none; background: transparent; font-size: 15px; color: var(--v2-ink); outline: none; }
.v2-search-input-main::placeholder { color: var(--v2-ink-2); }
.v2-search-kbd { padding: 2px 7px; background: var(--v2-btn-ghost-hover); border-radius: 4px; font-size: 11px; color: var(--v2-ink-2); font-family: monospace; }

.v2-search-overlay-enter-active { transition: opacity .15s ease-out; }
.v2-search-overlay-leave-active { transition: opacity .1s ease-in; }
.v2-search-overlay-enter-from, .v2-search-overlay-leave-to { opacity: 0; }

.v2-search-section { padding: 8px 0; overflow-y: auto; }
.v2-search-section-title { padding: 4px 14px 6px; font-size: 11px; font-weight: 600; color: var(--v2-label-muted); text-transform: uppercase; letter-spacing: .5px; }
.v2-search-result { display: flex; align-items: center; gap: 10px; width: 100%; padding: 8px 14px; border: none; background: transparent; text-align: left; font-size: 13.5px; color: var(--v2-ink); cursor: pointer; transition: background .1s; }
.v2-search-result:hover { background: var(--v2-btn-ghost-hover); }
.v2-search-result-selected { background: var(--v2-accent-light); color: var(--v2-accent); }
.v2-search-result-selected .v2-search-tag { color: var(--v2-accent); }
.v2-search-tag { margin-left: auto; font-size: 11px; color: var(--v2-ink-2); background: var(--v2-btn-ghost-hover); padding: 1px 6px; border-radius: 4px; }
.v2-search-empty { padding: 20px 14px; text-align: center; font-size: 13px; color: var(--v2-ink-2); }
</style>

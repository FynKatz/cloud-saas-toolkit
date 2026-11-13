<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title: string
  side?: 'left' | 'right'
  width?: string
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="v2-drawer">
      <div v-if="open" class="v2-drawer-overlay" @click.self="$emit('close')">
        <div
          class="v2-drawer-panel"
          :class="side === 'left' ? 'v2-drawer-left' : 'v2-drawer-right'"
          :style="{ width: width || '400px' }"
          role="dialog"
          aria-modal="true"
          :aria-label="title"
        >
          <div class="v2-drawer-header">
            <h2 class="v2-drawer-title">{{ title }}</h2>
            <button class="v2-drawer-close" @click="$emit('close')" aria-label="Close">
              <X :size="18" />
            </button>
          </div>
          <div class="v2-drawer-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="v2-drawer-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.v2-drawer-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: var(--v2-z-drawer); }
.v2-drawer-panel { position: absolute; top: 0; bottom: 0; background: var(--v2-card-bg); display: flex; flex-direction: column; box-shadow: 0 0 40px rgba(0,0,0,.18); }
.v2-drawer-left { left: 0; }
.v2-drawer-right { right: 0; }
.v2-drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 18px 12px; border-bottom: 1px solid var(--v2-divider); flex-shrink: 0; }
.v2-drawer-title { font-size: 15px; font-weight: 650; color: var(--v2-ink); margin: 0; }
.v2-drawer-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: var(--v2-radius-sm); flex-shrink: 0; }
.v2-drawer-close:hover { background: var(--v2-btn-ghost-hover); color: var(--v2-ink); }
.v2-drawer-body { flex: 1; overflow-y: auto; padding: 16px 18px; }
.v2-drawer-footer { padding: 12px 18px 16px; border-top: 1px solid var(--v2-divider); display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; }

.v2-drawer-enter-active { transition: opacity .2s ease-out; }
.v2-drawer-leave-active { transition: opacity .15s ease-in; }
.v2-drawer-enter-from, .v2-drawer-leave-to { opacity: 0; }
.v2-drawer-enter-active .v2-drawer-panel { transition: transform .25s ease-out; }
.v2-drawer-leave-active .v2-drawer-panel { transition: transform .2s ease-in; }
.v2-drawer-enter-from .v2-drawer-right { transform: translateX(100%); }
.v2-drawer-leave-to .v2-drawer-right { transform: translateX(100%); }
.v2-drawer-enter-from .v2-drawer-left { transform: translateX(-100%); }
.v2-drawer-leave-to .v2-drawer-left { transform: translateX(-100%); }
</style>

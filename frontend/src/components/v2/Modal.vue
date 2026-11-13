<script setup lang="ts">
import { X } from 'lucide-vue-next'

defineProps<{
  open: boolean
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg'
}>()

defineEmits<{
  close: []
}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="v2-modal">
      <div v-if="open" class="v2-modal-overlay" @click.self="$emit('close')" role="dialog" aria-modal="true" :aria-label="title">
        <div class="v2-modal-card" :class="size === 'sm' ? 'v2-modal-sm' : size === 'lg' ? 'v2-modal-lg' : ''">
          <div class="v2-modal-header">
            <div>
              <h2 class="v2-modal-title">{{ title }}</h2>
              <p v-if="description" class="v2-modal-desc">{{ description }}</p>
            </div>
            <button class="v2-modal-close" @click="$emit('close')" aria-label="Close">
              <X :size="18" />
            </button>
          </div>
          <div class="v2-modal-body">
            <slot />
          </div>
          <div v-if="$slots.footer" class="v2-modal-footer">
            <slot name="footer" />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.v2-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: var(--v2-z-modal-backdrop); display: flex; align-items: center; justify-content: center; padding: 24px; }
.v2-modal-card { width: 100%; max-width: 480px; background: var(--v2-card-bg); border-radius: var(--v2-radius); box-shadow: 0 16px 60px rgba(0,0,0,.2); max-height: 85vh; overflow: hidden; display: flex; flex-direction: column; }
.v2-modal-sm { max-width: 380px; }
.v2-modal-lg { max-width: 640px; }
.v2-modal-header { display: flex; align-items: flex-start; justify-content: space-between; padding: 18px 20px 0; gap: 12px; flex-shrink: 0; }
.v2-modal-title { font-size: 16px; font-weight: 650; color: var(--v2-ink); margin: 0; }
.v2-modal-desc { font-size: 13px; color: var(--v2-ink-2); margin: 4px 0 0; }
.v2-modal-close { width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border: none; background: transparent; color: var(--v2-ink-2); cursor: pointer; border-radius: var(--v2-radius-sm); flex-shrink: 0; }
.v2-modal-close:hover { background: var(--v2-btn-ghost-hover); color: var(--v2-ink); }
.v2-modal-body { padding: 18px 20px 20px; overflow-y: auto; flex: 1; }
.v2-modal-footer { padding: 0 20px 20px; display: flex; gap: 8px; justify-content: flex-end; flex-shrink: 0; }

.v2-modal-enter-active { transition: opacity .15s ease-out; }
.v2-modal-leave-active { transition: opacity .1s ease-in; }
.v2-modal-enter-from, .v2-modal-leave-to { opacity: 0; }
.v2-modal-enter-active .v2-modal-card { transition: transform .2s ease-out; }
.v2-modal-leave-active .v2-modal-card { transition: transform .15s ease-in; }
.v2-modal-enter-from .v2-modal-card { transform: scale(.95) translateY(10px); }
.v2-modal-leave-to .v2-modal-card { transform: scale(.95) translateY(10px); }
</style>

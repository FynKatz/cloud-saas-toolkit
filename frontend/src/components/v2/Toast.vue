<script setup lang="ts">
import { ref } from 'vue'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-vue-next'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
}

const toasts = ref<ToastMessage[]>([])
const ICON_MAP: Record<string, any> = { success: CheckCircle, error: AlertCircle, warning: AlertTriangle, info: Info }
const TYPE_CLASS: Record<string, string> = {
  success: 'v2-toast-success',
  error: 'v2-toast-error',
  warning: 'v2-toast-warning',
  info: 'v2-toast-info',
}

let counter = 0
function add(toast: Omit<ToastMessage, 'id'>): string {
  const id = `toast-${++counter}-${Date.now()}`
  toasts.value.push({ ...toast, id })
  const dur = toast.duration ?? 4000
  if (dur > 0) setTimeout(() => remove(id), dur)
  return id
}

function remove(id: string) {
  toasts.value = toasts.value.filter(t => t.id !== id)
}

defineExpose({ add, remove })
</script>

<template>
  <Teleport to="body">
    <TransitionGroup name="v2-toast" tag="div" class="v2-toast-container" aria-live="polite">
      <div
        v-for="t in toasts"
        :key="t.id"
        class="v2-toast-item"
        :class="TYPE_CLASS[t.type]"
        role="alert"
      >
        <component :is="ICON_MAP[t.type]" :size="16" class="v2-toast-icon" />
        <div class="v2-toast-body">
          <span class="v2-toast-title">{{ t.title }}</span>
          <span v-if="t.message" class="v2-toast-message">{{ t.message }}</span>
        </div>
        <button class="v2-toast-close" @click="remove(t.id)" aria-label="Close">
          <X :size="14" />
        </button>
      </div>
    </TransitionGroup>
  </Teleport>
</template>

<style scoped>
/* 全宽顶栏在 z-index 15，Toast 在 80：top 必须让出顶栏高度，否则正好压在主题/语言/头像上 */
.v2-toast-container { position: fixed; top: calc(var(--cu-topbar-height) + 12px); right: 16px; z-index: var(--v2-z-toast); display: flex; flex-direction: column; gap: 8px; max-width: 380px; }
.v2-toast-item { display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--v2-radius-sm); box-shadow: 0 4px 16px rgba(0,0,0,.12); border: 1px solid; }
.v2-toast-icon { flex-shrink: 0; margin-top: 1px; }
.v2-toast-body { flex: 1; min-width: 0; }
.v2-toast-title { font-size: 13px; font-weight: 600; line-height: 1.3; }
.v2-toast-message { display: block; font-size: 12px; margin-top: 2px; opacity: .8; }
.v2-toast-close { flex-shrink: 0; border: none; background: transparent; cursor: pointer; padding: 2px; opacity: .5; transition: opacity .15s; }
.v2-toast-close:hover { opacity: .8; }

.v2-toast-success { background: var(--v2-success-bg); border-color: var(--v2-success-border); color: var(--v2-success-text); }
.v2-toast-error { background: var(--v2-error-bg); border-color: var(--v2-error-border); color: var(--v2-error-text); }
.v2-toast-warning { background: var(--v2-warning-bg); border-color: var(--v2-warning-border); color: var(--v2-warning-text); }
.v2-toast-info { background: var(--v2-info-bg); border-color: var(--v2-info-border); color: var(--v2-info-text); }

.v2-toast-enter-active { transition: all .25s ease-out; }
.v2-toast-leave-active { transition: all .2s ease-in; }
.v2-toast-enter-from { opacity: 0; transform: translateX(40px); }
.v2-toast-leave-to { opacity: 0; transform: translateX(40px); }
</style>

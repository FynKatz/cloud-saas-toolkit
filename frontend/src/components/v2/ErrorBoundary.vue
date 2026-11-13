<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'
import { AlertTriangle, RotateCw } from 'lucide-vue-next'

const error = ref<Error | null>(null)
const errorKey = ref(0)

onErrorCaptured((err) => {
  error.value = err instanceof Error ? err : new Error(String(err))
  return false
})

function retry() {
  error.value = null
  errorKey.value += 1
}
</script>

<template>
  <div v-if="error" class="v2-error-boundary" role="alert">
    <div class="v2-error-icon"><AlertTriangle :size="28" /></div>
    <h3 class="v2-error-title">页面渲染出错</h3>
    <p class="v2-error-desc">{{ error.message }}</p>
    <button class="v2-error-retry" @click="retry">
      <RotateCw :size="15" /> 重新加载
    </button>
  </div>
  <slot v-else :key="errorKey" />
</template>

<style scoped>
.v2-error-boundary { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; text-align: center; }
.v2-error-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--v2-error-bg); color: var(--v2-error); display: flex; align-items: center; justify-content: center; margin-bottom: 14px; }
.v2-error-title { font-size: 16px; font-weight: 650; color: var(--v2-ink); margin: 0 0 6px; }
.v2-error-desc { font-size: 13px; color: var(--v2-ink-2); margin: 0 0 16px; max-width: 420px; line-height: 1.5; }
.v2-error-retry { display: flex; align-items: center; gap: 6px; padding: 8px 16px; border: 1px solid var(--v2-border); background: var(--v2-card-bg); color: var(--v2-ink); border-radius: var(--v2-radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: background .15s; }
.v2-error-retry:hover { background: var(--v2-btn-ghost-hover); }
</style>

<script setup lang="ts">
import { SearchX } from 'lucide-vue-next'

defineProps<{
  icon?: any
  title: string
  description?: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <div class="v2-empty-state" role="status">
    <div class="v2-empty-state-icon">
      <component :is="icon ?? SearchX" :size="28" />
    </div>
    <h3 class="v2-empty-state-title">{{ title }}</h3>
    <p v-if="description" class="v2-empty-state-desc">{{ description }}</p>
    <button v-if="actionLabel" class="v2-empty-state-action" @click="$emit('action')">
      {{ actionLabel }}
    </button>
  </div>
</template>

<style scoped>
.v2-empty-state { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; }
.v2-empty-state-icon { width: 56px; height: 56px; border-radius: 50%; background: var(--v2-accent-light); display: flex; align-items: center; justify-content: center; color: var(--v2-accent); margin-bottom: 14px; }
.v2-empty-state-title { font-size: 15px; font-weight: 600; color: var(--v2-ink); margin: 0 0 4px; }
.v2-empty-state-desc { font-size: 13px; color: var(--v2-ink-2); margin: 0 0 16px; line-height: 1.5; }
.v2-empty-state-action { padding: 8px 16px; border: none; background: var(--v2-accent); color: #fff; border-radius: var(--v2-radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; transition: opacity .15s; }
.v2-empty-state-action:hover { opacity: .88; }
</style>

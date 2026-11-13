<script setup lang="ts">
defineProps<{
  width?: string
  height?: string
  rounded?: 'sm' | 'md' | 'full'
}>()
</script>

<template>
  <div
    class="v2-skeleton"
    :class="{ 'v2-skeleton-full': rounded === 'full', 'v2-skeleton-sm': rounded === 'sm' }"
    :style="{ width: width || '100%', height: height || '16px' }"
    aria-hidden="true"
  />
</template>

<style scoped>
.v2-skeleton { border-radius: var(--v2-radius-sm); background: var(--v2-skeleton-base); animation: v2-skeleton-pulse 1.5s ease-in-out infinite; }
.v2-skeleton-full { border-radius: 9999px; }
.v2-skeleton-sm { border-radius: 5px; }

@keyframes v2-skeleton-pulse {
  0%, 100% { background: var(--v2-skeleton-base); }
  50% { background: var(--v2-skeleton-highlight); }
}
</style>

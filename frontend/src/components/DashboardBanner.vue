<script setup lang="ts">
import { X } from 'lucide-vue-next'

withDefaults(defineProps<{
  visible?: boolean
  title?: string
  description?: string
  actionLabel?: string
}>(), {
  visible: true,
  title: '',
  description: '',
  actionLabel: '',
})

const emit = defineEmits<{
  close: []
  action: []
}>()
</script>

<template>
  <Transition name="v2-dashboard-banner">
    <div v-if="visible" class="v2-dashboard-banner" role="region" aria-label="Dashboard banner">
      <div class="v2-dashboard-banner-content">
        <h3 v-if="title" class="v2-dashboard-banner-title">{{ title }}</h3>
        <p v-if="description" class="v2-dashboard-banner-desc">{{ description }}</p>
        <slot />
        <button v-if="actionLabel" class="v2-dashboard-banner-action" @click="emit('action')">
          {{ actionLabel }}
        </button>
      </div>
      <button class="v2-dashboard-banner-close" @click="emit('close')" aria-label="关闭">
        <X :size="16" />
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.v2-dashboard-banner {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin: 0 0 16px;
  padding: 14px 18px;
  border-radius: var(--v2-radius);
  background: var(--v2-accent-light);
  border: 1px solid var(--v2-accent);
  opacity: .92;
}
.v2-dashboard-banner-content {
  flex: 1;
  min-width: 0;
}
.v2-dashboard-banner-title {
  font-size: 14px;
  font-weight: 650;
  color: var(--v2-ink);
  margin: 0;
}
.v2-dashboard-banner-desc {
  font-size: 12.5px;
  color: var(--v2-ink-2);
  margin: 3px 0 0;
  line-height: 1.45;
}
.v2-dashboard-banner-action {
  margin-top: 8px;
  padding: 6px 14px;
  border: 1px solid var(--v2-accent);
  background: var(--v2-card-bg);
  color: var(--v2-accent);
  border-radius: var(--v2-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: background .12s, color .12s;
}
.v2-dashboard-banner-action:hover {
  background: var(--v2-accent);
  color: #fff;
}
.v2-dashboard-banner-close {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  color: var(--v2-ink-2);
  cursor: pointer;
  border-radius: var(--v2-radius-sm);
  flex-shrink: 0;
  transition: background .12s;
}
.v2-dashboard-banner-close:hover {
  background: var(--v2-btn-ghost-hover);
  color: var(--v2-ink);
}

.v2-dashboard-banner-enter-active { transition: all .25s ease-out; }
.v2-dashboard-banner-leave-active { transition: all .2s ease-in; }
.v2-dashboard-banner-enter-from, .v2-dashboard-banner-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}
</style>

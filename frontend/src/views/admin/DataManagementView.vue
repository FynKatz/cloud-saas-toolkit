<script setup lang="ts">
import { useRoute } from 'vue-router'

const route = useRoute()

const tabs = [
  { label: '省市行政区', path: '/admin/data/regions' },
  { label: '商场管理', path: '/admin/data/malls' },
  { label: '停车场管理', path: '/admin/data/parking-locations' },
]
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-2 border-b border-[var(--surface-border)]">
      <RouterLink
        v-for="tab in tabs"
        :key="tab.path"
        :to="tab.path"
        class="border-b-2 px-3 pb-2.5 pt-1 text-sm transition"
        :class="
          route.path === tab.path
            ? 'border-[var(--accent)] font-medium text-[var(--accent)]'
            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text)]'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </div>

    <RouterView />
  </div>
</template>

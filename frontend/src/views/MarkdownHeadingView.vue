<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const title = (route.meta.title as string) || 'Markdown Heading'
</script>

<template>
  <div class="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-[var(--surface-border)] bg-[var(--surface)] p-10">
    <div class="grid h-14 w-14 place-items-center rounded-full bg-[var(--bg)]">
      <span class="text-2xl text-[var(--text-secondary)]">#</span>
    </div>
    <div class="mt-4 text-lg font-semibold tracking-normal text-[var(--text)]">{{ title }}</div>
    <div class="mt-2 text-sm text-[var(--text-secondary)]">Markdown 标题层级调整器将在下一阶段完成迁移</div>
  </div>
</template>

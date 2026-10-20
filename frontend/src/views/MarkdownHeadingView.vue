<script setup lang="ts">
import { useRoute } from 'vue-router'
const route = useRoute()
const title = (route.meta.title as string) || 'Markdown Heading'
</script>

<template>
  <div class="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-10">
    <div class="grid h-14 w-14 place-items-center rounded-full bg-slate-100">
      <span class="text-2xl text-slate-400">#</span>
    </div>
    <div class="mt-4 text-lg font-semibold tracking-normal text-slate-700">{{ title }}</div>
    <div class="mt-2 text-sm text-slate-500">Markdown 标题层级调整器将在下一阶段完成迁移</div>
  </div>
</template>

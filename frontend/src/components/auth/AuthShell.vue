<script setup lang="ts">
import { Sun, Moon, LogIn } from 'lucide-vue-next'
import { useTheme } from '../../composables/useTheme'

defineProps<{
  title: string
  subtitle?: string
}>()

const { isDark, toggle } = useTheme()
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center px-4 relative"
    style="background: var(--bg)"
  >
    <!-- 背景装饰：弱渐层 -->
    <div
      class="pointer-events-none absolute inset-0"
      style="background: radial-gradient(ellipse at 30% 20%, var(--violet-soft) 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, var(--violet-soft) 0%, transparent 60%)"
    />

    <button
      class="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-md border text-sm transition"
      :style="{
        borderColor: 'var(--surface-border)',
        color: 'var(--text-secondary)',
      }"
      :title="isDark ? '切换到浅色模式' : '切换到暗夜模式'"
      @click="toggle"
    >
      <Sun v-if="isDark" class="h-4 w-4" />
      <Moon v-else class="h-4 w-4" />
    </button>

    <div
      class="relative z-10 w-full max-w-sm rounded-2xl border px-8 py-10 transition-shadow"
      :style="{
        background: 'var(--surface)',
        borderColor: 'var(--surface-border)',
        boxShadow: 'var(--shadow-hover)',
      }"
    >
      <!-- 品牌标记 -->
      <div class="mb-5 flex justify-center">
        <div
          class="grid h-12 w-12 place-items-center rounded-2xl"
          style="background: var(--violet-solid)"
        >
          <LogIn class="h-6 w-6 text-white" />
        </div>
      </div>

      <div class="mb-8 text-center">
        <h1
          class="text-[22px] font-bold tracking-[-0.015em] leading-tight"
          style="color: var(--text)"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="mt-2 text-[13px]"
          style="color: var(--text-secondary)"
        >
          {{ subtitle }}
        </p>
      </div>

      <div class="w-full">
        <slot />
      </div>
    </div>
  </div>
</template>

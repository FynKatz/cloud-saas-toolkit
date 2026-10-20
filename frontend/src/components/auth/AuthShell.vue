<script setup lang="ts">
import { Sun, Moon } from 'lucide-vue-next'
import { useTheme } from '../../composables/useTheme'

defineProps<{
  title: string
  subtitle?: string
}>()

const { isDark, toggle } = useTheme()
</script>

<template>
  <div
    class="flex min-h-screen items-center justify-center px-4"
    style="background: var(--bg)"
  >
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
      class="w-full max-w-sm rounded-xl border p-8"
      :style="{
        background: 'var(--surface)',
        borderColor: 'var(--surface-border)',
        boxShadow: 'var(--shadow-card)',
      }"
    >
      <div class="mb-6 text-center">
        <h1
          class="text-xl font-semibold tracking-normal"
          style="color: var(--text)"
        >
          {{ title }}
        </h1>
        <p
          v-if="subtitle"
          class="mt-1.5 text-sm"
          style="color: var(--text-secondary)"
        >
          {{ subtitle }}
        </p>
      </div>

      <slot />
    </div>
  </div>
</template>

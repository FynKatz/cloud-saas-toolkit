<script setup lang="ts">
import { computed } from 'vue'
import { CU_GLYPHS, type CuGlyphEl, type CuIconName } from './cuGlyphs'

const props = withDefaults(defineProps<{ name: CuIconName; size?: number }>(), { size: 24 })

const els = computed<CuGlyphEl[]>(() => CU_GLYPHS[props.name] ?? CU_GLYPHS.box)
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="(el, i) in els" :key="i" :d="el.d" :fill="el.f ? 'currentColor' : 'none'" :stroke="el.f ? 'none' : 'currentColor'" />
  </svg>
</template>

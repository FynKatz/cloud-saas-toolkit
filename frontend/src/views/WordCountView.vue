<script setup lang="ts">
import { computed, ref } from 'vue'
import { Copy, FileText } from 'lucide-vue-next'

const textInput = ref('')
const copied = ref(false)

const stats = computed(() => {
  const text = textInput.value
  const charCount = text.length
  const charNoSpace = text.replace(/\s/g, '').length
  const words = (text.match(/\b\w+\b/g) || []).length
  const lines = text === '' ? 0 : text.split('\n').length
  return { charCount, charNoSpace, words, lines }
})

const statItems = computed(() => [
  { label: '字符数（含空格）', value: stats.value.charCount.toLocaleString() },
  { label: '字符数（不含空格）', value: stats.value.charNoSpace.toLocaleString() },
  { label: '单词数（英文）', value: stats.value.words.toLocaleString() },
  { label: '行数', value: stats.value.lines.toLocaleString() },
])

async function handleCopy() {
  if (!textInput.value) return
  try {
    await navigator.clipboard.writeText(textInput.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* ignore */ }
}

function handleClear() {
  textInput.value = ''
}
</script>

<template>
  <div class="space-y-5">
    <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-5">
      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2 text-sm font-semibold tracking-normal text-[var(--text)]">
          <FileText class="h-4 w-4" />
          文本输入
        </div>
        <div class="flex gap-2">
          <button
            class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
            @click="handleCopy"
          >
            <Copy class="h-3.5 w-3.5" />
            {{ copied ? '已复制' : '复制文本' }}
          </button>
          <button
            class="rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-1.5 text-xs text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
            @click="handleClear"
          >
            清空
          </button>
        </div>
      </div>
      <textarea
        v-model="textInput"
        class="h-[300px] w-full resize-y rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
        placeholder="在此粘贴或输入您的文本..."
      />
    </div>

    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div
        v-for="item in statItems"
        :key="item.label"
        class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4 text-center"
      >
        <div class="text-2xl font-semibold tracking-normal text-[var(--accent)]">{{ item.value }}</div>
        <div class="mt-1 text-[11px] text-[var(--text-secondary)]">{{ item.label }}</div>
      </div>
    </div>
  </div>
</template>

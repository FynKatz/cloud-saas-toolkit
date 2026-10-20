<script setup lang="ts">
import { ref } from 'vue'
import { Check, Copy, Eraser, Heading, ListOrdered } from 'lucide-vue-next'

const adjustType = ref<'increase' | 'decrease'>('increase')
const inputText = ref('')
const outputText = ref('')
const copied = ref(false)

function adjustHeaders(text: string, delta: number): string {
  const headerRegex = /^(\#{1,6})\s+(.+)$/gm
  return text.replace(headerRegex, (_match, hashes: string, title: string) => {
    let level = hashes.length
    if (delta === -1 && level > 1) level -= 1
    else if (delta === 1 && level < 6) level += 1
    return '#'.repeat(level) + ' ' + title
  })
}

function removeHeaderPrefixes(text: string): string {
  const pattern = /^(\#{1,6}\s+)(?:[0-9\.]+|[(（][0-9A-Za-z][））]|[一二三四五六七八九十]+)(?:[\.\．\、\，\,]|\s)+/gm
  return text.replace(pattern, '$1')
}

function source(): string {
  return outputText.value.trim() !== '' ? outputText.value : inputText.value
}

function processMarkdown() {
  const delta = adjustType.value === 'increase' ? -1 : 1
  outputText.value = adjustHeaders(source(), delta)
}

function removePrefix() {
  outputText.value = removeHeaderPrefixes(source())
}

function clearAll() {
  inputText.value = ''
  outputText.value = ''
}

async function copyOutput() {
  if (!outputText.value) return
  try {
    await navigator.clipboard.writeText(outputText.value)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center gap-3">
      <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <Heading class="h-4 w-4" />
        调整方式
      </label>
      <select
        v-model="adjustType"
        class="h-9 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
      >
        <option value="increase">提升一级</option>
        <option value="decrease">降低一级</option>
      </select>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="mb-2 text-sm font-semibold tracking-normal text-[var(--text)]">输入</div>
        <textarea
          v-model="inputText"
          class="h-[360px] w-full resize-y rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--text)] outline-none transition focus:border-[var(--accent)]"
          placeholder="在此粘贴你的 Markdown 内容..."
        />
      </div>

      <div class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] p-4">
        <div class="mb-2 text-sm font-semibold tracking-normal text-[var(--text)]">输出</div>
        <textarea
          v-model="outputText"
          readonly
          class="h-[360px] w-full resize-y rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-3 font-mono text-sm text-[var(--text)] outline-none"
          placeholder="处理后的内容会显示在这里..."
        />
      </div>
    </div>

    <div class="flex flex-wrap gap-2">
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="processMarkdown"
      >
        <ListOrdered class="h-4 w-4" />
        标题升降
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="removePrefix"
      >
        <ListOrdered class="h-4 w-4" />
        删除标题前缀数字
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="copyOutput"
      >
        <Check v-if="copied" class="h-4 w-4 text-emerald-400" />
        <Copy v-else class="h-4 w-4" />
        {{ copied ? '已复制' : '复制结果' }}
      </button>
      <button
        class="flex items-center gap-1.5 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="clearAll"
      >
        <Eraser class="h-4 w-4" />
        清空内容
      </button>
    </div>
  </div>
</template>

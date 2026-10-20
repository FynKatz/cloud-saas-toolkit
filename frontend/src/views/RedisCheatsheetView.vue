<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy, Search, X, Zap } from 'lucide-vue-next'
import redisData from '../data/redis.json'

interface CheatItem {
  cmd: string
  desc: string
}

interface Section {
  title: string
  items: CheatItem[]
}

const sections = redisData as Section[]
const searchQuery = ref('')
const copiedCmd = ref<string | null>(null)

const filteredSections = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return sections
  return sections
    .map((s) => ({
      ...s,
      items: s.items.filter(
        (item) =>
          item.cmd.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q),
      ),
    }))
    .filter((s) => s.items.length > 0)
})

async function copyCmd(cmd: string) {
  try {
    await navigator.clipboard.writeText(cmd)
    copiedCmd.value = cmd
    setTimeout(() => {
      if (copiedCmd.value === cmd) copiedCmd.value = null
    }, 2000)
  } catch { /* ignore */ }
}
</script>

<template>
  <div class="space-y-5">
    <div class="relative">
      <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
        <Search class="h-4 w-4" />
      </span>
      <input
        v-model="searchQuery"
        class="h-10 w-full rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-10 text-sm outline-none transition focus:border-[var(--accent)] focus:bg-[var(--surface)] md:w-80"
        placeholder="搜索 Redis 命令..."
      />
      <button
        v-if="searchQuery"
        class="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
        @click="searchQuery = ''"
      >
        <X class="h-4 w-4" />
      </button>
    </div>

    <div v-if="filteredSections.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
      <Search class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">没有匹配的命令</p>
    </div>

    <div v-else class="space-y-4">
      <section
        v-for="section in filteredSections"
        :key="section.title"
        class="rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] overflow-hidden"
      >
        <h3 class="flex items-center gap-2 border-b border-[var(--surface-border)] bg-[var(--bg)] px-4 py-2.5 text-sm font-semibold tracking-normal text-[var(--text)]">
          <Zap class="h-3.5 w-3.5 text-[var(--accent)]" />
          {{ section.title }}
          <span class="ml-auto text-[11px] font-normal text-[var(--text-secondary)]">{{ section.items.length }} 条</span>
        </h3>
        <table class="w-full text-sm">
          <tbody>
            <tr
              v-for="item in section.items"
              :key="item.cmd"
              class="border-b border-[var(--surface-border)] transition hover:bg-[var(--bg)] last:border-0"
            >
              <td class="w-[45%] px-4 py-2.5">
                <code class="rounded bg-[var(--bg)] px-1.5 py-0.5 text-xs text-[var(--accent)]">{{ item.cmd }}</code>
              </td>
              <td class="px-4 py-2.5 text-[var(--text-secondary)]">{{ item.desc }}</td>
              <td class="w-[48px] px-2 py-2.5 text-right">
                <button
                  class="grid h-7 w-7 place-items-center rounded text-[var(--text-secondary)] transition hover:bg-[var(--nav-hover)] hover:text-[var(--text)]"
                  title="复制命令"
                  @click="copyCmd(item.cmd)"
                >
                  <Check v-if="copiedCmd === item.cmd" class="h-3.5 w-3.5 text-emerald-400" />
                  <Copy v-else class="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

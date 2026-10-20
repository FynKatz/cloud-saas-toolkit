<script setup lang="ts">
import { computed, ref } from 'vue'
import { Check, Copy, Database, Search, X } from 'lucide-vue-next'
import sqlData from '../data/sql.json'

interface CheatItem {
  cmd: string
  desc: string
  example?: string
}

interface DbGroup {
  db: string
  items: CheatItem[]
}

const groups = sqlData as DbGroup[]
const activeDb = ref(groups[0]?.db ?? '')
const searchQuery = ref('')
const copiedCmd = ref<string | null>(null)

const activeGroup = computed(() =>
  groups.find((g) => g.db === activeDb.value) ?? groups[0],
)

const filteredItems = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q || !activeGroup.value) return activeGroup.value?.items ?? []
  return activeGroup.value.items.filter(
    (item) =>
      item.cmd.toLowerCase().includes(q) || item.desc.toLowerCase().includes(q),
  )
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
    <div class="flex flex-wrap items-center gap-3">
      <div class="flex items-center gap-2">
        <Database class="h-4 w-4 text-[var(--text-secondary)]" />
        <span class="text-sm text-[var(--text-secondary)]">数据库</span>
      </div>
      <div class="flex rounded-md border border-[var(--surface-border)] bg-[var(--bg)] p-0.5">
        <button
          v-for="g in groups"
          :key="g.db"
          class="rounded px-3 py-1.5 text-sm transition"
          :class="activeDb === g.db ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-[var(--text)]'"
          @click="activeDb = g.db; searchQuery = ''"
        >
          {{ g.db }}
        </button>
      </div>
      <div class="relative ml-auto">
        <span class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]">
          <Search class="h-4 w-4" />
        </span>
        <input
          v-model="searchQuery"
          class="h-9 w-48 rounded-md border border-[var(--surface-border)] bg-[var(--bg)] pl-9 pr-9 text-sm outline-none transition focus:border-[var(--accent)] md:w-64"
          placeholder="搜索命令..."
        />
        <button
          v-if="searchQuery"
          class="absolute right-2 top-1/2 -translate-y-1/2 grid h-6 w-6 place-items-center rounded text-[var(--text-secondary)] hover:bg-[var(--nav-hover)]"
          @click="searchQuery = ''"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      </div>
    </div>

    <div v-if="filteredItems.length === 0" class="flex flex-col items-center py-10 text-[var(--text-secondary)]">
      <Search class="mb-2 h-8 w-8 opacity-30" />
      <p class="text-sm">没有匹配的命令</p>
    </div>

    <div v-else class="overflow-x-auto rounded-lg border border-[var(--surface-border)] bg-[var(--surface)]">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-[var(--surface-border)] text-left text-[11px] uppercase text-[var(--text-secondary)]">
            <th class="w-[38%] px-4 py-3 font-medium">命令</th>
            <th class="w-[38%] px-4 py-3 font-medium">说明</th>
            <th class="px-4 py-3 font-medium">示例</th>
            <th class="w-[48px] px-2 py-3" />
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="item in filteredItems"
            :key="item.cmd"
            class="border-b border-[var(--surface-border)] transition hover:bg-[var(--bg)] last:border-0"
          >
            <td class="px-4 py-2.5">
              <code class="rounded bg-[var(--bg)] px-1.5 py-0.5 text-xs text-[var(--accent)]">{{ item.cmd }}</code>
            </td>
            <td class="px-4 py-2.5 text-[var(--text-secondary)]">{{ item.desc }}</td>
            <td class="px-4 py-2.5">
              <code v-if="item.example" class="text-xs text-[var(--text-secondary)]">{{ item.example }}</code>
            </td>
            <td class="px-2 py-2.5 text-right">
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
    </div>
  </div>
</template>

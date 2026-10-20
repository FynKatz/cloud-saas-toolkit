import { ref, watch } from 'vue'
import type { Tool } from '../types/tools'

const STORAGE_KEY = 'cloud-saas-toolkit:recent-tools'
const MAX_RECENT = 8

const recentIds = ref<string[]>([])

function read(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as string[]) : []
  } catch {
    return []
  }
}

function write(ids: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids))
  } catch {
    // localStorage can be unavailable in private mode; recent tools then stay in memory.
  }
}

watch(recentIds, (ids) => write(ids), { deep: true })

export function useRecent() {
  if (recentIds.value.length === 0) {
    recentIds.value = read()
  }

  function addRecent(toolId: string): void {
    const next = [toolId, ...recentIds.value.filter((id) => id !== toolId)].slice(
      0,
      MAX_RECENT,
    )
    recentIds.value = next
  }

  function clearRecent(): void {
    recentIds.value = []
  }

  function recentTools(tools: Tool[]): Tool[] {
    return recentIds.value
      .map((id) => tools.find((tool) => tool.id === id))
      .filter((tool): tool is Tool => Boolean(tool))
  }

  return {
    recentIds,
    addRecent,
    clearRecent,
    recentTools,
  }
}

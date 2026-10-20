import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { Tool, ToolAccessLevel, ToolPermissionRow } from '../types/tools'

type CategoryGroup = { name: string; tools: Tool[] }

export const useToolsStore = defineStore('tools', () => {
  const permissions = ref<Record<string, ToolAccessLevel>>({})
  const tools = ref<Tool[]>([])
  const loading = ref(false)
  const initialized = ref(false)
  const error = ref<string | null>(null)

  const hasTool = (toolId: string): boolean => toolId in permissions.value
  const canEdit = (toolId: string): boolean => permissions.value[toolId] === 'edit'

  const allowedTools = computed<Tool[]>(() =>
    tools.value.filter((t) => t.id in permissions.value),
  )

  const groupedTools = computed<CategoryGroup[]>(() => {
    const map = new Map<string, Tool[]>()
    for (const t of allowedTools.value) {
      const list = map.get(t.category)
      if (list) list.push(t)
      else map.set(t.category, [t])
    }
    return [...map.entries()].map(([name, tools]) => ({ name, tools }))
  })

  async function load(force = false): Promise<void> {
    if (loading.value || (initialized.value && !force)) return
    loading.value = true
    error.value = null
    try {
      const { data: pRows, error: pErr } = await supabase.rpc(
        'get_my_tool_permissions',
      )
      if (pErr) throw pErr
      const rows = (pRows as ToolPermissionRow[] | null) ?? []

      if (rows.length === 0) {
        permissions.value = {}
        tools.value = []
        return
      }

      const map: Record<string, ToolAccessLevel> = {}
      for (const r of rows) map[r.tool_id] = r.access_level

      const ids = Object.keys(map)
      const { data: tRows, error: tErr } = await supabase
        .from('tools')
        .select('*')
        .in('id', ids)
        .order('sort_order', { ascending: true })
      if (tErr) throw tErr

      permissions.value = map
      tools.value = (tRows as Tool[] | null) ?? []
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '加载工具权限失败'
      error.value = msg
    } finally {
      loading.value = false
      initialized.value = true
    }
  }

  function reset(): void {
    permissions.value = {}
    tools.value = []
    loading.value = false
    initialized.value = false
    error.value = null
  }

  return {
    permissions,
    tools,
    loading,
    initialized,
    error,
    hasTool,
    canEdit,
    allowedTools,
    groupedTools,
    load,
    reset,
  }
})

import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { AdminPermission, AdminRole, AdminTool, AdminUser } from '../types/admin'

/**
 * Parses an Edge Function error into the message returned by the function.
 * supabase-js surfaces non-2xx responses as FunctionsHttpError with the raw
 * Response in `context`, so the JSON body has to be read explicitly.
 */
async function toError(error: unknown, fallback: string): Promise<string> {
  const ctx = (error as { context?: Response })?.context
  if (ctx && typeof ctx.json === 'function') {
    try {
      const payload = (await ctx.json()) as { error?: string }
      if (payload?.error) return payload.error
    } catch {
      // fall through to the generic message
    }
  }
  return fallback
}

async function invoke<T>(
  fn: string,
  body: Record<string, unknown>,
  fallback: string,
): Promise<{ data?: T; error?: string }> {
  const { data, error } = await supabase.functions.invoke(fn, {
    method: 'POST',
    body,
  })
  if (error) return { error: await toError(error, fallback) }
  return { data: data as T }
}

export const useAdminStore = defineStore('admin', () => {
  const users = ref<AdminUser[]>([])
  const roles = ref<AdminRole[]>([])
  const permissions = ref<AdminPermission[]>([])
  const tools = ref<AdminTool[]>([])
  const loadingUsers = ref(false)
  const loadingRoles = ref(false)

  async function loadUsers(): Promise<{ error?: string }> {
    loadingUsers.value = true
    const { data, error } = await invoke<{ users: AdminUser[] }>(
      'admin-list-users',
      {},
      '加载用户列表失败',
    )
    loadingUsers.value = false
    if (error) return { error }
    users.value = data?.users ?? []
    return {}
  }

  async function loadRoles(): Promise<{ error?: string }> {
    loadingRoles.value = true
    const { data, error } = await invoke<{
      roles: AdminRole[]
      permissions: AdminPermission[]
      tools: AdminTool[]
    }>('admin-list-roles', {}, '加载角色失败')
    loadingRoles.value = false
    if (error) return { error }
    roles.value = data?.roles ?? []
    permissions.value = data?.permissions ?? []
    tools.value = data?.tools ?? []
    return {}
  }

  const createUser = (username: string, password: string, roleIds: string[]) =>
    invoke<{ user_id: string }>(
      'admin-create-user',
      { username, password, role_ids: roleIds },
      '创建用户失败',
    )

  const approveUser = (userId: string, roleIds: string[]) =>
    invoke('admin-approve-user', { user_id: userId, role_ids: roleIds }, '审批失败')

  const rejectUser = (userId: string, reason: string) =>
    invoke('admin-reject-user', { user_id: userId, reason }, '拒绝失败')

  const resetPassword = (userId: string, newPassword: string) =>
    invoke('admin-reset-password', { user_id: userId, new_password: newPassword }, '重置密码失败')

  const deleteUser = (userId: string) =>
    invoke('admin-delete-user', { user_id: userId }, '删除失败')

  const restoreUser = (userId: string) =>
    invoke('admin-restore-user', { user_id: userId }, '恢复失败')

  const assignUserRole = (userId: string, roleIds: string[]) =>
    invoke('admin-assign-user-role', { user_id: userId, role_ids: roleIds }, '分配角色失败')

  const createRole = (name: string, description: string) =>
    invoke<{ role_id: string }>('admin-create-role', { name, description }, '创建角色失败')

  const updateRole = (roleId: string, patch: { name?: string; description?: string }) =>
    invoke('admin-update-role', { role_id: roleId, ...patch }, '更新角色失败')

  const deleteRole = (roleId: string) =>
    invoke('admin-delete-role', { role_id: roleId }, '删除角色失败')

  const setRolePermission = (
    roleId: string,
    toolId: string,
    accessLevel: 'view' | 'edit' | null,
  ) =>
    invoke(
      'admin-set-role-permission',
      { role_id: roleId, tool_id: toolId, access_level: accessLevel },
      '设置权限失败',
    )

  return {
    users,
    roles,
    permissions,
    tools,
    loadingUsers,
    loadingRoles,
    loadUsers,
    loadRoles,
    createUser,
    approveUser,
    rejectUser,
    resetPassword,
    deleteUser,
    restoreUser,
    assignUserRole,
    createRole,
    updateRole,
    deleteRole,
    setRolePermission,
  }
})

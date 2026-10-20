export type AdminUserStatus = 'pending' | 'approved' | 'rejected' | 'deleted'

export interface AdminUser {
  id: string
  username: string
  display_name: string | null
  status: AdminUserStatus
  prior_status: AdminUserStatus | null
  reject_reason: string | null
  must_change_password: boolean
  created_at: string
  deleted_at: string | null
  roles: string[]
}

export interface AdminRole {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permission_count: number
  user_count: number
}

export interface AdminPermission {
  role_id: string
  tool_id: string
  access_level: 'view' | 'edit'
}

export interface AdminTool {
  id: string
  name: string
  category: string
  writable: boolean
}

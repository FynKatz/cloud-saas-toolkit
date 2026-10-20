export type ProfileStatus = 'pending' | 'approved' | 'rejected' | 'deleted'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  status: ProfileStatus
  prior_status: ProfileStatus | null
  reject_reason: string | null
  must_change_password: boolean
  password_changed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export const toVirtualEmail = (username: string): string =>
  `${username.trim().toLowerCase()}@toolkit.internal`

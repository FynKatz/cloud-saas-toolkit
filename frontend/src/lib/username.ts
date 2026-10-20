const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/
const RESERVED = new Set(['root', 'system', 'owner', 'test'])

export interface UsernameValidation {
  valid: boolean
  error?: string
}

export function validateUsername(raw: string): UsernameValidation {
  const v = raw.trim().toLowerCase()
  if (!v) return { valid: false, error: '请输入用户名' }
  if (v.length < 3) return { valid: false, error: '至少 3 个字符' }
  if (v.length > 32) return { valid: false, error: '最多 32 个字符' }
  if (!USERNAME_RE.test(v)) {
    return {
      valid: false,
      error: '只能包含小写字母、数字、_、-，且不能以 _ 或 - 开头结尾',
    }
  }
  if (RESERVED.has(v)) return { valid: false, error: '该用户名为系统保留字' }
  return { valid: true }
}

export function validatePassword(pw: string): UsernameValidation {
  if (pw.length < 8) return { valid: false, error: '至少 8 位' }
  if (!/[a-zA-Z]/.test(pw)) return { valid: false, error: '必须包含字母' }
  if (!/[0-9]/.test(pw)) return { valid: false, error: '必须包含数字' }
  return { valid: true }
}

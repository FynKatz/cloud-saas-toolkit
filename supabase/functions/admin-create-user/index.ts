import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/
const RESERVED = new Set(['root', 'system', 'owner', 'test'])
const toEmail = (u: string) => `${u.trim().toLowerCase()}@toolkit.internal`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: '未登录' }, 401)

  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: authError } = await anon.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (authError || !user) return json({ error: '未登录' }, 401)

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: isAdmin } = await service.rpc('is_admin_for', { p_user_id: user.id })
  if (isAdmin !== true) return json({ error: '需要管理员权限' }, 403)

  const body = await req.json().catch(() => ({}))
  const username = String(body.username ?? '').trim().toLowerCase()
  const password = String(body.password ?? '')
  const roleIds: string[] = Array.isArray(body.role_ids) ? body.role_ids : []

  if (!USERNAME_RE.test(username) || RESERVED.has(username)) {
    return json({ error: '用户名格式不正确或为保留字' }, 400)
  }
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return json({ error: '临时密码至少 8 位且包含字母和数字' }, 400)
  }
  if (roleIds.length === 0) {
    return json({ error: '至少分配一个角色' }, 400)
  }

  const { data: existing } = await service
    .from('profiles')
    .select('id, status')
    .eq('username', username)
    .maybeSingle()
  if (existing) {
    return json({ error: '用户名已被占用' }, 409)
  }

  const { data: created, error: createError } = await service.auth.admin.createUser({
    email: toEmail(username),
    password,
    email_confirm: true,
    user_metadata: { username },
  })
  if (createError || !created.user) {
    return json({ error: '创建用户失败' }, 500)
  }

  const newId = created.user.id

  const { error: profileError } = await service
    .from('profiles')
    .update({
      status: 'approved',
      must_change_password: true,
      created_by: user.id,
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      display_name: username,
    })
    .eq('id', newId)
  if (profileError) {
    await service.auth.admin.deleteUser(newId)
    return json({ error: '初始化用户资料失败' }, 500)
  }

  const { error: roleError } = await service.from('user_roles').insert(
    roleIds.map((roleId) => ({ user_id: newId, role_id: roleId, granted_by: user.id })),
  )
  if (roleError) {
    return json({ error: '分配角色失败' }, 500)
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_create_user',
    target_type: 'user',
    target_id: newId,
    metadata: { username, role_ids: roleIds },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ user_id: newId })
})

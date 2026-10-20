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
  const targetId = String(body.user_id ?? '')
  const newPassword = String(body.new_password ?? '')

  if (!targetId) return json({ error: '缺少 user_id' }, 400)
  if (newPassword.length < 8 || !/[a-zA-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
    return json({ error: '新密码至少 8 位且包含字母和数字' }, 400)
  }

  const { error: updateError } = await service.auth.admin.updateUserById(targetId, {
    password: newPassword,
  })
  if (updateError) return json({ error: '重置密码失败' }, 500)

  const { error: profileError } = await service
    .from('profiles')
    .update({ must_change_password: true, password_changed_at: new Date().toISOString() })
    .eq('id', targetId)
  if (profileError) return json({ error: '更新用户状态失败' }, 500)

  // PRD 5.3: resetting a password revokes every existing session.
  const { error: revokeError } = await service.rpc('revoke_user_sessions', {
    p_user_id: targetId,
  })
  if (revokeError) return json({ error: '吊销会话失败' }, 500)

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_reset_password',
    target_type: 'user',
    target_id: targetId,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

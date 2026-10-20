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
  if (!targetId) return json({ error: '缺少 user_id' }, 400)
  if (targetId === user.id) return json({ error: '不能删除自己' }, 400)

  const { data: target } = await service
    .from('profiles')
    .select('id, status')
    .eq('id', targetId)
    .maybeSingle()
  if (!target) return json({ error: '用户不存在' }, 404)
  if (target.status === 'deleted') return json({ error: '用户已删除' }, 409)

  // Last-admin guard: refuse to remove the final approved admin.
  const { data: targetIsAdmin } = await service.rpc('is_admin_for', {
    p_user_id: targetId,
  })
  if (targetIsAdmin === true) {
    const { data: adminCount } = await service.rpc('count_active_admins')
    if ((adminCount ?? 0) <= 1) {
      return json({ error: '不能删除最后一个管理员' }, 409)
    }
  }

  const { error: updateError } = await service
    .from('profiles')
    .update({
      status: 'deleted',
      prior_status: target.status,
      deleted_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .neq('status', 'deleted')
  if (updateError) return json({ error: '删除失败' }, 500)

  const { error: revokeError } = await service.rpc('revoke_user_sessions', {
    p_user_id: targetId,
  })
  if (revokeError) return json({ error: '吊销会话失败' }, 500)

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_delete_user',
    target_type: 'user',
    target_id: targetId,
    metadata: { prior_status: target.status },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

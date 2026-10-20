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
  const reason = String(body.reason ?? '').trim()
  if (!targetId) return json({ error: '缺少 user_id' }, 400)
  if (!reason) return json({ error: '请填写拒绝原因' }, 400)

  const { data: updated, error: updateError } = await service
    .from('profiles')
    .update({
      status: 'rejected',
      reject_reason: reason,
      rejected_by: user.id,
      rejected_at: new Date().toISOString(),
    })
    .eq('id', targetId)
    .eq('status', 'pending')
    .select('id')
  if (updateError) return json({ error: '拒绝失败' }, 500)
  if (!updated || updated.length === 0) {
    return json({ error: '该用户当前不是待审批状态' }, 409)
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_reject_user',
    target_type: 'user',
    target_id: targetId,
    metadata: { reason },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

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

  const { data: target } = await service
    .from('profiles')
    .select('id, status, prior_status')
    .eq('id', targetId)
    .maybeSingle()
  if (!target) return json({ error: '用户不存在' }, 404)
  if (target.status !== 'deleted') return json({ error: '该用户未被删除' }, 409)

  // Restore to the recorded prior status; fall back to approved per PRD 5.9.
  const restoredStatus =
    target.prior_status && target.prior_status !== 'deleted'
      ? target.prior_status
      : 'approved'

  const { error: updateError } = await service
    .from('profiles')
    .update({ status: restoredStatus, prior_status: null, deleted_at: null })
    .eq('id', targetId)
    .eq('status', 'deleted')
  if (updateError) return json({ error: '恢复失败' }, 500)

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_restore_user',
    target_type: 'user',
    target_id: targetId,
    metadata: { restored_status: restoredStatus },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true, status: restoredStatus })
})

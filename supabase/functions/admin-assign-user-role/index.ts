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
  const roleIds: string[] = Array.isArray(body.role_ids) ? body.role_ids : []
  if (!targetId) return json({ error: '缺少 user_id' }, 400)

  const { data: adminRole } = await service
    .from('roles')
    .select('id')
    .eq('name', 'admin')
    .maybeSingle()

  const keepsAdmin = adminRole ? roleIds.includes(adminRole.id) : false
  const { data: targetIsAdmin } = await service.rpc('is_admin_for', { p_user_id: targetId })

  // Last-admin guard: block removing the admin role from the final admin.
  if (targetIsAdmin === true && !keepsAdmin) {
    const { data: adminCount } = await service.rpc('count_active_admins')
    if ((adminCount ?? 0) <= 1) {
      return json({ error: '不能移除最后一个管理员的角色' }, 409)
    }
  }

  // Whole-set replacement, applied as delete-then-insert.
  const { error: deleteError } = await service
    .from('user_roles')
    .delete()
    .eq('user_id', targetId)
  if (deleteError) return json({ error: '更新角色失败' }, 500)

  if (roleIds.length > 0) {
    const { error: insertError } = await service.from('user_roles').insert(
      roleIds.map((roleId) => ({ user_id: targetId, role_id: roleId, granted_by: user.id })),
    )
    if (insertError) return json({ error: '分配角色失败' }, 500)
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_assign_user_role',
    target_type: 'user',
    target_id: targetId,
    metadata: { role_ids: roleIds },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

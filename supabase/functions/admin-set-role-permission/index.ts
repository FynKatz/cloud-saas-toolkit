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
  const roleId = String(body.role_id ?? '')
  const toolId = String(body.tool_id ?? '')
  const accessLevel = body.access_level
  if (!roleId || !toolId) return json({ error: '缺少 role_id 或 tool_id' }, 400)

  const { data: role } = await service
    .from('roles')
    .select('id, is_system')
    .eq('id', roleId)
    .maybeSingle()
  if (!role) return json({ error: '角色不存在' }, 404)
  if (role.is_system) return json({ error: '系统角色权限由代码固定，不可修改' }, 409)

  // access_level === null removes the grant.
  if (accessLevel === null || accessLevel === undefined) {
    const { error } = await service
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('tool_id', toolId)
    if (error) return json({ error: '移除权限失败' }, 500)
  } else {
    if (accessLevel !== 'view' && accessLevel !== 'edit') {
      return json({ error: 'access_level 必须是 view / edit / null' }, 400)
    }
    // edit is only meaningful for writable tools.
    if (accessLevel === 'edit') {
      const { data: tool } = await service
        .from('tools')
        .select('writable')
        .eq('id', toolId)
        .maybeSingle()
      if (!tool) return json({ error: '工具不存在' }, 404)
      if (!tool.writable) return json({ error: '该工具只读，不能授予编辑权限' }, 400)
    }
    const { error } = await service
      .from('role_permissions')
      .upsert(
        { role_id: roleId, tool_id: toolId, access_level: accessLevel },
        { onConflict: 'role_id,tool_id' },
      )
    if (error) return json({ error: '设置权限失败' }, 500)
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_set_role_permission',
    target_type: 'role',
    target_id: roleId,
    metadata: { tool_id: toolId, access_level: accessLevel ?? null },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

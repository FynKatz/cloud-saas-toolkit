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
  if (!roleId) return json({ error: '缺少 role_id' }, 400)

  const { data: role } = await service
    .from('roles')
    .select('id, name, is_system')
    .eq('id', roleId)
    .maybeSingle()
  if (!role) return json({ error: '角色不存在' }, 404)
  if (role.is_system) return json({ error: '系统角色不可修改' }, 409)

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string') {
    const name = body.name.trim()
    if (name.length < 1 || name.length > 32) {
      return json({ error: '角色名长度需在 1-32 字符' }, 400)
    }
    if (name === 'admin') return json({ error: '该名称为系统保留' }, 400)
    patch.name = name
  }
  if (typeof body.description === 'string') {
    patch.description = body.description.trim() || null
  }
  if (Object.keys(patch).length === 0) return json({ error: '没有可更新的字段' }, 400)

  const { error: updateError } = await service.from('roles').update(patch).eq('id', roleId)
  if (updateError) {
    if (updateError.code === '23505') return json({ error: '角色名已存在' }, 409)
    return json({ error: '更新角色失败' }, 500)
  }

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_update_role',
    target_type: 'role',
    target_id: roleId,
    metadata: patch,
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ success: true })
})

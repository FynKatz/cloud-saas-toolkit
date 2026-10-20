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
  const name = String(body.name ?? '').trim()
  const description = String(body.description ?? '').trim() || null
  if (name.length < 1 || name.length > 32) return json({ error: '角色名长度需在 1-32 字符' }, 400)
  if (name === 'admin') return json({ error: '该名称为系统保留' }, 400)

  const { data: existing } = await service
    .from('roles')
    .select('id')
    .eq('name', name)
    .maybeSingle()
  if (existing) return json({ error: '角色名已存在' }, 409)

  const { data: created, error: createError } = await service
    .from('roles')
    .insert({ name, description, is_system: false })
    .select('id')
    .single()
  if (createError || !created) return json({ error: '创建角色失败' }, 500)

  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: 'admin_create_role',
    target_type: 'role',
    target_id: created.id,
    metadata: { name },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return json({ role_id: created.id })
})

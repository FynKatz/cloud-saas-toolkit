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

  const { data: roles, error: roleError } = await service.rpc('admin_list_roles')
  if (roleError) return json({ error: '加载角色失败' }, 500)

  const { data: permissions, error: permError } = await service
    .from('role_permissions')
    .select('role_id, tool_id, access_level')
  if (permError) return json({ error: '加载权限失败' }, 500)

  const { data: tools } = await service
    .from('tools')
    .select('id, name, category, writable')
    .order('sort_order', { ascending: true })

  return json({
    roles: roles ?? [],
    permissions: permissions ?? [],
    tools: tools ?? [],
  })
})

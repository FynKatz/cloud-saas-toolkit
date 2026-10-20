import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: '未登录' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const token = authHeader.replace('Bearer ', '')
  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: authError } = await anonClient.auth.getUser(token)
  if (authError || !user) {
    return new Response(JSON.stringify({ error: '未登录' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const serviceClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { old_password, new_password } = await req.json()

  if (!old_password || typeof old_password !== 'string') {
    return new Response(JSON.stringify({ error: '请输入当前密码' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!new_password || typeof new_password !== 'string' || new_password.length < 8) {
    return new Response(JSON.stringify({ error: '新密码至少 8 位' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (!/[a-zA-Z]/.test(new_password) || !/[0-9]/.test(new_password)) {
    return new Response(JSON.stringify({ error: '密码必须包含字母和数字' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (old_password === new_password) {
    return new Response(JSON.stringify({ error: '新密码不能与当前密码相同' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Re-authenticate with the current password before allowing a credential change.
  // Without this step an attacker holding a stolen session token could silently
  // take over the account by rotating the password.
  const { error: verifyError } = await anonClient.auth.signInWithPassword({
    email: user.email!,
    password: old_password,
  })

  if (verifyError) {
    return new Response(JSON.stringify({ error: '当前密码不正确' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: profile } = await serviceClient
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()

  if (!profile || profile.status !== 'approved') {
    return new Response(JSON.stringify({ error: '无权操作' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: updateError } = await serviceClient.auth.admin.updateUserById(user.id, {
    password: new_password,
  })

  if (updateError) {
    return new Response(JSON.stringify({ error: '密码更新失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { error: profileError } = await serviceClient
    .from('profiles')
    .update({
      must_change_password: false,
      password_changed_at: new Date().toISOString(),
    })
    .eq('id', user.id)

  if (profileError) {
    return new Response(JSON.stringify({ error: '状态更新失败' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  await serviceClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'change_password',
    target_type: 'user',
    target_id: user.id,
    metadata: { forced: true },
    ip: req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  })

  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

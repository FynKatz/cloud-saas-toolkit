// Edge Function: amap_geocode
// Resolves address → coordinates via AMap Web API Key (server-side).
// Mirrors patterns from pixabay-proxy / tmdb-proxy.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const AMAP_WEB_KEY = Deno.env.get('AMAP_WEB_KEY') || ''

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

  // Auth: only approved users can geocode (prevents quota abuse)
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return json({ error: '未登录' }, 401)

  const token = authHeader.replace('Bearer ', '')
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: { user }, error: authError } = await anon.auth.getUser(token)
  if (authError || !user) return json({ error: '未登录' }, 401)

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await service
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()
  if (!profile || profile.status !== 'approved') {
    return json({ error: '账号尚未通过审批' }, 403)
  }

  const body: { address?: string } = await req.json().catch(() => ({}))
  const address = String(body.address ?? '').trim()
  if (!address) return json({ error: '缺少 address' }, 400)

  if (!AMAP_WEB_KEY) return json({ error: 'AMAP_WEB_KEY 未配置' }, 500)

  const apiUrl = `https://restapi.amap.com/v3/geocode/geo?key=${AMAP_WEB_KEY}&address=${encodeURIComponent(address)}`
  const amapRes = await fetch(apiUrl)
  if (!amapRes.ok) {
    return json({ error: `高德 API 返回 ${amapRes.status}` }, 502)
  }
  const amapData = await amapRes.json()

  return json(amapData)
})

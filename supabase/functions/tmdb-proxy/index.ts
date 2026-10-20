import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const TMDB_API_KEY = Deno.env.get('TMDB_API_KEY')!

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

  const { data: profile } = await service
    .from('profiles')
    .select('status')
    .eq('id', user.id)
    .single()
  if (!profile || profile.status !== 'approved') {
    return json({ error: '账号尚未通过审批' }, 403)
  }

  const { data: permitted } = await service.rpc('has_tool_permission', {
    p_tool_id: 'movie',
    p_required_level: 'view',
  })
  if (permitted !== true) return json({ error: '无权访问此工具' }, 403)

  const body = await req.json().catch(() => ({}))
  const query = String(body.query ?? '').trim()
  if (!query) return json({ error: '缺少 query' }, 400)

  const apiUrl = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&language=zh-CN&page=1`
  const tmdbRes = await fetch(apiUrl, {
    headers: {
      Authorization: `Bearer ${TMDB_API_KEY}`,
      accept: 'application/json',
    },
  })
  if (!tmdbRes.ok) {
    return json({ error: `TMDB API 返回 ${tmdbRes.status}` }, 502)
  }
  const tmdbData = await tmdbRes.json()

  return json(tmdbData)
})

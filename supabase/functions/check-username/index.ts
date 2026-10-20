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

const USERNAME_RE = /^[a-z0-9][a-z0-9_-]{1,30}[a-z0-9]$/
const DB_RESERVED = new Set(['root', 'system', 'owner', 'test'])
const RATE_LIMIT_SECONDS = 60

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('authorization')
  const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  // A signed-in caller has no business probing names; ask them to use the app.
  if (authHeader && authHeader !== `Bearer ${SUPABASE_ANON_KEY}`) {
    const { data: { user } } = await anon.auth.getUser(authHeader.replace('Bearer ', ''))
    if (user) return json({ result_code: 'forbidden' })
  }

  const body = await req.json().catch(() => ({}))
  const username = String(body.username ?? '').trim().toLowerCase()

  if (!USERNAME_RE.test(username) || DB_RESERVED.has(username)) {
    return json({ result_code: 'invalid' })
  }
  // PRD 5.1: 'admin' is occupied by the seed account and is reserved for
  // self-service registration, but it is intentionally absent from the DB CHECK.
  if (username === 'admin') {
    return json({ result_code: 'reserved' })
  }

  const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile } = await service
    .from('profiles')
    .select('status, last_registration_attempt')
    .eq('username', username)
    .maybeSingle()

  if (!profile) return json({ result_code: 'available' })
  if (profile.status === 'deleted') return json({ result_code: 'deleted' })

  // Soft rate limit: same name attempted within 60s is answered as throttled.
  if (profile.last_registration_attempt) {
    const elapsed = Date.now() - new Date(profile.last_registration_attempt).getTime()
    if (elapsed < RATE_LIMIT_SECONDS * 1000) {
      return json({ result_code: 'rate_limited' })
    }
  }

  return json({ result_code: 'exists' })
})

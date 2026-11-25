// Edge Function: amap-place
// POI 关键字搜索（停车页「地图搜索」按钮的服务端）。
//
// 为什么不用前端 AMap.PlaceSearch：那条路要求 JS Key 的安全密钥，只有两种用法 ——
//   1) jscode 写进前端 → 密钥进构建产物，任何人可趴，已明确否决；
//   2) serviceHost 代理 → 实测不可行：高德对 platform=JS 的 restapi 请求会校验来源，
//      从 Supabase 出口 IP 一律回 SERVICE_NOT_AVAILABLE(10002)，带上 jscode 也一样。
// 这里改用 **Web服务 Key + 普通参数**（不带 platform=JS），实测从 Supabase 出口可用，
// 密钥始终留在服务端。与 amap_geocode / pixabay-proxy / tmdb-proxy 同一套路。

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

  const body: {
    keywords?: string
    city?: string
    limit?: number
    /** 给了中心点就改走周边搜索，对齐原前端 PlaceSearch.searchNearBy 的语义。 */
    center?: { lng?: number; lat?: number }
    radius?: number
  } = await req.json().catch(() => ({}))
  const keywords = String(body.keywords ?? '').trim()
  if (!keywords) return json({ error: '缺少 keywords' }, 400)
  if (!AMAP_WEB_KEY) return json({ error: 'AMAP_WEB_KEY 未配置' }, 500)

  const limit = Math.min(Math.max(Number(body.limit) || 10, 1), 20)
  const centerLng = Number(body.center?.lng)
  const centerLat = Number(body.center?.lat)
  const hasCenter = Number.isFinite(centerLng) && Number.isFinite(centerLat)

  const params = new URLSearchParams({
    key: AMAP_WEB_KEY,
    offset: String(limit),
    page: '1',
    extensions: 'base',
  })
  let apiUrl: string
  if (hasCenter) {
    // 周边搜索：keywords 在 around 接口里是 keywords 过滤，中心点走 location
    params.set('location', `${centerLng},${centerLat}`)
    params.set('radius', String(Math.min(Math.max(Number(body.radius) || 5000, 500), 50000)))
    params.set('keywords', keywords)
    apiUrl = `https://restapi.amap.com/v3/place/around?${params.toString()}`
  } else {
    params.set('keywords', keywords)
    // city 留空时高德按全国搜；停车页目前就是全国搜关键字，不额外限制。
    const city = String(body.city ?? '').trim()
    if (city) params.set('city', city)
    apiUrl = `https://restapi.amap.com/v3/place/text?${params.toString()}`
  }
  let amapData: Record<string, unknown>
  try {
    const amapRes = await fetch(apiUrl)
    amapData = await amapRes.json()
  } catch (e) {
    return json({ error: `高德请求失败: ${String((e as Error).message).slice(0, 120)}` }, 502)
  }

  if (amapData.status !== '1') {
    // 不回显 key/jscode 等参数，只回高德的错误码
    return json({ error: '高德搜索失败', info: amapData.info, infocode: amapData.infocode }, 502)
  }

  const pois = (amapData.pois as Array<Record<string, unknown>> | undefined) ?? []
  const results = pois
    .map((p) => {
      const [lngText, latText] = String(p.location ?? '').split(',')
      const lng = Number(lngText)
      const lat = Number(latText)
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null
      return {
        name: String(p.name ?? ''),
        address: typeof p.address === 'string' ? p.address : undefined,
        city: String(p.cityname ?? ''),
        district: String(p.adname ?? ''),
        location: { lng, lat },
      }
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)

  return json({ count: results.length, results })
})

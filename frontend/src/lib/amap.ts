// 高德 JS SDK 动态加载：单例 + 失败降级，避免页面因地图不可用而白屏。
// JS Key 属于 B 级变量（VITE_ 前缀），域名白名单由高德控制台约束。
import { supabase } from './supabase'

let loadPromise: Promise<AMapLike> | null = null

/** 最小 AMap 类型：脚本加载完成后 window.AMap 的存在性即表示可用。 */
type AMapLike = {
  Map: new (el: HTMLElement, opts: Record<string, unknown>) => unknown
  Pixel: new (x: number, y: number) => unknown
  Marker: new (opts: Record<string, unknown>) => unknown
  InfoWindow: new (opts: Record<string, unknown>) => unknown
  Geolocation: new (opts: Record<string, unknown>) => GeolocationInstance
}

interface GeolocationInstance {
  getCurrentPosition(cb: (status: string, result: any) => void): void
}

interface GeocodeResult {
  lng: number
  lat: number
  province?: string
  city?: string
  district?: string
  address?: string
}

export function loadAMap(): Promise<AMapLike> {
  if (window.AMap) return Promise.resolve(window.AMap as AMapLike)
  if (loadPromise) return loadPromise

  const key = import.meta.env.VITE_AMAP_JS_KEY as string | undefined
  if (!key) {
    return Promise.reject(new Error('AMAP_JS_KEY_MISSING'))
  }

  // 注意：这把 JS Key 在控制台启用了「安全密钥」，但这里**故意不配 jscode / serviceHost**。
  // 实测底图、marker、缩放、覆盖物、地图选点都不校验 jscode；只有 PlaceSearch / Geocoder
  // 这类检索服务需要它，而这两种能力本工程的正确做法是走服务端 Web服务 Key：
  //   地址解析 → Edge Function `amap_geocode`
  //   POI 搜索 → Edge Function `amap-place`
  // 于是密钥完全不进前端。serviceHost 代理这条路已实测否决：高德对 platform=JS 的
  // restapi 请求从 Supabase 出口 IP 一律回 SERVICE_NOT_AVAILABLE(10002)。
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    // 只加载 Geolocation：PlaceSearch / Geocoder 已改走服务端 Edge Function，
    // 前端不再需要它们，也就不需要 JS Key 的安全密钥。
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Geolocation`
    script.async = true
    script.onload = () => {
      if (window.AMap) resolve(window.AMap as AMapLike)
      else reject(new Error('AMAP_LOAD_FAILED'))
    }
    script.onerror = () => {
      loadPromise = null
      reject(new Error('AMAP_LOAD_FAILED'))
    }
    document.head.appendChild(script)
  })
  return loadPromise
}

export interface AMapStatus {
  ok: boolean
  error?: string
}

export async function amapStatus(): Promise<AMapStatus> {
  try {
    await loadAMap()
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'AMAP_LOAD_FAILED',
    }
  }
}

/** 地址转坐标：通过 Edge Function 调用高德 Web Key，服务端密钥不进入前端。 */
export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  const query = address.trim()
  if (!query) return null

  try {
    const { data, error } = await supabase.functions.invoke<{
      geocodes?: Array<{
        location?: string
        province?: string
        city?: string
        district?: string
        formatted_address?: string
      }>
    }>('amap_geocode', { body: { address: query } })

    if (error || !data?.geocodes?.[0]?.location) return null

    const [lngText, latText] = data.geocodes[0].location.split(',')
    const lng = Number(lngText)
    const lat = Number(latText)
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null

    const hit = data.geocodes[0]
    return {
      lng,
      lat,
      province: hit.province,
      city: hit.city,
      district: hit.district,
      address: hit.formatted_address || query,
    }
  } catch {
    return null
  }
}

/**
 * POI 搜索：供地图搜索框使用。
 * 走 Edge Function `amap-place`（服务端 Web服务 Key），不再用前端 AMap.PlaceSearch ——
 * 后者要求 JS Key 的安全密钥，会把密钥暴露到构建产物。签名与返回结构保持原样，
 * 调用方无需改动。
 */
export async function searchPlaces(
  keyword: string,
  center?: { lng: number; lat: number },
): Promise<Array<{ name: string; address?: string; location: { lng: number; lat: number } }>> {
  const query = keyword.trim()
  if (!query) return []
  const { data, error } = await supabase.functions.invoke<{
    results?: Array<{ name: string; address?: string; location: { lng: number; lat: number } }>
  }>('amap-place', { body: { keywords: query, center, radius: 5000, limit: 10 } })
  if (error || !data?.results) return []
  return data.results
}

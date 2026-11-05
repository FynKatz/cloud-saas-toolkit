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
  Geocoder: new (opts: Record<string, unknown>) => GeocoderInstance
  PlaceSearch: new (opts: Record<string, unknown>) => PlaceSearchInstance
  Geolocation: new (opts: Record<string, unknown>) => GeolocationInstance
}

interface GeocoderInstance {
  getLocation(
    query: string,
    cb: (
      status: string,
      result: { geocodes?: Array<{ location: { lng: number; lat: number } }> },
    ) => void,
  ): void
}

interface PlaceSearchInstance {
  search(
    keyword: string,
    cb: (
      status: string,
      result: { poiList?: { pois?: Array<{ name: string; address?: string; location: { lng: number; lat: number } }> } },
    ) => void,
  ): void
  searchNearBy(
    keyword: string,
    center: { lng: number; lat: number },
    radius: number,
    cb: (
      status: string,
      result: { poiList?: { pois?: Array<{ name: string; address?: string; location: { lng: number; lat: number } }> } },
    ) => void,
  ): void
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

/** 插件通过 script.onload 后可能仍异步就绪，轮询等待，避免 AMap.Geocoder 未定义。 */
async function waitForPlugin(ready: () => boolean, timeoutMs = 8000): Promise<void> {
  const end = Date.now() + timeoutMs
  while (!ready()) {
    if (Date.now() > end) throw new Error('AMAP_PLUGIN_READY_TIMEOUT')
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

export function loadAMap(): Promise<AMapLike> {
  if (window.AMap) return Promise.resolve(window.AMap as AMapLike)
  if (loadPromise) return loadPromise

  const key = import.meta.env.VITE_AMAP_JS_KEY as string | undefined
  if (!key) {
    return Promise.reject(new Error('AMAP_JS_KEY_MISSING'))
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(key)}&plugin=AMap.Geolocation,AMap.PlaceSearch,AMap.Geocoder`
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

/** 周边 POI 搜索：供地图搜索框使用。 */
export async function searchPlaces(
  keyword: string,
  center?: { lng: number; lat: number },
): Promise<Array<{ name: string; address?: string; location: { lng: number; lat: number } }>> {
  const AMap = await loadAMap()
  await waitForPlugin(() => typeof AMap.PlaceSearch === 'function')
  return new Promise((resolve) => {
    const place = new AMap.PlaceSearch({
      pageSize: 10,
      pageIndex: 1,
      citylimit: false,
    })
    const done = (status: string, result: { poiList?: { pois?: Array<{ name: string; address?: string; location: { lng: number; lat: number } }> } }) => {
      if (status === 'complete' && result.poiList?.pois?.length) {
        resolve(result.poiList.pois)
      } else {
        resolve([])
      }
    }
    if (center) {
      place.searchNearBy(keyword, center, 5000, done)
    } else {
      place.search(keyword, done)
    }
  })
}

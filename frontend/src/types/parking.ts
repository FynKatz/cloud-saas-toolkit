export type ParkingStatus = 'active' | 'inactive'

export interface RegionRow {
  province_code: string
  province_name: string
  city_code: string
  city_name: string
  district_code: string
  district_name: string
  active: boolean
  sort_order: number
  updated_at: string
}

export interface ParkingMall {
  id: string
  name: string
  province: string | null
  city: string | null
  district: string | null
  province_code: string | null
  city_code: string | null
  district_code: string | null
  address: string | null
  status: ParkingStatus
  user_id: string
  created_at: string
  updated_at: string
}

export interface ParkingLocationPoint {
  lng: number
  lat: number
  address?: string | null
  poi?: string | null
}

export interface ParkingLocation {
  id: string
  name: string
  province_code: string | null
  province: string | null
  city_code: string | null
  city: string | null
  district_code: string | null
  district: string | null
  mall_id: string | null
  mall: string | null
  address: string | null
  location: ParkingLocationPoint | null
  free_duration: number | null
  charge_interval: number | null
  day_price: number | null
  night_price: number | null
  day_unit: string | null
  night_unit: string | null
  notes: string | null
  images: readonly string[] | null
  status: ParkingStatus
  user_id: string
  created_at: string
  updated_at: string
  is_favorited?: boolean
}

export interface CreateParkingPayload {
  name: string
  mall_id?: string | null
  province?: string | null
  province_code?: string | null
  city?: string | null
  city_code?: string | null
  district?: string | null
  district_code?: string | null
  mall?: string | null
  address?: string | null
  location?: ParkingLocationPoint | null
  free_duration?: number | null
  charge_interval?: number | null
  day_price?: number | null
  night_price?: number | null
  day_unit?: string | null
  night_unit?: string | null
  notes?: string | null
  images?: string[] | null
}

export interface ParkingImageFile {
  path: string
  signedUrl?: string
}

#!/usr/bin/env node
/*
 * 从高德行政区接口生成全国省市县 seed（不含港澳台）。
 *
 * 用法：
 *   AMAP_WEB_KEY=<key> node scripts/build-regions-seed.mjs
 *   node scripts/build-regions-seed.mjs --from /tmp/amap-districts.json
 *
 * 输出：supabase/seed/regions/regions.sql
 */

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'

const fromArg = process.argv.findIndex((a) => a === '--from')
const localFile = fromArg !== -1 ? process.argv[fromArg + 1] : ''

let data
if (localFile) {
  data = JSON.parse(readFileSync(localFile, 'utf8'))
} else {
  const key = process.env.AMAP_WEB_KEY
  if (!key) {
    console.error('AMAP_WEB_KEY not set (or pass --from <local-json>)')
    process.exit(2)
  }

  const url =
    'https://restapi.amap.com/v3/config/district?keywords=%E4%B8%AD%E5%9B%BD&subdistrict=3&extensions=base&key=' +
    encodeURIComponent(key)

  const res = await fetch(url, {
    signal: AbortSignal.timeout(60000),
  })
  if (!res.ok) throw new Error(`amap http ${res.status}`)
  data = await res.json()
}
if (data.status !== '1') throw new Error('amap: ' + (data.info || 'request failed'))

const root = data.districts?.[0]
if (!root?.districts) throw new Error('amap: no district root')

const rows = []
const excluded = new Set(['710000', '810000', '820000']) // 台港澳

let provinceSort = 0
for (const province of root.districts) {
  if (excluded.has(province.adcode)) continue
  provinceSort += 1
  const cities = province.districts?.length ? province.districts : []
  for (const city of cities) {
    const districts = (city.districts || []).filter((d) => d.level === 'district')
    if (districts.length === 0) {
      // 直辖市/省管县等二级结构下没有区县，用区代码本身占一行，保证市有可选项
      rows.push({
        province_code: province.adcode,
        province_name: province.name,
        city_code: city.adcode,
        city_name: city.name,
        district_code: city.adcode,
        district_name: city.name,
        sort_order: provinceSort,
      })
    } else {
      for (const district of districts) {
        rows.push({
          province_code: province.adcode,
          province_name: province.name,
          city_code: city.adcode,
          city_name: city.name,
          district_code: district.adcode,
          district_name: district.name,
          sort_order: provinceSort,
        })
      }
    }
  }
}

const seen = new Set()
const dupes = []
for (const r of rows) {
  if (seen.has(r.district_code)) dupes.push(r.district_code)
  seen.add(r.district_code)
}
if (dupes.length) throw new Error('duplicate district_code: ' + [...new Set(dupes)].join(','))

const esc = (s) => String(s ?? '').replace(/'/g, "''")
const inserts = rows
  .map(
    (r) =>
      `('${esc(r.province_code)}', '${esc(r.province_name)}', '${esc(r.city_code)}', ` +
      `'${esc(r.city_name)}', '${esc(r.district_code)}', '${esc(r.district_name)}', true, ${r.sort_order}, now())`,
  )
  .join(',\n')

const sql = `-- 全国省市县行政区（来源：高德行政区划接口 subdistrict=3，不含港澳台）
-- 生成时间：${new Date().toISOString()}（生成脚本：scripts/build-regions-seed.mjs）

insert into public.regions
  (province_code, province_name, city_code, city_name,
   district_code, district_name, active, sort_order, updated_at)
values
${inserts}
on conflict (district_code) do update set
  province_code = excluded.province_code,
  province_name = excluded.province_name,
  city_code = excluded.city_code,
  city_name = excluded.city_name,
  district_name = excluded.district_name,
  active = true,
  sort_order = excluded.sort_order,
  updated_at = now();
`

mkdirSync('supabase/seed/regions', { recursive: true })
writeFileSync('supabase/seed/regions/regions.sql', sql)
console.log(`regions.sql generated: ${rows.length} rows (31 provinces, no HK/MO/TW)`)

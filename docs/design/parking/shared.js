window.MOCK_PARKING_LOTS = [
  {
    id: 'p1',
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    name: '陆家嘴中心 L+Mall 停车场',
    address: '浦东南路 899 号',
    lng: 121.509,
    lat: 31.239,
    free: 15,
    interval: 30,
    dayPrice: 8,
    dayUnit: '元/小时',
    nightPrice: 1,
    nightUnit: '元/小时',
    images: 3,
    favorite: true,
    note: '地铁 2 号线陆家嘴站 6 号口直达，B2 层新能源车位 40 个。',
  },
  {
    id: 'p2',
    province: '上海市',
    city: '上海市',
    district: '静安区',
    name: '静安嘉里中心停车场',
    address: '南京西路 1515 号',
    lng: 121.446,
    lat: 31.224,
    free: 0,
    interval: 15,
    dayPrice: 12,
    dayUnit: '元/小时',
    nightPrice: 5,
    nightUnit: '元/小时',
    images: 5,
    favorite: true,
    note: '商场会员 300 积分可兑换 1 小时停车券。',
  },
  {
    id: 'p3',
    province: '浙江省',
    city: '杭州市',
    district: '西湖区',
    name: '杭州湖滨银泰 in77 停车场',
    address: '延安路 258 号',
    lng: 120.164,
    lat: 30.252,
    free: 0,
    interval: 30,
    dayPrice: 10,
    dayUnit: '元/小时',
    nightPrice: 4,
    nightUnit: '元/小时',
    images: 2,
    favorite: false,
    note: '节假日建议 10:00 前到达，地下车位紧张。',
  },
  {
    id: 'p4',
    province: '广东省',
    city: '广州市',
    district: '天河区',
    name: '太古汇停车场',
    address: '天河路 383 号',
    lng: 113.331,
    lat: 23.135,
    free: 30,
    interval: 60,
    dayPrice: 16,
    dayUnit: '元/小时',
    nightPrice: 10,
    nightUnit: '元/次',
    images: 1,
    favorite: false,
    note: '早 10 点前入场立减 5 元。',
  },
]

window.MOCK_DIVISIONS = [
  { code: '310000', name: '上海市', level: 'province', parent: '' },
  { code: '310100', name: '上海市', level: 'city', parent: '310000' },
  { code: '310115', name: '浦东新区', level: 'district', parent: '310100' },
  { code: '310106', name: '静安区', level: 'district', parent: '310100' },
  { code: '330000', name: '浙江省', level: 'province', parent: '' },
  { code: '330100', name: '杭州市', level: 'city', parent: '330000' },
  { code: '330106', name: '西湖区', level: 'district', parent: '330100' },
  { code: '440000', name: '广东省', level: 'province', parent: '' },
  { code: '440100', name: '广州市', level: 'city', parent: '440000' },
  { code: '440106', name: '天河区', level: 'district', parent: '440100' },
]

window.MOCK_MALLS = [
  { id: 'm1', province: '上海市', city: '上海市', district: '浦东新区', name: '陆家嘴中心 L+Mall', address: '浦东南路 899 号', active: true },
  { id: 'm2', province: '上海市', city: '上海市', district: '静安区', name: '静安嘉里中心', address: '南京西路 1515 号', active: true },
  { id: 'm3', province: '浙江省', city: '杭州市', district: '西湖区', name: '杭州湖滨银泰 in77', address: '延安路 258 号', active: true },
  { id: 'm4', province: '广东省', city: '广州市', district: '天河区', name: '太古汇', address: '天河路 383 号', active: false },
]

window.parkingFilters = {
  query: '',
  province: '',
  city: '',
  district: '',
  mall: '',
  favorite: false,
}

window.parkingState = {
  drawer: null,
  editing: null,
  detail: null,
  mapSidebarOpen: true,
  dayMode: true,
}

function applyFilters(list) {
  const q = window.parkingFilters.query.trim().toLowerCase()
  return list.filter((r) => {
    if (window.parkingFilters.favorite && !r.favorite) return false
    if (window.parkingFilters.province && r.province !== window.parkingFilters.province) return false
    if (window.parkingFilters.city && r.city !== window.parkingFilters.city) return false
    if (window.parkingFilters.district && r.district !== window.parkingFilters.district) return false
    if (window.parkingFilters.mall && r.name !== window.parkingFilters.mall) return false
    if (!q) return true
    return [r.province, r.city, r.district, r.name, r.address, r.note].join(' ').toLowerCase().includes(q)
  })
}

function price(record, kind) {
  const v = kind === 'day' ? record.dayPrice : record.nightPrice
  const u = kind === 'day' ? record.dayUnit : record.nightUnit
  return `${v} ${u}`
}

function mkMap() {
  if (typeof window.initParkingMap === 'function') {
    window.initParkingMap()
  }
}

function icon(name, cls = 'icon') {
  const paths = {
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>',
    moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
    menu: '<line x1="4" x2="20" y1="7" y2="7"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="17" y2="17"/>',
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 2 2.7 6.1 6.3.7-4.7 4.3 1.3 6.2L12 16.7 6.4 19.3l1.3-6.2L3 8.8l6.3-.7L12 2Z"/>',
    car: '<path d="M5 11 7 7a2 2 0 0 1 1.8-1h6.4A2 2 0 0 1 17 7l2 4"/><path d="M3 11h18v5H3z"/><circle cx="7.5" cy="16" r="1.3"/><circle cx="16.5" cy="16" r="1.3"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
    database: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    zap: '<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/>',
    box: '<path d="M21 8V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v2"/><path d="M3 8v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8"/><path d="M12 3v6a3 3 0 0 1-3 3H3"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M6 14h.01M18 14h.01M9 14h6"/>',
    hash: '<path d="M4 9h16M4 15h16M10 3 8 21M16 3l-2 18"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
    puzzle: '<path d="M19.4 15a1.6 1.6 0 0 0 .6 3.1V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1 1.6 1.6 0 1 0 0-3.2H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h7a1 1 0 0 1 1 1 1.6 1.6 0 1 0 3.2 0 1 1 0 0 1 1-1H19a1 1 0 0 1 1 1v1.6a1.6 1.6 0 1 0 0 3.2V15Z"/>',
    heading: '<path d="M6 4v16M18 4v16M6 12h12"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    mapPin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    edit: '<path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M10 11v6M14 11v6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    navigation: '<path d="m3 11 19-9-9 19-2-8-8-2Z"/>',
    layers: '<path d="m12 2 8.5 4.5L12 11 3.5 6.5 12 2Z"/><path d="m3.5 11.5 8.5 4.5 8.5-4.5"/><path d="m3.5 16.5 8.5 4.5 8.5-4.5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-2.6-6.3L21 8"/><path d="M21 3v5h-5"/>',
    filter: '<path d="M22 3H2l8 9.5V19l4 2v-8.5L22 3Z"/>',
    external: '<path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    more: '<circle cx="12" cy="5" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="12" cy="19" r="1"/>',
    copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  }
  const inner = paths[name] || paths.grid
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`
}

function shell(topTitle, page) {
  const navGroups = [
    {
      name: '速查参考',
      items: [
        ['SQL 速查', 'database', '#'],
        ['Redis 速查', 'zap', '#'],
        ['Docker & K8S 速查', 'box', '#'],
        ['Typora 快捷键', 'keyboard', '#'],
      ],
    },
    {
      name: '数据应用',
      items: [
        ['停车收费', 'car', '#parking-table', true],
        ['Todo', 'list', '#'],
        ['家庭电影', 'film', '#'],
      ],
    },
    {
      name: '图形工具',
      items: [
        ['图片拼接', 'image', '#'],
        ['Pixabay 下载', 'image', '#'],
      ],
    },
    {
      name: '文本工具',
      items: [
        ['字数统计', 'hash', '#'],
        ['Chrome 扩展打包', 'puzzle', '#'],
        ['Markdown 标题工具', 'heading', '#'],
      ],
    },
  ]
  const adminItems = [
    ['用户管理', 'users', '/admin/users'],
    ['系统通知', 'bell', '/admin/notifications'],
    ['角色权限', 'shield', '/admin/roles'],
    ['审计日志', 'file', '/admin/audit-logs'],
    ['数据管理', 'layers', '/admin/data', true],
  ]

  const groupHtml = navGroups.map((g, gi) => `
    <div class="nav-group ${gi > 0 ? 'closed' : ''}">
      <button class="nav-group-header" onclick="toggleGroup(this)">
        <span class="grp-dot"></span><span class="group-head-text">${g.name}</span>
        ${icon('chevronRight', 'chev')}
      </button>
      <div class="nav-items">
        ${g.items.map(([label, ic, href, active]) => `
          <a class="nav-item ${active ? 'active' : ''}" href="${href}">${icon(ic)}<span class="nav-label">${label}</span></a>
        `).join('')}
      </div>
    </div>`).join('')

  const adminHtml = `
    <div class="nav-group">
      <button class="nav-group-header" onclick="toggleGroup(this)">
        <span class="grp-dot"></span><span class="group-head-text">管理面板</span>
        ${icon('chevronRight', 'chev open')}
      </button>
      <div class="nav-items">
        ${adminItems.map(([label, ic, href, active]) => `
          <a class="nav-item ${active ? 'active' : ''}" href="${href}">${icon(ic)}<span class="nav-label">${label}</span></a>
        `).join('')}
      </div>
    </div>`

  return `
  <div class="app">
    <aside class="sidebar" id="sidebar">
      <div class="brand">
        <div class="brand-logo">C</div>
        <div class="brand-name">Cloud Toolkit</div>
      </div>
      <nav class="nav">
        <div class="fixed-nav">
          <a class="nav-item" href="#"><span class="skeleton-icon">${icon('grid', 'icon-lg')}</span><span class="nav-label">概览</span></a>
          <a class="nav-item" href="#"><span class="skeleton-icon">${icon('clock', 'icon-lg')}</span><span class="nav-label">最近使用</span></a>
          <a class="nav-item" href="#"><span class="skeleton-icon">${icon('star', 'icon-lg')}</span><span class="nav-label">收藏</span></a>
        </div>
        <div class="divider-text">工具分组</div>
        ${groupHtml}
        ${adminHtml}
      </nav>
      <div class="side-card"><h4>Cloud Toolkit</h4><p>速查、数据与图形文本工具的统一入口，权限与菜单已收口。</p><button>回到概览</button></div>
      <div class="sidebar-footer">
        <div class="user-row"><div class="user-dot">FY</div><div><div class="user-text">FynKatz · Admin</div><div class="footer-text">系统管理员</div></div></div>
      </div>
    </aside>
    <div class="main">
      <header class="topbar">
        <div class="breadcrumb">Cloud Toolkit <span>/</span> <strong>${topTitle}</strong></div>
        <div class="topbar-right">
          <button class="theme-btn" title="切换主题" onclick="toggleTheme()">${icon('sun')}</button>
          <div class="avatar">FY</div>
        </div>
      </header>
      <main class="content" id="mainContent">${page}</main>
    </div>
  </div>`
}

function toggleTheme() {
  document.body.classList.toggle('dark')
  const btn = document.querySelector('.theme-btn')
  if (btn) btn.innerHTML = icon(document.body.classList.contains('dark') ? 'sun' : 'moon')
}

function toggleGroup(btn) {
  const group = btn.closest('.nav-group')
  group.classList.toggle('closed')
  const chev = group.querySelector('.chev')
  chev.classList.toggle('open')
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('collapsed')
}

function toggleFavorite(id) {
  const record = window.MOCK_PARKING_LOTS.find(r => r.id === id)
  if (record) {
    record.favorite = !record.favorite
    if (window.renderPageSpecific) window.renderPageSpecific()
    if (window.renderList) window.renderList()
    const toast = document.createElement('div')
    toast.className = 'toast'
    toast.innerHTML = `${icon('star')}${record.favorite ? '已收藏' : '已取消收藏'}`
    document.body.appendChild(toast)
    setTimeout(() => toast.remove(), 1400)
  }
}

function openDrawer(kind, record) {
  window.parkingState.drawer = kind
  window.parkingState.editing = record ? { ...record } : null
  window.parkingState.detail = record || null
  if (kind === 'form') {
    window.formDraft = record ? { ...record } : {
      province: '', city: '', district: '', name: '', address: '',
      free: 15, interval: 30, dayPrice: 8, dayUnit: '元/小时',
      nightPrice: 1, nightUnit: '元/小时', images: 0, note: '',
    }
  } else {
    window.formDraft = null
  }
  renderDrawer()
}

function closeDrawer() {
  window.parkingState.drawer = null
  window.parkingState.editing = null
  window.parkingState.detail = null
  window.formDraft = null
  const el = document.getElementById('drawerRoot')
  if (el) el.innerHTML = ''
}

function renderForm(detail) {
  const r = window.formDraft || detail || {}
  const divisions = window.MOCK_DIVISIONS
  const provinces = divisions.filter(d => d.level === 'province')
  const cities = divisions.filter(d => d.level === 'city' && (!r.province || d.parent === provinces.find(p => p.name === r.province)?.code))
  const districts = divisions.filter(d => d.level === 'district' && (!r.city || d.parent === cities.find(c => c.name === r.city)?.code))
  const malls = window.MOCK_MALLS.filter(m => m.active)
  const units = ['元/小时', '元/分钟', '元/次', '元/天']
  const unitOptions = (selected) => units.map(u => `<option${u === selected ? ' selected' : ''}>${u}</option>`).join('')
  return `
    <div class="form-grid">
      <div class="field">
        <label class="form-label">省份</label>
        <select class="select-wide" onchange="window.formDraft.province=this.value;window.formDraft.city='';window.formDraft.district='';renderDrawer()">
          <option value="">请选择省份</option>
          ${provinces.map(p => `<option ${r.province === p.name ? 'selected' : ''}>${p.name}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="form-label">城市</label>
        <select class="select-wide" onchange="window.formDraft.city=this.value;window.formDraft.district='';renderDrawer()">
          <option value="">请选择城市</option>
          ${cities.map(c => `<option ${r.city === c.name ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="form-label">行政区</label>
        <select class="select-wide" onchange="window.formDraft.district=this.value;renderDrawer()">
          <option value="">请选择行政区</option>
          ${districts.map(d => `<option ${r.district === d.name ? 'selected' : ''}>${d.name}</option>`).join('')}
        </select>
      </div>
      <div class="field">
        <label class="form-label">商场</label>
        <div class="input-append">
          <select class="select-wide" onchange="window.formDraft.mall=this.value;renderDrawer()">
            <option value="">请选择或输入商场</option>
            ${malls.filter(m => !r.province || m.province === r.province).map(m => `<option ${r.name === m.name ? 'selected' : ''}>${m.name}</option>`).join('')}
          </select>
          <button class="btn btn-icon" title="新增商场" onclick="alert('新增商场（表单内交互示意）')">${icon('plus')}</button>
        </div>
      </div>
      <div class="field full">
        <label class="form-label">详细地址</label>
        <input class="input" value="${r.address || ''}" placeholder="例如：浦东南路 899 号" oninput="window.formDraft.address=this.value" />
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('mapPin')}地图定位</div>
      <div class="map-preview form-map" id="form-map">
        <canvas width="900" height="420"></canvas>
        <div class="map-marker"></div>
        <div class="map-actions">
        <button class="btn btn-sm">${icon('search')}搜索地点</button>
        <button class="btn btn-sm">${icon('navigation')}当前定位</button>
      </div>
      <div class="map-caption">${icon('mapPin')}<span id="formMapCaption">选择位置后，地址与经纬度会自动写入</span></div>
    </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('car')}停车收费</div>
      <div class="form-grid">
        <div class="field">
          <label class="form-label">免费时长（分钟）</label>
          <input class="input" type="number" value="${r.free}" min="0" oninput="window.formDraft.free=this.value" />
        </div>
        <div class="field">
          <label class="form-label">重新计费（分钟）</label>
          <input class="input" type="number" value="${r.interval}" min="0" oninput="window.formDraft.interval=this.value" />
        </div>
        <div class="field">
          <label class="form-label">日间价格</label>
          <div class="input-append">
            <input class="input" type="number" value="${r.dayPrice}" min="0" step="0.01" oninput="window.formDraft.dayPrice=this.value" />
            <select class="select unit-select" onchange="window.formDraft.dayUnit=this.value">
              ${unitOptions(r.dayUnit)}
            </select>
          </div>
        </div>
        <div class="field">
          <label class="form-label">夜间价格</label>
          <div class="input-append">
            <input class="input" type="number" value="${r.nightPrice}" min="0" step="0.01" oninput="window.formDraft.nightPrice=this.value" />
            <select class="select unit-select" onchange="window.formDraft.nightUnit=this.value">
              ${unitOptions(r.nightUnit)}
            </select>
          </div>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('image')}图片</div>
      <div class="thumb-grid">
        ${[0,1,2,3,4].map(i => `<div class="thumb">${icon('image')}</div>`).join('')}
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('file')}备注</div>
      <textarea class="textarea" placeholder="其他需要注意的信息" oninput="window.formDraft.note=this.value">${r.note || ''}</textarea>
    </div>`
}

function renderDetail(record) {
  return `
    <div class="form-section" style="margin-top:0;padding-top:0;border-top:none">
      <div class="inline-row" style="justify-content:space-between">
        <span class="chip chip-violet">${record.province} · ${record.district}</span>
        <span class="tag">${record.favorite ? '已收藏' : '常用'}</span>
      </div>
      <h3 style="margin:14px 0 4px;font-size:16px;font-weight:680">${record.mall}</h3>
      <p style="margin:0;color:var(--ink-2);font-size:12.5px">${record.address}</p>
    </div>
    <div class="map-preview" style="height:240px;margin-top:16px">
      <canvas width="900" height="460"></canvas>
      <div class="map-marker"></div>
      <div class="map-caption">${icon('mapPin')}<span>${record.lng}, ${record.lat}</span></div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('car')}收费规则</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div class="panel" style="padding:13px 14px">
          <div class="tag-muted">免费时长</div>
          <div style="font-size:20px;font-weight:680;margin-top:3px">${record.free} 分钟</div>
        </div>
        <div class="panel" style="padding:13px 14px">
          <div class="tag-muted">重新计费</div>
          <div style="font-size:20px;font-weight:680;margin-top:3px">${record.interval} 分钟</div>
        </div>
        <div class="panel" style="padding:13px 14px">
          <div class="tag-muted">日间</div>
          <div style="font-size:20px;font-weight:680;margin-top:3px">${price(record, 'day')}</div>
        </div>
        <div class="panel" style="padding:13px 14px">
          <div class="tag-muted">夜间</div>
          <div style="font-size:20px;font-weight:680;margin-top:3px">${price(record, 'night')}</div>
        </div>
      </div>
    </div>
    <div class="form-section">
      <div class="form-section-title">${icon('image')}${record.images} 张现场图片</div>
      <div class="thumb-grid">
        ${[0,1,2,3,4].map(i => `<div class="thumb">${icon('image')}</div>`).join('')}
      </div>
    </div>
    ${record.note ? `<div class="form-section"><div class="form-section-title">${icon('file')}备注</div><div class="panel" style="padding:13px 14px;color:var(--ink-2);font-size:12.5px">${record.note}</div></div>` : ''}
  `
}

function renderDrawer() {
  const root = document.getElementById('drawerRoot')
  const state = window.parkingState
  if (!root || !state.drawer) return
  let body = ''
  let title = ''
  let foot = ''
  if (state.drawer === 'detail' && state.detail) {
    title = '停车场详情'
    body = renderDetail(state.detail)
    foot = `
      <button class="btn" onclick="closeDrawer()">关闭</button>
      <button class="btn" onclick="toggleFavorite('${state.detail.id}');closeDrawer()">${icon('star')}${state.detail.favorite ? '取消收藏' : '收藏停车场'}</button>
      <button class="btn btn-primary" onclick="openDrawer('form',${JSON.stringify(state.detail).replace(/"/g, '&quot;')})">${icon('edit')}编辑</button>`
  } else if (state.drawer === 'form') {
    title = state.editing ? '编辑停车场' : '添加停车场'
    body = renderForm(window.formDraft)
    foot = `<button class="btn" onclick="closeDrawer()">取消</button><button class="btn btn-primary" onclick="saveForm()">${icon('check')}保存</button>`
  }
  root.innerHTML = `
    <div class="overlay" onclick="if(event.target===this)closeDrawer()">
      <div class="drawer wide">
        <div class="drawer-head"><div><h2>${title}</h2><p>${state.drawer === 'detail' ? '查看位置、收费规则与现场图片' : '常用停车场的位置、收费与现场图片一次录入'}</p></div><button class="btn btn-icon" onclick="closeDrawer()">${icon('x')}</button></div>
        <div class="drawer-body">${body}</div>
        <div class="drawer-foot">${foot}</div>
      </div>
    </div>`
  requestAnimationFrame(() => mkMap())
}

function saveForm() {
  closeDrawer()
  const toast = document.createElement('div')
  toast.className = 'toast'
  toast.innerHTML = `${icon('check')}停车场已保存`
  document.body.appendChild(toast)
  setTimeout(() => toast.remove(), 1800)
}

function setFilter(key, value) {
  window.parkingFilters[key] = value
  if (key === 'province') { window.parkingFilters.city = ''; window.parkingFilters.district = '' }
  if (key === 'city') window.parkingFilters.district = ''
  renderList()
  if (window.renderPageSpecific) window.renderPageSpecific()
}

function filterOptions(kind) {
  const divisions = window.MOCK_DIVISIONS
  const f = window.parkingFilters
  if (kind === 'province') return divisions.filter(d => d.level === 'province')
  if (kind === 'city') {
    const p = divisions.find(d => d.level === 'province' && d.name === f.province)
    return divisions.filter(d => d.level === 'city' && (!p || d.parent === p.code))
  }
  if (kind === 'district') {
    const p = divisions.find(d => d.level === 'province' && d.name === f.province)
    const c = divisions.find(d => d.level === 'city' && d.name === f.city)
    return divisions.filter(d => d.level === 'district' && (!c || d.parent === c.code))
  }
  if (kind === 'mall') return window.MOCK_MALLS.filter(m => (!f.province || m.province === f.province) && m.active)
  return []
}

function renderList() {
  const list = applyFilters(window.MOCK_PARKING_LOTS)
  const root = document.getElementById('parkingRecords')
  if (!root) return
  if (!list.length) {
    root.innerHTML = `<div class="empty-state">${icon('car')}<div style="font-size:13px;color:var(--ink-2)">没有符合条件的停车场</div><button class="btn btn-sm" onclick="resetFilters()">清除筛选</button></div>`
    return
  }
  root.innerHTML = list.map(r => `
    <div class="record-row" onclick="openDrawer('detail',${JSON.stringify(r).replace(/"/g, '&quot;')})">
      <div class="thumb thumb-sm">${icon('image')}</div>
      <div class="row-main">
        <div class="row-title">${r.name}<span class="chip">${r.district}</span></div>
        <div class="row-meta">${r.address}</div>
      </div>
      <div class="price-cell"><div class="price-value">${r.dayPrice}<span>${r.dayUnit}</span></div><div class="row-meta">日间</div></div>
      <div class="price-cell"><div class="price-value">${r.nightPrice}<span>${r.nightUnit}</span></div><div class="row-meta">夜间</div></div>
      <div class="free-cell"><div class="free-badge">免费 ${r.free} 分钟</div><div class="row-meta">${r.interval} 分钟重新计费</div></div>
    </div>`).join('')
}

function resetFilters() {
  window.parkingFilters = { query: '', province: '', city: '', district: '', mall: '', favorite: false }
  const inputs = document.querySelectorAll('.filter-input, .filter-select')
  inputs.forEach((el, i) => {
    if (el.tagName === 'INPUT') el.value = ''
    else el.value = ''
  })
  renderList()
}

function drawFakeMap(canvas) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const w = canvas.width = canvas.offsetWidth * 2
  const h = canvas.height = canvas.offsetHeight * 2
  ctx.scale(2, 2)
  const dark = document.body.classList.contains('dark')
  ctx.fillStyle = dark ? '#17181d' : '#eef0f6'
  ctx.fillRect(0, 0, w / 2, h / 2)
  const road = dark ? '#24262e' : '#ffffff'
  ctx.strokeStyle = road
  ctx.lineWidth = 14
  for (let i = 0; i < 14; i++) {
    const x = (i * 93) % (w / 2)
    const y = (i * 67) % (h / 2)
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w / 2, y); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h / 2); ctx.stroke()
  }
  ctx.strokeStyle = dark ? '#2e3139' : '#d9dde8'
  ctx.lineWidth = 3
  for (let i = 0; i < 24; i++) {
    ctx.beginPath(); ctx.arc((i * 41) % (w / 2), (i * 29) % (h / 2), 4, 0, 7); ctx.stroke()
  }
  ctx.fillStyle = dark ? '#1d1f26' : '#f7f8fb'
  ctx.fillRect(w / 2 - 260, h / 2 - 240, 160, 120)
  ctx.fillRect(w / 2 + 40, h / 2 - 160, 190, 100)
}

function mkMap() {
  requestAnimationFrame(() => {
    document.querySelectorAll('.map-preview canvas').forEach(c => drawFakeMap(c))
    const formMap = document.getElementById('formMapCaption')
    if (formMap) {
      const r = window.formDraft || {}
      formMap.textContent = r.name
        ? (r.lng ? `已定位到 ${r.name} · ${r.lng}, ${r.lat}，可拖动 Pin 微调位置` : `已关联 ${r.name}，请点击地图确认精确位置`)
        : '选择位置后，地址与经纬度会自动写入记录'
    }
  })
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.renderPage) window.renderPage()
  document.querySelectorAll('.map-preview canvas').forEach(c => drawFakeMap(c))
})

// 停车管理系统主JavaScript文件
// 初始化全局变量
let supabase;
let currentUser = null;
let isSupabaseLoaded = false;
let isAppInitialized = false;
let debugEnabled = true; // 默认开启调试模式以便排查问题
let allParkingData = [];
let uploadedImages = [];
let existingImages = [];
let imagesToDelete = [];
let map;
let marker;
let geocoder;
let currentPosition = null;
let placeSearch;
let geolocation;
let pendingMapInit = [];

// 百度地图API加载状态
window.BaiduMapLoaded = false;

// 显示调试信息
function logDebug(message) {
    if (!debugEnabled) return;

    const debugEl = document.getElementById('debug-info');
    if (debugEl) {
        const timestamp = new Date().toLocaleTimeString();
        debugEl.innerHTML += `[${timestamp}] ${message}<br>`;
        debugEl.scrollTop = debugEl.scrollHeight;
    }
    console.log(message);
}

// 切换调试信息显示
function toggleDebugInfo() {
    debugEnabled = !debugEnabled;
    const debugEl = document.getElementById('debug-info');
    if (debugEl) {
        debugEl.style.display = debugEnabled ? 'block' : 'none';
    }

    logDebug('调试模式已' + (debugEnabled ? '启用' : '禁用'));
}

// 显示加载状态
function showLoading(message = '正在加载...') {
    logDebug(`显示加载状态: ${message}`);
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.querySelector('p').textContent = message;
        loadingEl.style.display = 'flex';
    }
}

// 隐藏加载状态
function hideLoading() {
    logDebug('隐藏加载状态');
    const loadingEl = document.getElementById('loading');
    if (loadingEl) {
        loadingEl.style.display = 'none';
    }
}

// 检查配置是否完整
function checkConfig() {
    logDebug('检查配置完整性');

    if (!SUPABASE_URL || SUPABASE_URL === 'https://your-project.supabase.co' || SUPABASE_URL.includes('your-project')) {
        logDebug('错误: SUPABASE_URL 未正确配置');
        return false;
    }

    if (!SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'your-anon-key') {
        logDebug('错误: SUPABASE_ANON_KEY 未正确配置');
        return false;
    }

    logDebug('配置检查通过');
    return true;
}

// 初始化Supabase
function initSupabase() {
    logDebug('初始化 Supabase 客户端');

    try {
        // 检查 Supabase 库是否加载
        if (typeof window.supabase === 'undefined') {
            logDebug('错误: Supabase 库未加载');
            throw new Error('Supabase库未加载');
        }

        logDebug('Supabase 库已加载');

        // 创建客户端实例
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        // 检查客户端是否创建成功
        if (!supabase) {
            logDebug('错误: Supabase 客户端创建失败');
            throw new Error('Supabase客户端创建失败');
        }

        logDebug('Supabase 客户端创建成功');
        logDebug(`连接到: ${SUPABASE_URL}`);

        return true;
    } catch (err) {
        logDebug(`Supabase 初始化失败: ${err.message}`);
        alert('Supabase初始化失败: ' + err.message + '\n\n请检查Supabase配置是否正确');
        return false;
    }
}

// 创建自定义地图标记 - 百度地图版本
function createCustomMarker(map, position, color = 'blue') {
    // 使用SVG作为自定义图标，避免外部资源加载问题
    const svg = `
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="34" viewBox="0 0 24 34">
            <path fill="${color}" d="M12 0C5.373 0 0 5.373 0 12c0 9 12 22 12 22s12-13 12-22c0-6.627-5.373-12-12-12zm0 17c-2.761 0-5-2.239-5-5s2.239-5 5-5 5 2.239 5 5-2.239 5-5 5z"/>
        </svg>
    `;

    const iconUrl = 'data:image/svg+xml;base64,' + btoa(svg);

    // 创建自定义图标
    const icon = new BMap.Icon(iconUrl, new BMap.Size(24, 34));

    // 创建标记
    const point = new BMap.Point(position.lng, position.lat);
    const marker = new BMap.Marker(point, { icon: icon });

    map.addOverlay(marker);
    return marker;
}

// 初始化应用
async function initApp() {
    if (isAppInitialized) {
        logDebug('应用已初始化，跳过');
        return;
    }

    logDebug('开始初始化应用');
    isAppInitialized = true;

    showLoading('初始化应用...');

    try {
        // 检查配置
        if (!checkConfig()) {
            logDebug('配置检查失败');
            document.getElementById('user-section').style.display = 'block';
            hideLoading();
            return;
        }

        // 初始化Supabase
        if (!initSupabase()) {
            logDebug('Supabase 初始化失败');
            document.getElementById('user-section').style.display = 'block';
            hideLoading();
            return;
        }

        // 检查会话
        checkSession();
    } catch (err) {
        logDebug(`Supabase加载失败: ${err.message}`);
        hideLoading();

        // 显示错误信息
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = 'padding: 20px; margin: 20px; background: #fff3f3; border: 1px solid #ffcdd2; border-radius: 4px;';
        errorDiv.innerHTML = `
            <h3 style="color: #d32f2f; margin-top: 0;">Supabase加载失败</h3>
            <p>错误信息: ${err.message}</p>
            <p>可能的原因:</p>
            <ul>
                <li>网络连接问题</li>
                <li>CDN服务暂时不可用</li>
            </ul>
            <button onclick="window.location.reload()" style="padding: 8px 16px; background: #d32f2f; color: white; border: none; border-radius: 4px; cursor: pointer;">
                刷新页面重试
            </button>
        `;

        document.body.appendChild(errorDiv);
    }
}

// 检查会话
function checkSession() {
    logDebug('检查用户会话');
    showLoading('检查登录状态...');

    supabase.auth
        .getSession()
        .then(({ data, error }) => {
            if (error) {
                logDebug(`获取会话失败: ${error.message}`);
                console.error('获取会话失败:', error);
                hideLoading();
                document.getElementById('user-section').style.display = 'block';
                return;
            }

            const session = data.session;
            if (session) {
                logDebug('检测到有效会话');
                currentUser = session.user;
                showParkingSection();
                loadParkingData();
                document.getElementById('user-email').textContent = currentUser.email;
            } else {
                logDebug('没有检测到会话');
            }

            hideLoading();
            document.getElementById('user-section').style.display = 'block';
        })
        .catch(err => {
            logDebug(`检查会话时出错: ${err.message}`);
            console.error('检查会话时出错:', err);
            hideLoading();
            document.getElementById('user-section').style.display = 'block';
            alert('检查会话失败: ' + err.message);
        });
}

// 显示错误信息
function showLoginError(message) {
    logDebug(`显示登录错误: ${message}`);
    const errorDiv = document.getElementById('login-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 显示上传错误信息
function showUploadError(message) {
    logDebug(`显示上传错误: ${message}`);
    const errorDiv = document.getElementById('upload-error');
    errorDiv.textContent = message;
    errorDiv.style.display = 'block';
    setTimeout(() => {
        errorDiv.style.display = 'none';
    }, 5000);
}

// 用户登录
async function loginUser() {
    logDebug('用户尝试登录');
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        logDebug('错误: 请输入邮箱和密码');
        showLoginError('请输入邮箱和密码');
        return;
    }

    logDebug(`尝试登录: ${email}`);
    showLoading('正在登录...');

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password,
        });

        if (error) {
            logDebug(`登录失败: ${error.message}`);
            throw error;
        }

        logDebug('登录成功');
        currentUser = data.user;
        showParkingSection();
        loadParkingData();
        document.getElementById('user-email').textContent = currentUser.email;

        // 清空表单
        document.getElementById('email').value = '';
        document.getElementById('password').value = '';

        hideLoading();
    } catch (err) {
        logDebug(`登录过程中出错: ${err.message}`);
        hideLoading();
        let errorMessage = '登录失败';

        if (err.message) {
            errorMessage += ': ' + err.message;

            // 特定错误处理
            if (err.message.includes('Invalid login credentials')) {
                errorMessage = '邮箱或密码错误';
            } else if (err.message.includes('Network Error')) {
                errorMessage = '网络错误，请稍后再试';
            }
        }

        showLoginError(errorMessage);
    }
}

// 用户注册
async function registerUser() {
    logDebug('用户尝试注册');

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        logDebug('错误: 请输入邮箱和密码');
        showLoginError('请输入邮箱和密码');
        return;
    }

    if (password.length < 6) {
        logDebug('错误: 密码长度不足');
        showLoginError('密码长度至少6位');
        return;
    }

    logDebug(`尝试注册: ${email}`);
    showLoading('正在注册...');

    try {
        const { data, error } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (error) {
            logDebug(`注册失败: ${error.message}`);
            throw error;
        }

        logDebug('注册成功');
        if (data.session) {
            // 自动登录新注册的用户
            logDebug('新用户已自动登录');
            currentUser = data.user;
            showParkingSection();
            loadParkingData();
            document.getElementById('user-email').textContent = currentUser.email;
        } else {
            logDebug('需要邮箱确认');
            showLoginError('注册成功！请检查邮箱确认账户');
        }

        hideLoading();
    } catch (err) {
        logDebug(`注册过程中出错: ${err.message}`);
        hideLoading();
        let errorMessage = '注册失败';

        if (err.message) {
            errorMessage += ': ' + err.message;

            // 特定错误处理
            if (err.message.includes('already exists')) {
                errorMessage = '该邮箱已被注册';
            } else if (err.message.includes('Network Error')) {
                errorMessage = '网络错误，请稍后再试';
            } else if (err.message.includes('500')) {
                errorMessage = '服务器错误，请检查Supabase配置';
            }
        }

        showLoginError(errorMessage);
    }
}

// 用户登出
async function logoutUser() {
    logDebug('用户尝试登出');

    showLoading('正在登出...');

    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            logDebug(`登出失败: ${error.message}`);
            throw error;
        }

        logDebug('登出成功');
        currentUser = null;
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('current-user').style.display = 'none';
        document.getElementById('parking-section').style.display = 'none';

        hideLoading();
    } catch (err) {
        logDebug(`登出过程中出错: ${err.message}`);
        hideLoading();
        console.error('登出失败:', err);
        showLoginError('登出失败: ' + err.message);
    }
}

// 显示停车信息区域
function showParkingSection() {
    logDebug('显示停车信息区域');
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('current-user').style.display = 'block';
    document.getElementById('parking-section').style.display = 'block';
}

// 加载停车数据
async function loadParkingData() {
    logDebug('加载停车数据');

    showLoading('加载停车信息...');

    try {
        logDebug('执行停车信息查询');
        const { data, error } = await supabase.from('parking_info').select('*').order('created_at', { ascending: false });

        if (error) {
            logDebug(`停车信息查询失败: ${error.message}`);
            throw error;
        }

        logDebug(`成功加载 ${data.length} 条停车信息`);
        allParkingData = data;
        renderParkingData(data);
        updateFilterOptions(data);
        hideLoading();
    } catch (err) {
        logDebug(`加载停车信息失败: ${err.message}`);
        hideLoading();
        console.error('加载停车信息失败:', err);
        alert('加载停车信息失败: ' + err.message);
    }
}

// 更新筛选选项
function updateFilterOptions(data) {
    logDebug('更新筛选选项');

    // 获取所有省份
    const provinces = [...new Set(data.map(item => item.province))].filter(Boolean);
    const provinceFilter = document.getElementById('province-filter');
    while (provinceFilter.options.length > 1) {
        provinceFilter.remove(1);
    }
    provinces.forEach(province => {
        const option = document.createElement('option');
        option.value = province;
        option.textContent = province;
        provinceFilter.appendChild(option);
    });

    // 获取所有城市
    const cities = [...new Set(data.map(item => item.city))].filter(Boolean);
    const cityFilter = document.getElementById('city-filter');
    while (cityFilter.options.length > 1) {
        cityFilter.remove(1);
    }
    cities.forEach(city => {
        const option = document.createElement('option');
        option.value = city;
        option.textContent = city;
        cityFilter.appendChild(option);
    });

    // 获取所有行政区
    const districts = [...new Set(data.map(item => item.district))].filter(Boolean);
    const districtFilter = document.getElementById('district-filter');
    while (districtFilter.options.length > 1) {
        districtFilter.remove(1);
    }
    districts.forEach(district => {
        const option = document.createElement('option');
        option.value = district;
        option.textContent = district;
        districtFilter.appendChild(option);
    });

    // 获取所有商场
    const malls = [...new Set(data.map(item => item.mall))].filter(Boolean);
    const mallFilter = document.getElementById('mall-filter');
    while (mallFilter.options.length > 1) {
        mallFilter.remove(1);
    }
    malls.forEach(mall => {
        const option = document.createElement('option');
        option.value = mall;
        option.textContent = mall;
        mallFilter.appendChild(option);
    });
}

// 渲染停车数据
function renderParkingData(data) {
    logDebug(`渲染 ${data.length} 条停车信息`);
    const container = document.getElementById('parking-table-body');
    container.innerHTML = '';

    // 确保表格可见
    const table = document.querySelector('.parking-table');
    if (table) {
        table.style.display = 'table';
    }

    // 移除空状态提示（如果存在）
    const emptyState = document.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    if (data.length === 0) {
        // 不显示空状态提示，只显示空表格
        return;
    }

    data.forEach(item => {
        logDebug(`渲染停车信息: ${item.id} - ${item.mall}`);
        const row = document.createElement('tr');
        row.dataset.id = item.id;

        // 格式化收费信息
        const dayPrice = item.day_price ? `${item.day_price} ${item.day_unit || '元/小时'}` : '-';
        const nightPrice = item.night_price ? `${item.night_price} ${item.night_unit || '元/小时'}` : '-';

        // 格式化位置信息
        let locationInfo = '-';
        if (item.location) {
            try {
                const location = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
                if (location.address) {
                    locationInfo = `<span title="${location.address}">${location.address.substring(0, 20)}${location.address.length > 20 ? '...' : ''}</span>`;
                } else if (location.lng && location.lat) {
                    locationInfo = `<span title="经度: ${location.lng}, 纬度: ${location.lat}">已设置位置</span>`;
                }
            } catch (e) {
                console.error('解析位置信息失败:', e);
            }
        }

        row.innerHTML = `
            <td>${item.province || '-'}</td>
            <td>${item.city || '-'}</td>
            <td>${item.district || '-'}</td>
            <td>${item.mall || '-'}</td>
            <td>${item.address || '-'}</td>
            <td>${locationInfo}</td>
            <td>${item.free_duration ? item.free_duration + '分钟' : '-'}</td>
            <td>${dayPrice}</td>
            <td>${nightPrice}</td>
            <td>${item.charge_interval ? item.charge_interval + '分钟' : '-'}</td>
            <td>
                <button class="btn btn-action btn-edit parking-edit-btn" data-id="${item.id}"><i class="fas fa-edit"></i> 编辑</button>
                <button class="btn btn-action btn-delete parking-delete-btn" data-id="${item.id}"><i class="fas fa-trash-alt"></i> 删除</button>
                <button class="btn btn-action btn-details parking-details-btn" data-id="${item.id}"><i class="fas fa-info-circle"></i> 详情</button>
            </td>
        `;

        container.appendChild(row);

        // 添加详情行 - 默认关闭状态
        const detailsRow = document.createElement('tr');
        detailsRow.id = `details-${item.id}`;
        detailsRow.className = 'details-row'; // 默认不添加'show'类

        const detailsCell = document.createElement('td');
        detailsCell.colSpan = 11;

        // 构建详情内容
        let detailsContent = `
            <div class="details-content">
                <div class="details-grid">
                    <div class="detail-item"><span class="detail-label">省份:</span> ${item.province || '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">城市:</span> ${item.city || '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">行政区:</span> ${item.district || '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">商场名称:</span> ${item.mall || '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">地址:</span> ${item.address || '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">免费停车时长:</span> ${item.free_duration ? item.free_duration + '分钟' : '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">日间收费标准:</span> ${dayPrice}</div>
                    <div class="detail-item"><span class="detail-label">夜间收费标准:</span> ${nightPrice}</div>
                    <div class="detail-item"><span class="detail-label">重新计费时长:</span> ${item.charge_interval ? item.charge_interval + '分钟' : '未提供'}</div>
                    <div class="detail-item"><span class="detail-label">添加时间:</span> ${new Date(item.created_at).toLocaleString('zh-CN')}</div>
        `;

        // 显示位置信息
        if (item.location) {
            try {
                const location = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
                detailsContent += '<div class="detail-item"><span class="detail-label">位置信息:</span> ';
                if (location.address) {
                    detailsContent += `${location.address}`;
                }
                if (location.lng && location.lat) {
                    detailsContent += ` (经度: ${location.lng}, 纬度: ${location.lat})`;
                }
                detailsContent += '</div>';

                // 显示地图预览
                if (location.lng && location.lat) {
                    detailsContent += `
                        <div class="detail-item">
                            <span class="detail-label">地图位置:</span>
                            <div class="map-preview" id="map-preview-${item.id}"></div>
                        </div>
                    `;
                }
            } catch (e) {
                console.error('解析位置信息失败:', e);
            }
        }

        if (item.notes) {
            detailsContent += `<div class="detail-item"><span class="detail-label">备注:</span> ${item.notes}</div>`;
        }

        // 如果有图片，添加图片展示区域
        if (item.images && item.images.length > 0) {
            detailsContent += '<div class="detail-item"><span class="detail-label">图片:</span></div>';
            detailsContent += '<div class="image-gallery">';

            item.images.forEach((img, index) => {
                detailsContent += `
                    <div class="image-item">
                        <img src="${img.url}" alt="停车收费图片 ${index + 1}">
                        <div class="image-caption">图片 ${index + 1}</div>
                    </div>
                `;
            });

            detailsContent += '</div>';
        }

        detailsContent += '</div></div>';
        detailsCell.innerHTML = detailsContent;
        detailsRow.appendChild(detailsCell);

        // 在表格主体中添加详情行
        container.appendChild(detailsRow);
    });

    // 重新绑定按钮事件
    bindDetailButtons();
    bindEditButtons();
    bindDeleteButtons();

    // 初始化地图预览
    setTimeout(() => {
        initMapPreviews();
    }, 100);
}

// 初始化地图预览 - 百度地图版本
function initMapPreviews() {
    waitForBaiduMap(function () {
        allParkingData.forEach(item => {
            if (item.location) {
                try {
                    const location = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
                    if (location.lng && location.lat) {
                        const mapEl = document.getElementById(`map-preview-${item.id}`);
                        if (mapEl) {
                            // 等待DOM元素可见后再初始化地图
                            setTimeout(() => {
                                try {
                                    const point = new BMap.Point(location.lng, location.lat);
                                    const previewMap = new BMap.Map(mapEl);
                                    previewMap.centerAndZoom(point, 15);

                                    // 使用自定义图标创建标记
                                    createCustomMarker(previewMap, location, 'purple');

                                    console.log('预览地图初始化完成，ID:', item.id);
                                } catch (e) {
                                    console.error('初始化预览地图失败:', e, 'ID:', item.id);
                                }
                            }, 300);
                        }
                    }
                } catch (e) {
                    console.error('解析位置信息失败:', e);
                }
            }
        });
    });
}

// 绑定详情按钮事件
function bindDetailButtons() {
    document.querySelectorAll('.parking-details-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            toggleDetails(id);
        });
    });
}

// 绑定编辑按钮事件
function bindEditButtons() {
    document.querySelectorAll('.parking-edit-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            editParkingInfo(id);
        });
    });
}

// 绑定删除按钮事件
function bindDeleteButtons() {
    document.querySelectorAll('.parking-delete-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const id = this.getAttribute('data-id');
            deleteParkingInfo(id);
        });
    });
}

// 切换详情显示
function toggleDetails(id) {
    logDebug(`切换详情显示: ${id}`);
    const detailsElement = document.getElementById(`details-${id}`);
    if (detailsElement) {
        detailsElement.classList.toggle('show');

        // 更新按钮文本
        const btn = document.querySelector(`.parking-details-btn[data-id="${id}"]`);
        if (btn) {
            if (detailsElement.classList.contains('show')) {
                btn.textContent = '收起';
            } else {
                btn.textContent = '详情';
            }
        }
    } else {
        logDebug(`错误: 找不到ID为 details-${id} 的元素`);
    }
}

// 编辑停车信息
async function editParkingInfo(id) {
    logDebug(`编辑停车信息: ${id}`);

    const item = allParkingData.find(i => i.id === id);
    if (!item) {
        logDebug(`错误: 找不到ID为 ${id} 的停车信息`);
        return;
    }

    // 检查权限
    if (item.user_id !== currentUser.id) {
        alert('您只能编辑自己添加的记录');
        return;
    }

    // 填充表单
    document.getElementById('edit-id').value = item.id;
    document.getElementById('upload-province').value = item.province || '';
    document.getElementById('upload-city').value = item.city || '';
    document.getElementById('upload-district').value = item.district || '';
    document.getElementById('upload-mall').value = item.mall || '';
    document.getElementById('upload-address').value = item.address || '';
    document.getElementById('upload-free-duration').value = item.free_duration || 15;
    document.getElementById('upload-charge-interval').value = item.charge_interval || 30;
    document.getElementById('upload-day-price').value = item.day_price || 8;
    document.getElementById('upload-night-price').value = item.night_price || 1;
    document.getElementById('upload-day-unit').value = item.day_unit || '元/小时';
    document.getElementById('upload-night-unit').value = item.night_unit || '元/小时';
    document.getElementById('upload-notes').value = item.notes || '';

    // 处理位置信息
    if (item.location) {
        try {
            const location = typeof item.location === 'string' ? JSON.parse(item.location) : item.location;
            document.getElementById('upload-location').value = JSON.stringify(location);
            currentPosition = location;

            // 初始化地图
            initEditMap(location);
        } catch (e) {
            console.error('解析位置信息失败:', e);
        }
    }

    // 处理图片
    existingImages = item.images || [];
    imagesToDelete = [];
    renderExistingImages();

    // 更改模态框标题
    document.getElementById('modal-title').textContent = '编辑停车收费信息';

    // 打开模态框
    document.getElementById('upload-modal').classList.add('show');
}

// 渲染现有图片
function renderExistingImages() {
    const preview = document.getElementById('image-preview');
    preview.innerHTML = '';

    existingImages.forEach((img, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.dataset.index = index;

        const imgEl = document.createElement('img');
        imgEl.src = img.url;
        imgEl.title = img.name || `图片 ${index + 1}`;

        const removeBtn = document.createElement('div');
        removeBtn.className = 'preview-remove';
        removeBtn.innerHTML = '×';
        removeBtn.onclick = function () {
            imagesToDelete.push(img.url);
            div.remove();
        };

        div.appendChild(imgEl);
        div.appendChild(removeBtn);
        preview.appendChild(div);
    });
}

// 初始化编辑地图 - 百度地图版本
function initEditMap(location) {
    waitForBaiduMap(function () {
        const mapContainer = document.getElementById('map-container');
        mapContainer.innerHTML = '';
        mapContainer.style.display = 'block';

        if (location && location.lng && location.lat) {
            try {
                const point = new BMap.Point(location.lng, location.lat);
                const map = new BMap.Map('map-container');
                map.centerAndZoom(point, 15);

                // 添加缩放和导航控件
                map.addControl(new BMap.NavigationControl());

                // 使用自定义图标创建标记
                createCustomMarker(map, location, 'red');

                console.log('编辑地图初始化完成，中心点:', [location.lng, location.lat]);
            } catch (e) {
                console.error('初始化编辑地图失败:', e);
            }
        } else {
            mapContainer.style.display = 'none';
        }
    });
}

// 删除停车信息
async function deleteParkingInfo(id) {
    logDebug(`删除停车信息: ${id}`);

    const item = allParkingData.find(i => i.id === id);
    if (!item) {
        logDebug(`错误: 找不到ID为 ${id} 的停车信息`);
        return;
    }

    // 检查权限
    if (item.user_id !== currentUser.id) {
        alert('您只能删除自己添加的记录');
        return;
    }

    if (!confirm('确定要删除这条停车信息吗？此操作不可恢复。')) {
        return;
    }

    showLoading('删除中...');

    try {
        // 先删除关联的图片
        if (item.images && item.images.length > 0) {
            for (const img of item.images) {
                // 从URL中提取文件名
                const urlParts = img.url.split('/');
                const fileName = urlParts[urlParts.length - 1];

                const { error: storageError } = await supabase.storage.from('parking-images').remove([fileName]);

                if (storageError) {
                    console.error('删除图片失败:', storageError);
                }
            }
        }

        // 删除数据库记录
        const { error } = await supabase.from('parking_info').delete().eq('id', id);

        if (error) {
            logDebug(`删除停车信息失败: ${error.message}`);
            throw error;
        }

        logDebug('停车信息删除成功');
        loadParkingData();
    } catch (err) {
        logDebug(`删除停车信息失败: ${err.message}`);
        hideLoading();
        console.error('删除停车信息失败:', err);
        alert('删除停车信息失败: ' + err.message);
    }
}

// 筛选停车信息
function filterParking() {
    logDebug('筛选停车信息');

    const provinceFilter = document.getElementById('province-filter').value;
    const cityFilter = document.getElementById('city-filter').value;
    const districtFilter = document.getElementById('district-filter').value;
    const mallFilter = document.getElementById('mall-filter').value;
    const searchText = document.getElementById('search-input').value.toLowerCase();

    logDebug(`筛选条件: 省份=${provinceFilter}, 城市=${cityFilter}, 行政区=${districtFilter}, 商场=${mallFilter}, 搜索=${searchText}`);

    let filteredData = allParkingData;

    // 按省份筛选
    if (provinceFilter) {
        filteredData = filteredData.filter(item => item.province === provinceFilter);
    }

    // 按城市筛选
    if (cityFilter) {
        filteredData = filteredData.filter(item => item.city === cityFilter);
    }

    // 按行政区筛选
    if (districtFilter) {
        filteredData = filteredData.filter(item => item.district === districtFilter);
    }

    // 按商场筛选
    if (mallFilter) {
        filteredData = filteredData.filter(item => item.mall === mallFilter);
    }

    // 按搜索文本筛选（支持所有字段）
    if (searchText) {
        filteredData = filteredData.filter(item => (item.province && item.province.toLowerCase().includes(searchText)) || (item.city && item.city.toLowerCase().includes(searchText)) || (item.district && item.district.toLowerCase().includes(searchText)) || (item.mall && item.mall.toLowerCase().includes(searchText)) || (item.address && item.address.toLowerCase().includes(searchText)) || (item.day_price && item.day_price.toString().includes(searchText)) || (item.night_price && item.night_price.toString().includes(searchText)) || (item.free_duration && item.free_duration.toString().includes(searchText)) || (item.charge_interval && item.charge_interval.toString().includes(searchText)) || (item.notes && item.notes.toLowerCase().includes(searchText)));
    }

    logDebug(`筛选后剩余 ${filteredData.length} 条记录`);
    renderParkingData(filteredData);
}

// 重置所有筛选条件
function resetFilters() {
    logDebug('重置所有筛选条件');

    // 重置下拉筛选框
    document.getElementById('province-filter').value = '';
    document.getElementById('city-filter').value = '';
    document.getElementById('district-filter').value = '';
    document.getElementById('mall-filter').value = '';

    // 重置搜索框
    document.getElementById('search-input').value = '';

    // 重新加载全部数据
    filterParking();
}

// 打开上传模态框
function openUploadModal() {
    logDebug('打开上传模态框');

    if (!currentUser) {
        logDebug('错误: 需要登录才能上传');
        alert('请先登录再上传信息');
        return;
    }

    // 重置表单
    document.getElementById('edit-id').value = '';
    document.getElementById('upload-province').value = '';
    document.getElementById('upload-city').value = '';
    document.getElementById('upload-district').value = '';
    document.getElementById('upload-mall').value = '';
    document.getElementById('upload-address').value = '';
    document.getElementById('upload-free-duration').value = 15;
    document.getElementById('upload-charge-interval').value = 30;
    document.getElementById('upload-day-price').value = 8;
    document.getElementById('upload-night-price').value = 1;
    document.getElementById('upload-day-unit').value = '元/小时';
    document.getElementById('upload-night-unit').value = '元/小时';
    document.getElementById('upload-notes').value = '';
    document.getElementById('upload-location').value = '';
    document.getElementById('map-container').innerHTML = '';
    document.getElementById('map-container').style.display = 'none';

    // 初始化图片上传区域
    document.getElementById('image-preview').innerHTML = '';
    uploadedImages = [];
    existingImages = [];
    imagesToDelete = [];
    currentPosition = null;

    // 设置文件上传事件
    const fileInput = document.getElementById('upload-images');
    fileInput.onchange = handleFileSelect;

    // 更改模态框标题
    document.getElementById('modal-title').textContent = '添加停车收费信息';

    document.getElementById('upload-modal').classList.add('show');
}

// 处理文件选择
function handleFileSelect(event) {
    logDebug('处理文件选择');
    const files = event.target.files;
    const preview = document.getElementById('image-preview');

    for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // 只处理图片文件
        if (!file.type.match('image.*')) {
            continue;
        }

        // 创建预览
        const reader = new FileReader();
        reader.onload = (function (theFile) {
            return function (e) {
                const div = document.createElement('div');
                div.className = 'preview-item';

                const img = document.createElement('img');
                img.src = e.target.result;
                img.title = theFile.name;

                const removeBtn = document.createElement('div');
                removeBtn.className = 'preview-remove';
                removeBtn.innerHTML = '×';
                removeBtn.onclick = function () {
                    div.remove();
                    // 从已上传文件中移除
                    const index = uploadedImages.indexOf(theFile);
                    if (index !== -1) {
                        uploadedImages.splice(index, 1);
                    }
                };

                div.appendChild(img);
                div.appendChild(removeBtn);
                preview.appendChild(div);

                // 添加到已上传文件列表
                uploadedImages.push(theFile);
            };
        })(file);

        reader.readAsDataURL(file);
    }
}

// 添加等待百度地图API加载的函数
function waitForBaiduMap(callback) {
    if (window.BaiduMapLoaded) {
        callback();
    } else {
        if (!window.pendingMapInit) {
            window.pendingMapInit = [];
        }
        window.pendingMapInit.push(callback);
    }
}

// 打开地图选择器
function openMapPicker() {
    logDebug('打开地图选择器');

    document.getElementById('map-modal').classList.add('show');

    // 延迟初始化地图，确保容器已经显示
    setTimeout(() => {
        initMapPicker();
    }, 100);
}

// 初始化地图选择器 - 百度地图版本
function initMapPicker() {
    waitForBaiduMap(function () {
        const mapPicker = document.getElementById('map-picker');
        mapPicker.innerHTML = '';

        // 检查BMap是否已加载
        if (typeof BMap === 'undefined') {
            console.error('百度地图API未正确加载');
            alert('地图加载失败，请刷新页面重试');
            return;
        }

        // 初始化地图
        const point = currentPosition ? new BMap.Point(currentPosition.lng, currentPosition.lat) : new BMap.Point(116.404, 39.915);

        map = new BMap.Map('map-picker');
        map.centerAndZoom(point, 13);

        // 添加缩放和导航控件
        map.addControl(new BMap.NavigationControl());

        // 添加标记（使用自定义图标）
        if (currentPosition && currentPosition.lng && currentPosition.lat) {
            marker = createCustomMarker(map, currentPosition, 'blue');
        }

        // 添加地图点击事件
        map.addEventListener('click', function (e) {
            if (marker) {
                map.removeOverlay(marker);
            }

            // 使用自定义图标创建标记
            marker = createCustomMarker(map, { lng: e.point.lng, lat: e.point.lat }, 'green');

            // 逆地理编码获取地址
            const geoc = new BMap.Geocoder();
            geoc.getLocation(e.point, function (rs) {
                if (rs) {
                    const address = rs.address;
                    document.getElementById('map-search-input').value = address;
                } else {
                    document.getElementById('map-search-input').value = e.point.lng + ', ' + e.point.lat;
                }
            });
        });

        // 初始化地图搜索功能
        initMapSearch();
    });
}

// 关闭地图模态框
function closeMapModal() {
    logDebug('关闭地图模态框');
    document.getElementById('map-modal').classList.remove('show');
}

// 确认位置选择
function confirmLocation() {
    logDebug('确认位置选择');

    if (marker) {
        const position = marker.getPosition();
        const address = document.getElementById('map-search-input').value;

        currentPosition = {
            lng: position.lng,
            lat: position.lat,
            address: address,
        };

        document.getElementById('upload-location').value = JSON.stringify(currentPosition);

        // 更新主模态框中的地图显示
        initEditMap(currentPosition);

        closeMapModal();
    } else {
        alert('请先在地图上选择一个位置');
    }
}

// 关闭上传模态框
function closeUploadModal() {
    logDebug('关闭上传模态框');
    document.getElementById('upload-modal').classList.remove('show');

    // 清空表单
    document.getElementById('edit-id').value = '';
    document.getElementById('upload-province').value = '';
    document.getElementById('upload-city').value = '';
    document.getElementById('upload-district').value = '';
    document.getElementById('upload-mall').value = '';
    document.getElementById('upload-address').value = '';
    document.getElementById('upload-free-duration').value = 15;
    document.getElementById('upload-charge-interval').value = 30;
    document.getElementById('upload-day-price').value = 8;
    document.getElementById('upload-night-price').value = 1;
    document.getElementById('upload-day-unit').value = '元/小时';
    document.getElementById('upload-night-unit').value = '元/小时';
    document.getElementById('upload-notes').value = '';
    document.getElementById('upload-images').value = '';
    document.getElementById('image-preview').innerHTML = '';
    document.getElementById('upload-error').style.display = 'none';
    document.getElementById('upload-location').value = '';
    document.getElementById('map-container').innerHTML = '';
    document.getElementById('map-container').style.display = 'none';

    uploadedImages = [];
    existingImages = [];
    imagesToDelete = [];
    currentPosition = null;
}

// 保存停车信息（新增或编辑）
async function saveParkingInfo() {
    const saveButton = document.querySelector('#upload-modal .btn-primary');
    const originalText = saveButton.textContent;

    try {
        // 显示加载状态
        saveButton.disabled = true;
        saveButton.innerHTML = '<span class="spinner"></span> 提交中...';

        const editId = document.getElementById('edit-id').value;
        if (editId) {
            await updateParkingInfo(editId);
        } else {
            await addParkingInfo();
        }
    } finally {
        // 恢复按钮状态
        saveButton.disabled = false;
        saveButton.textContent = originalText;
    }
}

// 添加停车信息
async function addParkingInfo() {
    logDebug('尝试添加停车信息');

    const province = document.getElementById('upload-province').value;
    const city = document.getElementById('upload-city').value;
    const district = document.getElementById('upload-district').value;
    const mall = document.getElementById('upload-mall').value;
    const address = document.getElementById('upload-address').value;
    const freeDuration = document.getElementById('upload-free-duration').value;
    const chargeInterval = document.getElementById('upload-charge-interval').value;
    const dayPrice = document.getElementById('upload-day-price').value;
    const nightPrice = document.getElementById('upload-night-price').value;
    const dayUnit = document.getElementById('upload-day-unit').value;
    const nightUnit = document.getElementById('upload-night-unit').value;
    const notes = document.getElementById('upload-notes').value;
    const location = document.getElementById('upload-location').value;

    if (!province || !city || !district || !mall) {
        logDebug('错误: 省份、城市、行政区和商场不能为空');
        showUploadError('省份、城市、行政区和商场不能为空');
        return;
    }

    logDebug(`添加停车信息: ${mall} (${province}-${city}-${district})`);
    showLoading('添加停车信息...');

    try {
        // 先上传图片（如果有）
        let imageUrls = await uploadImages();

        // 解析位置信息
        let locationData = null;
        if (location) {
            try {
                locationData = JSON.parse(location);
            } catch (e) {
                console.error('解析位置信息失败:', e);
            }
        }

        logDebug('准备插入停车信息到数据库');

        // 构建数据对象，只包含有值的字段
        const parkingData = {
            user_id: currentUser.id,
            province: province.trim(),
            city: city.trim(),
            district: district.trim(),
            mall: mall.trim(),
            address: address.trim(),
            free_duration: freeDuration ? parseInt(freeDuration) : null,
            charge_interval: chargeInterval ? parseInt(chargeInterval) : null,
            notes: notes.trim(),
            location: locationData,
            images: imageUrls,
        };

        // 只有有值时才添加这些字段
        if (dayPrice) parkingData.day_price = parseFloat(dayPrice);
        if (nightPrice) parkingData.night_price = parseFloat(nightPrice);
        if (dayUnit) parkingData.day_unit = dayUnit;
        if (nightUnit) parkingData.night_unit = nightUnit;

        const { data, error } = await supabase.from('parking_info').insert([parkingData]);

        if (error) {
            logDebug(`停车信息插入失败: ${error.message}`);
            throw error;
        }

        logDebug('停车信息添加成功');
        closeUploadModal();
        loadParkingData();
    } catch (err) {
        logDebug(`添加停车信息失败: ${err.message}`);
        hideLoading();
        console.error('添加停车信息失败 - 完整错误对象:', err);

        // 更详细的错误信息
        let errorMessage = '添加停车信息失败';
        if (err.message) {
            errorMessage += ': ' + err.message;
        }

        // 检查是否是网络或CORS问题
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('CORS') || err.message.includes('Network'))) {
            errorMessage = '网络连接问题，请检查网络连接或稍后重试';
        }

        // 特定错误处理
        if (err.message && err.message.includes('day_unit')) {
            errorMessage = '数据库表结构需要更新，请添加day_unit字段';
        } else if (err.message && err.message.includes('night_unit')) {
            errorMessage = '数据库表结构需要更新，请添加night_unit字段';
        } else if (err.message && err.message.includes('province')) {
            errorMessage = '数据库表结构需要更新，请添加province字段';
        } else if (err.message && err.message.includes('city')) {
            errorMessage = '数据库表结构需要更新，请添加city字段';
        } else if (err.message && err.message.includes('location')) {
            errorMessage = '数据库表结构需要更新，请添加location字段';
        }

        showUploadError(errorMessage);
    }
}

// 更新停车信息
async function updateParkingInfo(id) {
    logDebug(`更新停车信息: ${id}`);

    const province = document.getElementById('upload-province').value;
    const city = document.getElementById('upload-city').value;
    const district = document.getElementById('upload-district').value;
    const mall = document.getElementById('upload-mall').value;
    const address = document.getElementById('upload-address').value;
    const freeDuration = document.getElementById('upload-free-duration').value;
    const chargeInterval = document.getElementById('upload-charge-interval').value;
    const dayPrice = document.getElementById('upload-day-price').value;
    const nightPrice = document.getElementById('upload-night-price').value;
    const dayUnit = document.getElementById('upload-day-unit').value;
    const nightUnit = document.getElementById('upload-night-unit').value;
    const notes = document.getElementById('upload-notes').value;
    const location = document.getElementById('upload-location').value;

    if (!province || !city || !district || !mall) {
        logDebug('错误: 省份、城市、行政区和商场不能为空');
        showUploadError('省份、城市、行政区和商场不能为空');
        return;
    }

    logDebug(`更新停车信息: ${id}`);
    showLoading('更新停车信息...');

    try {
        // 先删除标记要删除的图片
        if (imagesToDelete.length > 0) {
            logDebug(`删除 ${imagesToDelete.length} 张图片`);
            for (const imgUrl of imagesToDelete) {
                try {
                    // 从URL中提取文件名
                    const urlParts = imgUrl.split('/');
                    const fileName = urlParts[urlParts.length - 1];

                    const { error: storageError } = await supabase.storage.from('parking-images').remove([fileName]);

                    if (storageError) {
                        console.error('删除图片失败:', storageError);
                    } else {
                        logDebug(`图片删除成功: ${fileName}`);
                    }
                } catch (deleteError) {
                    console.error('删除图片异常:', deleteError);
                }
            }
        }

        // 上传新图片
        let newImageUrls = await uploadImages();

        // 合并现有图片和新图片（排除已删除的）
        const keptImages = existingImages.filter(img => !imagesToDelete.includes(img.url));
        const allImages = [...keptImages, ...newImageUrls];

        // 解析位置信息
        let locationData = null;
        if (location) {
            try {
                locationData = JSON.parse(location);
            } catch (e) {
                console.error('解析位置信息失败:', e);
            }
        }

        logDebug('准备更新停车信息到数据库');

        // 构建更新数据对象，只包含有值的字段
        const updateData = {
            province: province.trim(),
            city: city.trim(),
            district: district.trim(),
            mall: mall.trim(),
            address: address.trim(),
            free_duration: freeDuration ? parseInt(freeDuration) : null,
            charge_interval: chargeInterval ? parseInt(chargeInterval) : null,
            notes: notes.trim(),
            location: locationData,
            images: allImages,
            updated_at: new Date().toISOString(),
        };

        // 只有有值时才添加这些字段
        if (dayPrice) updateData.day_price = parseFloat(dayPrice);
        if (nightPrice) updateData.night_price = parseFloat(nightPrice);
        if (dayUnit) updateData.day_unit = dayUnit;
        if (nightUnit) updateData.night_unit = nightUnit;

        const { data, error } = await supabase.from('parking_info').update(updateData).eq('id', id);

        if (error) {
            logDebug(`停车信息更新失败: ${error.message}`);
            throw error;
        }

        logDebug('停车信息更新成功');
        closeUploadModal();
        loadParkingData();
    } catch (err) {
        logDebug(`更新停车信息失败: ${err.message}`);
        hideLoading();
        console.error('更新停车信息失败 - 完整错误对象:', err);

        // 更详细的错误信息
        let errorMessage = '更新停车信息失败';
        if (err.message) {
            errorMessage += ': ' + err.message;
        }

        // 检查是否是网络或CORS问题
        if (err.message && (err.message.includes('Failed to fetch') || err.message.includes('CORS') || err.message.includes('Network'))) {
            errorMessage = '网络连接问题，请检查网络连接或稍后重试';
        }

        // 特定错误处理
        if (err.message && err.message.includes('day_unit')) {
            errorMessage = '数据库表结构需要更新，请添加day_unit字段';
        } else if (err.message && err.message.includes('night_unit')) {
            errorMessage = '数据库表结构需要更新，请添加night_unit字段';
        } else if (err.message && err.message.includes('province')) {
            errorMessage = '数据库表结构需要更新，请添加province字段';
        } else if (err.message && err.message.includes('city')) {
            errorMessage = '数据库表结构需要更新，请添加city字段';
        } else if (err.message && err.message.includes('location')) {
            errorMessage = '数据库表结构需要更新，请添加location字段';
        }

        showUploadError(errorMessage);
    }
}

// 上传图片
async function uploadImages() {
    let imageUrls = [];

    if (uploadedImages.length > 0) {
        logDebug(`开始上传 ${uploadedImages.length} 张图片`);

        for (const file of uploadedImages) {
            try {
                // 生成更简单的文件名，避免特殊字符问题
                const fileName = `img_${Date.now()}_${Math.floor(Math.random() * 10000)}.${file.name.split('.').pop()}`;

                logDebug(`上传图片: ${fileName}`);

                const { data: uploadData, error: uploadError } = await supabase.storage.from('parking-images').upload(fileName, file, {
                    cacheControl: '3600',
                    upsert: false,
                });

                if (uploadError) {
                    logDebug(`图片上传失败: ${uploadError.message}`);
                    console.error('图片上传失败:', uploadError);
                    // 继续处理其他图片而不是完全失败
                    continue;
                }

                // 获取图片公共URL
                const { data: urlData } = supabase.storage.from('parking-images').getPublicUrl(fileName);

                if (urlData && urlData.publicUrl) {
                    imageUrls.push({
                        name: file.name,
                        url: urlData.publicUrl,
                    });
                    logDebug(`图片上传成功: ${urlData.publicUrl}`);
                }
            } catch (err) {
                logDebug(`图片上传异常: ${err.message}`);
                console.error('图片上传异常:', err);
                // 继续处理其他图片
            }
        }

        logDebug(`成功上传 ${imageUrls.length} 张图片`);
    }

    return imageUrls;
}

// 支持回车键登录
document.addEventListener('DOMContentLoaded', () => {
    logDebug('页面加载完成');

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    if (emailInput && passwordInput) {
        passwordInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') {
                logDebug('检测到回车键，尝试登录');
                loginUser();
            }
        });
    }

    // 直接初始化应用
    initApp();
});

// 初始化地图搜索功能 - 百度地图版本
function initMapSearch() {
    // 搜索框输入事件
    const searchInput = document.getElementById('map-search-input');
    searchInput.addEventListener('input', function () {
        if (this.value.length > 2) {
            searchSuggestions(this.value);
        } else {
            document.getElementById('search-results').style.display = 'none';
        }
    });

    // 点击搜索按钮
    document.getElementById('map-search-btn').addEventListener('click', function () {
        searchOnMap();
    });

    // 回车键搜索
    searchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
            searchOnMap();
        }
    });
}

// 搜索建议 - 百度地图版本
function searchSuggestions(keyword) {
    if (!window.BAIDU_WEB_KEY || window.BAIDU_WEB_KEY === '您的百度Web服务AK') {
        console.error('请配置百度Web服务API密钥');
        return;
    }

    const url = `https://api.map.baidu.com/place/v2/suggestion?query=${encodeURIComponent(keyword)}&region=全国&output=json&ak=${window.BAIDU_WEB_KEY}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 0 && data.result) {
                showSearchResults(data.result);
            }
        })
        .catch(error => {
            console.error('搜索建议获取失败:', error);
        });
}

// 显示搜索结果
function showSearchResults(results) {
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = '';

    results.forEach(item => {
        const div = document.createElement('div');
        div.className = 'search-result-item';
        div.textContent = item.name;
        div.onclick = function () {
            document.getElementById('map-search-input').value = item.name;
            resultsContainer.style.display = 'none';
            // 直接搜索选中的地点
            geocodeAddress(item.name);
        };
        resultsContainer.appendChild(div);
    });

    resultsContainer.style.display = 'block';
}

// 地理编码（地址转坐标）- 百度地图版本
function geocodeAddress(address) {
    if (!window.BAIDU_WEB_KEY || window.BAIDU_WEB_KEY === '您的百度Web服务AK') {
        alert('请配置百度Web服务API密钥');
        return;
    }

    const url = `https://api.map.baidu.com/geocoding/v3/?address=${encodeURIComponent(address)}&output=json&ak=${window.BAIDU_WEB_KEY}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.status === 0 && data.result) {
                const location = data.result.location;
                const lng = location.lng;
                const lat = location.lat;

                // 移动地图中心
                const point = new BMap.Point(lng, lat);
                map.centerAndZoom(point, 15);

                // 清除现有标记
                if (marker) {
                    map.removeOverlay(marker);
                }

                // 使用自定义图标创建标记
                marker = createCustomMarker(map, { lng: lng, lat: lat }, 'green');

                // 更新搜索框显示完整地址
                document.getElementById('map-search-input').value = address;
            } else {
                alert('未找到相关地点');
            }
        })
        .catch(error => {
            console.error('地理编码失败:', error);
            alert('搜索失败，请稍后重试');
        });
}

// 在地图上搜索地点 - 百度地图版本
function searchOnMap() {
    const keyword = document.getElementById('map-search-input').value;
    if (!keyword) {
        alert('请输入搜索关键词');
        return;
    }

    geocodeAddress(keyword);
}

// 定位到用户当前位置 - 百度地图版本
function locateOnMap() {
    if (!navigator.geolocation) {
        alert('您的浏览器不支持定位功能');
        return;
    }

    navigator.geolocation.getCurrentPosition(
        function (position) {
            const lng = position.coords.longitude;
            const lat = position.coords.latitude;

            // 将WGS84坐标转换为百度坐标
            const convertor = new BMap.Convertor();
            const pointArr = [new BMap.Point(lng, lat)];

            convertor.translate(pointArr, 1, 5, function (data) {
                if (data.status === 0) {
                    const point = data.points[0];

                    // 移动地图中心
                    map.centerAndZoom(point, 15);

                    // 清除现有标记
                    if (marker) {
                        map.removeOverlay(marker);
                    }

                    // 使用自定义图标创建标记
                    marker = createCustomMarker(map, { lng: point.lng, lat: point.lat }, 'blue');

                    // 逆地理编码获取地址
                    const geoc = new BMap.Geocoder();
                    geoc.getLocation(point, function (rs) {
                        if (rs) {
                            document.getElementById('map-search-input').value = rs.address;
                        }
                    });
                }
            });
        },
        function (error) {
            console.error('定位失败:', error);
            alert('定位失败: ' + error.message);
        },
        {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0,
        }
    );
}

// 首页和退出功能
function goToHome() {
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_password');
    window.location.href = 'login.html';
}

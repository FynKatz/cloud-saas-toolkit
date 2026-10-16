// 全局变量
let currentLanguage = 'zh';
let toolsData = [];
let translations = {};

// 初始化应用
async function initApp() {
    try {
        // 加载工具数据
        const toolsResponse = await fetch('data/tools.json');
        toolsData = await toolsResponse.json();

        // 加载翻译数据
        const translationsResponse = await fetch('data/translations.json');
        translations = await translationsResponse.json();

        // 初始化页面
        renderTools();
        setupEventListeners();

        console.log('应用初始化完成');
    } catch (error) {
        console.error('初始化应用时出错:', error);
    }
}

// 渲染工具卡片
function renderTools() {
    const navGrid = document.querySelector('.nav-grid');
    navGrid.innerHTML = ''; // 清空现有内容

    toolsData.tools.forEach(tool => {
        const toolElement = document.createElement('a');
        toolElement.href = tool.href;
        toolElement.className = 'nav-card';
        toolElement.dataset.category = tool.category;
        toolElement.dataset.id = tool.id;

        const translation = tool.translations[currentLanguage];

        toolElement.innerHTML = `
            <div class="card-icon">
                <i class="fas ${tool.icon}"></i>
            </div>
            <span class="card-category">${translation.category}</span>
            <h3 class="card-title">${translation.title}</h3>
            <p class="card-desc">${translation.description}</p>
            <span class="nav-link">${translation.linkText}</span>
        `;

        navGrid.appendChild(toolElement);
    });

    // 更新界面文本
    updateUIText();
}

// 更新界面文本
function updateUIText() {
    const langData = translations[currentLanguage];

    // 更新页面标题和副标题
    document.getElementById('pageTitle').textContent = langData.pageTitle;
    document.getElementById('pageSubtitle').textContent = langData.pageSubtitle;

    // 更新标签页文本
    document.getElementById('tabAll').textContent = langData.tabAll;
    document.getElementById('tabDocker').textContent = langData.tabDocker;
    document.getElementById('tabRedis').textContent = langData.tabRedis;
    document.getElementById('tabMarkdown').textContent = langData.tabMarkdown;
    document.getElementById('tabTools').textContent = langData.tabTools;

    // 更新页脚文本
    document.getElementById('footerText').innerHTML = langData.footerText;
}

// 设置事件监听器
function setupEventListeners() {
    // 语言切换
    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchLanguage(this.dataset.lang);
        });
    });

    // 类别标签切换
    const tabBtns = document.querySelectorAll('.tab-btn');
    const cards = document.querySelectorAll('.nav-card');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            tabBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            const category = this.dataset.category;

            cards.forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.style.display = 'block';
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}

// 切换语言
function switchLanguage(lang) {
    currentLanguage = lang;

    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // 重新渲染工具和更新界面文本
    renderTools();
}

// 退出登录
function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_password');
    window.location.href = 'index.html';
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);
// 全局变量跟踪当前活动数据库
let currentDatabase = 'pgsql';

// 初始化页面
document.addEventListener('DOMContentLoaded', function () {
    // 绑定导航项点击事件
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', handleNavClick);
    });

    // 直接绑定分类选项卡点击事件
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.addEventListener('click', handleCategoryClick);
    });

    // 绑定搜索事件
    document.getElementById('pgsql-search').addEventListener('input', function () {
        filterCommands('pgsql', this.value.toLowerCase());
    });

    document.getElementById('mysql-search').addEventListener('input', function () {
        filterCommands('mysql', this.value.toLowerCase());
    });

    document.getElementById('redis-search').addEventListener('input', function () {
        filterCommands('redis', this.value.toLowerCase());
    });

    document.getElementById('mongodb-search').addEventListener('input', function () {
        filterCommands('mongodb', this.value.toLowerCase());
    });

    document.getElementById('sqlite-search').addEventListener('input', function () {
        filterCommands('sqlite', this.value.toLowerCase());
    });

    document.getElementById('oracle-search').addEventListener('input', function () {
        filterCommands('oracle', this.value.toLowerCase());
    });

    document.getElementById('sqlserver-search').addEventListener('input', function () {
        filterCommands('sqlserver', this.value.toLowerCase());
    });

    document.getElementById('elasticsearch-search').addEventListener('input', function () {
        filterCommands('elasticsearch', this.value.toLowerCase());
    });

    // 初始化所有选项卡状态
    resetCategoryTabs('pgsql');
    
    // 初始化复制按钮
    initCopyButtons();
});

// 处理导航点击
function handleNavClick() {
    // 更新活动导航项
    document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
    this.classList.add('active');

    // 更新当前数据库
    currentDatabase = this.getAttribute('data-target');

    // 隐藏所有数据库内容
    document.querySelectorAll('.database-content').forEach(content => {
        content.style.display = 'none';
    });

    // 显示当前数据库内容
    const targetContent = document.getElementById(`${currentDatabase}-content`);
    if (targetContent) {
        targetContent.style.display = 'block';
    }

    // 重置分类选项卡状态
    resetCategoryTabs(currentDatabase);

    // 重置搜索框
    const searchBox = document.getElementById(`${currentDatabase}-search`);
    if (searchBox) {
        searchBox.value = '';
    }
    filterCommands(currentDatabase, '');
}

// 处理分类选项卡点击
function handleCategoryClick(event) {
    const category = this.getAttribute('data-category');
    const parentContent = this.closest('.database-content');

    if (!parentContent || !category) return;

    // 更新活动选项卡
    parentContent.querySelectorAll('.category-tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    // 隐藏所有命令部分
    parentContent.querySelectorAll('.command-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // 显示目标命令部分
    const targetSection = document.getElementById(category);
    if (targetSection) {
        targetSection.classList.add('active');
        targetSection.style.display = 'block';
    }
}

// 重置分类选项卡状态
function resetCategoryTabs(db) {
    const dbContent = document.getElementById(`${db}-content`);
    if (!dbContent) return;

    // 重置所有选项卡为非活动状态
    dbContent.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // 激活第一个选项卡
    const firstTab = dbContent.querySelector('.category-tab');
    if (firstTab) {
        firstTab.classList.add('active');
    }

    // 隐藏所有命令部分
    dbContent.querySelectorAll('.command-section').forEach(section => {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // 显示第一个命令部分
    const firstSection = dbContent.querySelector('.command-section');
    if (firstSection) {
        firstSection.classList.add('active');
        firstSection.style.display = 'block';
    }
}

// 搜索功能
function filterCommands(db, searchText) {
    const activeContent = document.getElementById(`${db}-content`);
    if (!activeContent) return;

    const sections = activeContent.querySelectorAll('.command-section');
    sections.forEach(section => {
        const rows = section.querySelectorAll('tr');
        let sectionVisible = false;

        rows.forEach((row, index) => {
            // 跳过表头
            if (index === 0) return;

            const text = row.textContent.toLowerCase();
            if (text.includes(searchText)) {
                row.style.display = '';
                sectionVisible = true;
            } else {
                row.style.display = 'none';
            }
        });

        // 如果该部分有匹配结果，则显示整个部分
        if (sectionVisible) {
            section.style.display = 'block';
        } else if (searchText) {
            section.style.display = 'none';
        } else {
            section.style.display = 'block';
        }
    });

    // 如果搜索框为空，确保显示当前激活的分类
    if (!searchText) {
        const activeTab = activeContent.querySelector('.category-tab.active');
        if (activeTab) {
            const category = activeTab.getAttribute('data-category');

            // 隐藏所有命令部分
            activeContent.querySelectorAll('.command-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });

            // 显示对应分类的命令部分
            const targetSection = document.getElementById(category);
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
            }
        }
    }
}


// 初始化复制按钮的函数
function initCopyButtons() {
    // 为所有命令代码块添加复制按钮
    document.querySelectorAll('.command-table code').forEach(codeElement => {
        // 创建复制按钮
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = '<i class="fas fa-copy"></i> 复制';
        copyButton.addEventListener('click', function(e) {
            e.stopPropagation();
            copyToClipboard(codeElement.textContent);
        });
        
        // 将代码和按钮包装在容器中
        const container = document.createElement('div');
        container.className = 'command-code-container';
        codeElement.parentNode.insertBefore(container, codeElement);
        container.appendChild(codeElement);
        container.appendChild(copyButton);
    });
}

// 复制到剪贴板功能
function copyToClipboard(text) {
    // 创建临时textarea元素
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    
    // 选择并复制文本
    textarea.select();
    const successful = document.execCommand('copy');
    
    // 清理临时元素
    document.body.removeChild(textarea);
    
    // 显示复制成功提示
    showCopyNotification(successful ? '命令已复制到剪贴板!' : '复制失败，请重试');
    
    return successful;
}

// 显示复制成功提示
function showCopyNotification(message) {
    // 移除现有通知（如果有）
    const existingNotification = document.querySelector('.copy-notification');
    if (existingNotification) {
        existingNotification.remove();
    }
    
    // 创建新通知
    const notification = document.createElement('div');
    notification.className = 'copy-notification';
    notification.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
    
    document.body.appendChild(notification);
    
    // 显示通知
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // 3秒后隐藏并移除通知
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
}
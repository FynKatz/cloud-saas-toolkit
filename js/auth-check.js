// auth-check.js
(function() {
    function checkAuth() {
        // 如果是登录页面，则不进行检查
        if (window.location.pathname.endsWith('login.html')) {
            console.log('Login page, skipping auth check');
            return;
        }
        
        // 确保 AUTH_CONFIG 已经加载
        if (typeof AUTH_CONFIG === 'undefined') {
            console.error('AUTH_CONFIG not found');
            window.location.href = 'login.html';
            return;
        }
        
        const token = localStorage.getItem('access_token');
        const savedPassword = localStorage.getItem('auth_password');
        
        function decryptPassword(encrypted) {
            try {
                return atob(encrypted);
            } catch {
                return "";
            }
        }

        if (!token || !savedPassword || decryptPassword(savedPassword) !== AUTH_CONFIG.PASSWORD) {
            // 未授权访问，跳转到登录页面
            console.log('Authentication failed, redirecting to login');
            window.location.href = 'login.html';
        } else {
            console.log('Authentication successful');
        }
    }
    
    // 直接执行检查（因为 auth-config.js 已经在前面加载了）
    // 添加延迟确保所有资源加载完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }
})();

function goToHome() {
    window.location.href = 'index.html';
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_password');
    window.location.href = 'login.html';
}
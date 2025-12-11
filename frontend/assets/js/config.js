// API Configuration
const CONFIG = {
    API_URL: 'http://localhost:5000/api',
    GOOGLE_CLIENT_ID: '348285749288-2h4lfs41domqfnpb2ppnjtim9a1ug35e.apps.googleusercontent.com'
};

// Helper functions
const api = {
    async post(endpoint, data) {
        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response;
    },

    async get(endpoint, userType) {
        // Lấy token theo loại, nếu không truyền thì tự detect
        const token = userType ? auth.getToken(userType) : auth.getToken();
        const response = await fetch(`${CONFIG.API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return response;
    }
};

// Auth helpers - TÁCH RIÊNG HOÀN TOÀN cho mỗi loại tài khoản
// Mỗi loại có key riêng, KHÔNG dùng key chung để tránh xung đột
const auth = {
    // Lưu thông tin - dùng key riêng cho mỗi loại, KHÔNG ghi đè key chung
    setUser(token, user, userType) {
        if (userType === 'tochuc') {
            localStorage.setItem('tochuc_token', token);
            localStorage.setItem('tochuc_user', JSON.stringify(user));
        } else if (userType === 'admin') {
            localStorage.setItem('admin_token', token);
            localStorage.setItem('admin_user', JSON.stringify(user));
        } else {
            localStorage.setItem('user_token', token);
            localStorage.setItem('user_user', JSON.stringify(user));
        }
        // KHÔNG lưu key chung nữa để tránh xung đột
    },

    // Lấy user theo loại cụ thể
    getUser(type) {
        // Nếu không truyền type, thử lấy theo thứ tự ưu tiên
        if (!type) {
            // Ưu tiên user thường trước
            const userUser = localStorage.getItem('user_user');
            if (userUser) return JSON.parse(userUser);
            const tochucUser = localStorage.getItem('tochuc_user');
            if (tochucUser) return JSON.parse(tochucUser);
            const adminUser = localStorage.getItem('admin_user');
            if (adminUser) return JSON.parse(adminUser);
            return null;
        }
        const key = type === 'tochuc' ? 'tochuc_user' : (type === 'admin' ? 'admin_user' : 'user_user');
        const user = localStorage.getItem(key);
        return user ? JSON.parse(user) : null;
    },

    // Lấy user theo loại cụ thể (alias)
    getUserAs(type) {
        return this.getUser(type);
    },

    // Lấy token theo loại
    getToken(type) {
        if (!type) {
            // Ưu tiên user thường trước
            return localStorage.getItem('user_token') ||
                localStorage.getItem('tochuc_token') ||
                localStorage.getItem('admin_token');
        }
        const key = type === 'tochuc' ? 'tochuc_token' : (type === 'admin' ? 'admin_token' : 'user_token');
        return localStorage.getItem(key);
    },

    // Lấy token theo loại (alias)
    getTokenAs(type) {
        return this.getToken(type);
    },

    // Kiểm tra đăng nhập - có thể truyền type hoặc không
    isLoggedIn(type) {
        if (!type) {
            // Kiểm tra bất kỳ loại nào đang đăng nhập
            return !!localStorage.getItem('user_token') ||
                !!localStorage.getItem('tochuc_token') ||
                !!localStorage.getItem('admin_token');
        }
        return this.isLoggedInAs(type);
    },

    // Kiểm tra đăng nhập theo loại CỤ THỂ
    isLoggedInAs(type) {
        const key = type === 'tochuc' ? 'tochuc_token' : (type === 'admin' ? 'admin_token' : 'user_token');
        return !!localStorage.getItem(key);
    },

    // Đăng xuất theo loại cụ thể - KHÔNG ảnh hưởng loại khác
    logout(type) {
        if (!type) {
            // Nếu không truyền type, logout tất cả
            this.logoutAll();
            return;
        }
        this.logoutAs(type);
    },

    // Đăng xuất loại cụ thể - KHÔNG ảnh hưởng loại khác
    logoutAs(type) {
        if (type === 'tochuc') {
            localStorage.removeItem('tochuc_token');
            localStorage.removeItem('tochuc_user');
        } else if (type === 'admin') {
            localStorage.removeItem('admin_token');
            localStorage.removeItem('admin_user');
        } else {
            localStorage.removeItem('user_token');
            localStorage.removeItem('user_user');
        }
        // KHÔNG xóa key của loại khác
    },

    // Đăng xuất tất cả
    logoutAll() {
        localStorage.removeItem('user_token');
        localStorage.removeItem('user_user');
        localStorage.removeItem('tochuc_token');
        localStorage.removeItem('tochuc_user');
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        // Xóa cả key cũ nếu còn
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('userType');
    },

    // Lấy loại user đang active (để tương thích code cũ)
    getUserType() {
        if (localStorage.getItem('user_token')) return 'user';
        if (localStorage.getItem('tochuc_token')) return 'tochuc';
        if (localStorage.getItem('admin_token')) return 'admin';
        return null;
    }
};

// UI helpers
const ui = {
    showAlert(container, message, type = 'error') {
        const bgColor = type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-green-50 border-green-200 text-green-700';
        const icon = type === 'error'
            ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>'
            : '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>';

        container.innerHTML = `
            <div class="flex items-center gap-3 p-4 border rounded-lg ${bgColor}">
                <svg class="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">${icon}</svg>
                <span class="text-sm">${message}</span>
            </div>
        `;
        container.classList.remove('hidden');
    },

    hideAlert(container) {
        container.classList.add('hidden');
    },

    setLoading(button, loading, text = 'Đăng nhập') {
        if (loading) {
            button.disabled = true;
            button.innerHTML = `<span class="spinner"></span><span>Đang xử lý...</span>`;
        } else {
            button.disabled = false;
            button.innerHTML = text;
        }
    }
};

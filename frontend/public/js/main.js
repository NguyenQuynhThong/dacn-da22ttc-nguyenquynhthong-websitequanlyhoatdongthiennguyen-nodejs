// Cấu hình API
const API_BASE_URL = 'http://localhost:5000/api';

// ========================================
// Hàm hỗ trợ API
// ========================================

/**
 * Gửi yêu cầu API với xác thực
 */
async function apiRequest(endpoint, options = {}) {
    const token = localStorage.getItem('token');
    
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Something went wrong');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

/**
 * Yêu cầu GET
 */
async function apiGet(endpoint) {
    return apiRequest(endpoint, { method: 'GET' });
}

/**
 * Yêu cầu POST
 */
async function apiPost(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body)
    });
}

/**
 * Yêu cầu PUT
 */
async function apiPut(endpoint, body) {
    return apiRequest(endpoint, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
}

/**
 * Yêu cầu DELETE
 */
async function apiDelete(endpoint) {
    return apiRequest(endpoint, { method: 'DELETE' });
}

// ========================================
// Hàm xác thực
// ========================================

/**
 * Đăng nhập người dùng
 */
async function login(email, password) {
    try {
        const response = await apiPost('/auth/login', { email, mat_khau: password });
        
        if (response.data && response.data.token) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            return response.data;
        }
    } catch (error) {
        throw error;
    }
}

/**
 * Đăng ký người dùng
 */
async function register(userData) {
    try {
        const data = await apiPost('/auth/register', userData);
        return data;
    } catch (error) {
        throw error;
    }
}

/**
 * Đăng xuất người dùng
 */
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
}

/**
 * Lấy thông tin người dùng hiện tại
 */
function getCurrentUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

/**
 * Kiểm tra người dùng đã đăng nhập
 */
function isAuthenticated() {
    return !!localStorage.getItem('token');
}

/**
 * Kiểm tra vai trò người dùng
 */
function hasRole(role) {
    const user = getCurrentUser();
    return user && user.vai_tro === role;
}

/**
 * Yêu cầu đăng nhập
 */
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = '/views/login.html';
        return false;
    }
    return true;
}

/**
 * Yêu cầu vai trò cụ thể
 */
function requireRole(role) {
    if (!requireAuth()) return false;
    
    if (!hasRole(role)) {
        showAlert('Bạn không có quyền truy cập trang này', 'error');
        window.location.href = '/views/index.html';
        return false;
    }
    return true;
}

// ========================================
// Hàm hỗ trợ giao diện
// ========================================

/**
 * Hiển thị thông báo
 */
function showAlert(message, type = 'info') {
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} fixed top-4 right-4 z-50 min-w-[300px] animate-fade-in`;
    alertDiv.innerHTML = `
        <div class="flex items-center justify-between">
            <span>${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-lg">&times;</button>
        </div>
    `;
    
    document.body.appendChild(alertDiv);
    
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

/**
 * Hiển thị biểu tượng đang tải
 */
function showLoading(target = 'body') {
    const loading = document.createElement('div');
    loading.id = 'loading-spinner';
    loading.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
    loading.innerHTML = `
        <div class="bg-white rounded-lg p-6">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
    `;
    document.body.appendChild(loading);
}

/**
 * Ẩn biểu tượng đang tải
 */
function hideLoading() {
    const loading = document.getElementById('loading-spinner');
    if (loading) loading.remove();
}

/**
 * Định dạng tiền tệ VND
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

/**
 * Định dạng ngày tháng
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

/**
 * Định dạng ngày giờ
 */
function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('vi-VN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Tính số ngày còn lại
 */
function daysRemaining(endDate) {
    const end = new Date(endDate);
    const today = new Date();
    const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
}

/**
 * Tính phần trăm tiến độ
 */
function calculateProgress(current, target) {
    if (!target || target === 0) return 0;
    const percentage = (current / target) * 100;
    return Math.min(percentage, 100).toFixed(1);
}

/**
 * Rút gọn văn bản
 */
function truncateText(text, length = 100) {
    if (!text) return '';
    return text.length > length ? text.substring(0, length) + '...' : text;
}

/**
 * Lấy màu huy hiệu trạng thái
 */
function getStatusBadgeClass(status) {
    const statusMap = {
        'cho_duyet': 'badge-warning',
        'dang_dien_ra': 'badge-success',
        'ket_thuc': 'badge-info',
        'bi_huy': 'badge-danger',
        'duyet': 'badge-success',
        'tu_choi': 'badge-danger',
        'huy': 'badge-danger',
        'active': 'badge-success',
        'inactive': 'badge-warning',
        'banned': 'badge-danger'
    };
    return statusMap[status] || 'badge-info';
}

/**
 * Lấy text trạng thái tiếng Việt
 */
function getStatusText(status) {
    const statusMap = {
        'cho_duyet': 'Chờ duyệt',
        'dang_dien_ra': 'Đang diễn ra',
        'ket_thuc': 'Kết thúc',
        'bi_huy': 'Bị hủy',
        'duyet': 'Đã duyệt',
        'tu_choi': 'Từ chối',
        'huy': 'Đã hủy',
        'active': 'Hoạt động',
        'inactive': 'Không hoạt động',
        'banned': 'Bị khóa'
    };
    return statusMap[status] || status;
}

/**
 * Lấy text vai trò tiếng Việt
 */
function getRoleText(role) {
    const roleMap = {
        'admin': 'Quản trị viên',
        'to_chuc': 'Tổ chức',
        'tinh_nguyen_vien': 'Tình nguyện viên',
        'manh_thuong_quan': 'Mạnh thường quân'
    };
    return roleMap[role] || role;
}

/**
 * Mở cửa sổ bật lên
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

/**
 * Đóng cửa sổ bật lên
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
}

/**
 * Hộp thoại xác nhận
 */
function confirmDialog(message) {
    return confirm(message);
}

/**
 * Kiểm tra email hợp lệ
 */
function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Kiểm tra số điện thoại hợp lệ
 */
function isValidPhone(phone) {
    const regex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    return regex.test(phone);
}

/**
 * Hàm debounce (trì hoãn)
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ========================================
// Hàm điều hướng
// ========================================

/**
 * Cập nhật điều hướng theo vai trò
 */
function updateNavigation() {
    const user = getCurrentUser();
    const authLinks = document.getElementById('auth-links');
    const userMenu = document.getElementById('user-menu');
    
    if (!authLinks || !userMenu) return;
    
    if (user) {
        authLinks.classList.add('hidden');
        userMenu.classList.remove('hidden');
        
        const userName = document.getElementById('user-name');
        if (userName) userName.textContent = user.ho_ten;
        
        const userAvatar = document.getElementById('user-avatar');
        if (userAvatar) userAvatar.textContent = user.ho_ten.charAt(0).toUpperCase();
        
        // Thêm link theo vai trò
        const dashboardLink = document.getElementById('dashboard-link');
        if (dashboardLink) {
            if (user.vai_tro === 'admin') {
                dashboardLink.href = 'dashboard-admin.html';
            } else if (user.vai_tro === 'to_chuc') {
                dashboardLink.href = 'dashboard-to-chuc.html';
            } else {
                dashboardLink.href = 'profile.html';
            }
        }
    } else {
        authLinks.classList.remove('hidden');
        userMenu.classList.add('hidden');
    }
}

// ========================================
// Khởi tạo khi trang tải
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    updateNavigation();
    
    // Thêm xử lý đăng xuất
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirmDialog('Bạn có chắc chắn muốn đăng xuất?')) {
                logout();
            }
        });
    }
    
    // Đóng cửa sổ khi click vùng phủ
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal-overlay')) {
            e.target.nextElementSibling?.classList.add('hidden');
            document.body.style.overflow = 'auto';
        }
    });
});

// ========================================
// Xuất hàm để sử dụng ở các file khác
// ========================================

window.api = {
    get: apiGet,
    post: apiPost,
    put: apiPut,
    delete: apiDelete
};

window.auth = {
    login,
    register,
    logout,
    getCurrentUser,
    isAuthenticated,
    hasRole,
    requireAuth,
    requireRole
};

window.ui = {
    showAlert,
    showLoading,
    hideLoading,
    formatCurrency,
    formatDate,
    formatDateTime,
    daysRemaining,
    calculateProgress,
    truncateText,
    getStatusBadgeClass,
    getStatusText,
    getRoleText,
    openModal,
    closeModal,
    confirmDialog,
    isValidEmail,
    isValidPhone,
    debounce
};

// Notification System for Users
const NotificationManager = {
    dropdownOpen: false,
    notifications: [],
    unreadCount: 0,

    // Khởi tạo
    init() {
        this.loadUnreadCount();
        // Tự động refresh mỗi 30 giây
        setInterval(() => this.loadUnreadCount(), 30000);
    },

    // Lấy số thông báo chưa đọc
    async loadUnreadCount() {
        const token = auth.getToken('user');
        if (!token) return;

        try {
            const res = await fetch(`${CONFIG.API_URL}/notifications/unread-count`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                this.unreadCount = data.count;
                this.updateBadge();
            }
        } catch (e) {
            console.error('Lỗi lấy số thông báo:', e);
        }
    },

    // Cập nhật badge số thông báo
    updateBadge() {
        const badge = document.getElementById('notificationBadge');
        if (badge) {
            if (this.unreadCount > 0) {
                badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }
        }
    },

    // Lấy danh sách thông báo
    async loadNotifications() {
        const token = auth.getToken('user');
        if (!token) return;

        try {
            const res = await fetch(`${CONFIG.API_URL}/notifications?limit=20`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            
            if (data.success) {
                this.notifications = data.data;
                this.unreadCount = data.unread_count;
                this.updateBadge();
                this.renderDropdown();
            }
        } catch (e) {
            console.error('Lỗi lấy thông báo:', e);
        }
    },

    // Toggle dropdown
    toggleDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (!dropdown) return;

        this.dropdownOpen = !this.dropdownOpen;
        
        if (this.dropdownOpen) {
            dropdown.classList.remove('hidden');
            this.loadNotifications();
        } else {
            dropdown.classList.add('hidden');
        }
    },

    // Đóng dropdown khi click ra ngoài
    closeDropdown() {
        const dropdown = document.getElementById('notificationDropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
            this.dropdownOpen = false;
        }
    },

    // Render dropdown content
    renderDropdown() {
        const container = document.getElementById('notificationList');
        if (!container) return;

        if (this.notifications.length === 0) {
            container.innerHTML = `
                <div class="p-6 text-center text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <p>Chưa có thông báo nào</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.notifications.map(n => this.renderNotificationItem(n)).join('');
    },

    // Render 1 item thông báo
    renderNotificationItem(n) {
        const timeAgo = this.getTimeAgo(n.ngay_gui);
        const icon = this.getIcon(n.loai);
        const bgClass = n.da_doc ? 'bg-white' : 'bg-blue-50';

        return `
            <div class="notification-item ${bgClass} hover:bg-gray-50 border-b last:border-b-0 cursor-pointer"
                 onclick="NotificationManager.handleClick(${n.thong_bao_id}, '${n.lien_ket || ''}')">
                <div class="flex gap-3 p-3">
                    <div class="flex-shrink-0 w-10 h-10 rounded-full ${icon.bg} flex items-center justify-center">
                        ${icon.svg}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-gray-900 ${n.da_doc ? '' : 'font-semibold'}">${n.tieu_de}</p>
                        <p class="text-sm text-gray-600 line-clamp-2">${n.noi_dung}</p>
                        <p class="text-xs text-gray-400 mt-1">${timeAgo}</p>
                    </div>
                    ${!n.da_doc ? '<div class="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>' : ''}
                </div>
            </div>
        `;
    },

    // Lấy icon theo loại thông báo
    getIcon(loai) {
        const icons = {
            'chien_dich': {
                bg: 'bg-green-100',
                svg: '<svg class="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clip-rule="evenodd"/></svg>'
            },
            'quyen_gop': {
                bg: 'bg-yellow-100',
                svg: '<svg class="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20"><path d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z"/></svg>'
            },
            'tham_gia': {
                bg: 'bg-purple-100',
                svg: '<svg class="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/></svg>'
            },
            'he_thong': {
                bg: 'bg-blue-100',
                svg: '<svg class="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/></svg>'
            }
        };
        return icons[loai] || icons['he_thong'];
    },

    // Tính thời gian
    getTimeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        if (seconds < 60) return 'Vừa xong';
        if (seconds < 3600) return Math.floor(seconds / 60) + ' phút trước';
        if (seconds < 86400) return Math.floor(seconds / 3600) + ' giờ trước';
        if (seconds < 604800) return Math.floor(seconds / 86400) + ' ngày trước';
        return new Date(date).toLocaleDateString('vi-VN');
    },

    // Xử lý click vào thông báo
    async handleClick(id, link) {
        const token = auth.getToken('user');
        if (!token) return;

        // Đánh dấu đã đọc
        try {
            await fetch(`${CONFIG.API_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.loadUnreadCount();
        } catch (e) {}

        // Chuyển trang nếu có link
        if (link) {
            window.location.href = link;
        }
    },

    // Đánh dấu tất cả đã đọc
    async markAllRead() {
        const token = auth.getToken('user');
        if (!token) return;

        try {
            await fetch(`${CONFIG.API_URL}/notifications/mark-all-read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            this.unreadCount = 0;
            this.updateBadge();
            this.loadNotifications();
        } catch (e) {
            console.error('Lỗi đánh dấu đã đọc:', e);
        }
    }
};

// Khởi tạo khi DOM ready
document.addEventListener('DOMContentLoaded', () => {
    if (auth.isLoggedInAs('user')) {
        NotificationManager.init();
    }
});

// Đóng dropdown khi click ra ngoài
document.addEventListener('click', (e) => {
    const notifArea = document.getElementById('notificationArea');
    if (notifArea && !notifArea.contains(e.target)) {
        NotificationManager.closeDropdown();
    }
});

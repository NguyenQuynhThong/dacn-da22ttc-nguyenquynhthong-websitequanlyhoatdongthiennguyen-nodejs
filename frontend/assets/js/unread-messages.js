// Script để load và hiển thị số tin nhắn chưa đọc

// Cho tổ chức
async function loadOrgUnreadCount() {
    const token = auth.getToken('tochuc');
    if (!token) return;
    
    try {
        const res = await fetch(`${CONFIG.API_URL}/messages/org/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.count > 0) {
            updateUnreadBadge('org', data.count);
        }
    } catch (error) {
        console.error('Lỗi load tin nhắn chưa đọc:', error);
    }
}

// Cho user
async function loadUserUnreadCount() {
    const token = auth.getToken('user');
    if (!token) return;
    
    try {
        const res = await fetch(`${CONFIG.API_URL}/messages/unread-count`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.count > 0) {
            updateUnreadBadge('user', data.count);
        }
    } catch (error) {
        console.error('Lỗi load tin nhắn chưa đọc:', error);
    }
}

// Cập nhật badge
function updateUnreadBadge(type, count) {
    // Badge ở header
    const badge = document.getElementById('unreadBadge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count > 99 ? '99+' : count;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    
    // Badge ở sidebar (cho user)
    const sidebarBadge = document.getElementById('sidebarUnreadBadge');
    if (sidebarBadge) {
        if (count > 0) {
            sidebarBadge.textContent = count > 99 ? '99+' : count;
            sidebarBadge.classList.remove('hidden');
        } else {
            sidebarBadge.classList.add('hidden');
        }
    }
}

// Auto load khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Kiểm tra xem đang ở trang tổ chức hay user dựa vào URL
    const isOrgPage = window.location.pathname.includes('/tochuc/');
    
    if (isOrgPage && auth.isLoggedInAs('tochuc')) {
        // Trang tổ chức
        loadOrgUnreadCount();
        setInterval(loadOrgUnreadCount, 30000);
    } else if (!isOrgPage && auth.isLoggedInAs('user')) {
        // Trang user
        loadUserUnreadCount();
        setInterval(loadUserUnreadCount, 30000);
    }
});

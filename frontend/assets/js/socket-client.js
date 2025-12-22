// Socket.IO Client cho realtime messaging
let socket = null;
let socketInitialized = false;

// Khởi tạo kết nối socket
function initSocket() {
    // Tránh init nhiều lần
    if (socketInitialized && socket && socket.connected) {
        console.log('Socket: Đã kết nối rồi');
        return;
    }
    
    // Kiểm tra xem đang ở trang nào
    const isOrgPage = window.location.pathname.includes('/tochuc/');
    
    let token, userType;
    
    if (isOrgPage && auth.isLoggedInAs('tochuc')) {
        token = auth.getToken('tochuc');
        userType = 'tochuc';
    } else if (!isOrgPage && auth.isLoggedInAs('user')) {
        token = auth.getToken('user');
        userType = 'user';
    } else if (auth.isLoggedIn()) {
        // Fallback cho user thường
        token = auth.getToken();
        userType = 'user';
    }
    
    if (!token) {
        console.log('Socket: Chưa đăng nhập');
        return;
    }

    console.log('Socket: Đang kết nối với userType =', userType);

    // Kết nối socket với reconnect
    socket = io(CONFIG.API_URL.replace('/api', ''), {
        auth: {
            token: token,
            userType: userType
        },
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        transports: ['websocket', 'polling']
    });

    socketInitialized = true;

    // Xử lý kết nối thành công
    socket.on('connect', () => {
        console.log('🔌 Socket connected:', socket.id);
    });

    // Xử lý lỗi kết nối
    socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error.message);
    });

    // Lắng nghe tin nhắn mới
    socket.on('new_message', (data) => {
        console.log('📩 New message received:', data);
        
        // Cập nhật badge
        updateUnreadBadgeIncrement();
        
        // Hiển thị notification
        showMessageNotification(data);
        
        // Nếu đang ở trang tin nhắn, cập nhật danh sách
        if (typeof onNewMessageReceived === 'function') {
            onNewMessageReceived(data);
        }
    });

    // Xử lý disconnect
    socket.on('disconnect', (reason) => {
        console.log('🔌 Socket disconnected:', reason);
        // Tự động reconnect nếu server disconnect
        if (reason === 'io server disconnect') {
            socket.connect();
        }
    });

    // Xử lý reconnect
    socket.on('reconnect', (attemptNumber) => {
        console.log('🔌 Socket reconnected after', attemptNumber, 'attempts');
    });
}

// Tăng badge lên 1
function updateUnreadBadgeIncrement() {
    const badge = document.getElementById('unreadBadge');
    if (badge) {
        let count = parseInt(badge.textContent) || 0;
        count++;
        badge.textContent = count > 99 ? '99+' : count;
        badge.classList.remove('hidden');
    }
    
    const sidebarBadge = document.getElementById('sidebarUnreadBadge');
    if (sidebarBadge) {
        let count = parseInt(sidebarBadge.textContent) || 0;
        count++;
        sidebarBadge.textContent = count > 99 ? '99+' : count;
        sidebarBadge.classList.remove('hidden');
    }
}

// Hiển thị notification
function showMessageNotification(data) {
    // Tạo notification element
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-white rounded-lg shadow-lg border p-4 max-w-sm z-50 animate-slide-up';
    
    const senderName = data.ho_ten || data.ten_to_chuc || 'Người gửi';
    
    notification.innerHTML = `
        <div class="flex items-start gap-3">
            <div class="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                ${senderName.charAt(0).toUpperCase()}
            </div>
            <div class="flex-1 min-w-0">
                <p class="font-semibold text-gray-800">${senderName}</p>
                <p class="text-sm text-gray-600 truncate">${data.noi_dung}</p>
            </div>
            <button onclick="this.parentElement.parentElement.remove()" class="text-gray-400 hover:text-gray-600">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
            </button>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        notification.remove();
    }, 5000);
    
    // Play sound (optional)
    playNotificationSound();
}

// Phát âm thanh thông báo
function playNotificationSound() {
    try {
        const audio = new Audio('../assets/sounds/notification.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {}); // Ignore errors if autoplay blocked
    } catch (e) {
        // Ignore
    }
}

// Đánh dấu đã đọc
function markAsRead(conversationId) {
    if (socket) {
        socket.emit('mark_read', { conversationId });
    }
}

// Ngắt kết nối
function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}

// Auto init khi trang load
document.addEventListener('DOMContentLoaded', function() {
    // Chờ config.js load xong
    setTimeout(initSocket, 500);
});

// KHÔNG disconnect khi rời trang để giữ kết nối
// window.addEventListener('beforeunload', disconnectSocket);

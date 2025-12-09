// Quản lý trang hồ sơ cá nhân

// Biến toàn cục
let currentUser = null;

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập
    currentUser = auth.getCurrentUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }

    // Hiển thị thông tin người dùng trong navbar
    document.getElementById('user-name').textContent = currentUser.ho_ten;
    document.getElementById('user-avatar').textContent = currentUser.ho_ten.charAt(0).toUpperCase();

    // Đăng xuất
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.logout();
    });

    // Tải dữ liệu hồ sơ
    await loadProfileData();

    // Gắn sự kiện cho form
    document.getElementById('settings-form').addEventListener('submit', handleUpdateProfile);
    document.getElementById('password-form').addEventListener('submit', handleChangePassword);
    document.getElementById('edit-profile-btn').addEventListener('click', () => switchTab('settings'));

    // Hiện nội dung
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('profile-content').classList.remove('hidden');
    document.getElementById('user-menu').classList.remove('hidden');
});

// Tải dữ liệu hồ sơ
async function loadProfileData() {
    try {
        // Tạm thời dùng thông tin từ localStorage
        // Sau sẽ gọi API: const response = await api.get('/auth/me');
        const userData = currentUser;

        // Cập nhật thông tin cơ bản
        displayBasicInfo(userData);
        
        // Tải thống kê (tạm comment)
        // await loadStatistics(userData);
        
        // Tải danh sách chiến dịch (tạm comment)
        // await loadUserCampaigns();
        
        // Tải lịch sử quyên góp (tạm comment)
        // await loadDonationHistory();

        // Điền form cài đặt
        fillSettingsForm(userData);
        
        // Ẩn các tab chưa có dữ liệu
        const statsCards = document.querySelectorAll('.stats-card');
        if (statsCards.length > 0) {
            statsCards.forEach(card => {
                const statValue = card.querySelector('[id^="stat-"]');
                if (statValue) statValue.textContent = '0';
            });
        }

    } catch (error) {
        console.error('Lỗi khi tải dữ liệu hồ sơ:', error);
        ui.showAlert('Không thể tải thông tin hồ sơ', 'error');
    }
}

// Hiển thị thông tin cơ bản
function displayBasicInfo(userData) {
    // Avatar
    document.getElementById('profile-avatar').textContent = 
        userData.ho_ten.charAt(0).toUpperCase();

    // Tên
    document.getElementById('profile-name').textContent = userData.ho_ten;

    // Email
    document.getElementById('profile-email').textContent = userData.email;

    // Số điện thoại
    document.getElementById('profile-phone').textContent = userData.so_dien_thoai || 'Chưa cập nhật';

    // Badge vai trò
    const roleBadge = document.getElementById('role-badge');
    const roleLabels = {
        'admin': 'Quản trị viên',
        'to_chuc': 'Tổ chức',
        'tinh_nguyen_vien': 'Tình nguyện viên',
        'nha_hao_tam': 'Nhà hảo tâm'
    };
    roleBadge.textContent = roleLabels[userData.vai_tro] || userData.vai_tro;
    
    // Màu badge theo vai trò
    roleBadge.className = 'badge ';
    switch(userData.vai_tro) {
        case 'admin':
            roleBadge.className += 'badge-danger';
            break;
        case 'to_chuc':
            roleBadge.className += 'badge-primary';
            break;
        case 'tinh_nguyen_vien':
            roleBadge.className += 'badge-success';
            break;
        case 'nha_hao_tam':
            roleBadge.className += 'badge-warning';
            break;
        default:
            roleBadge.className += 'badge-secondary';
    }

    // Giới thiệu
    document.getElementById('profile-bio').textContent = 
        userData.gioi_thieu || 'Chưa có thông tin giới thiệu';
}

// Tải thống kê
async function loadStatistics(userData) {
    try {
        const response = await api.get('/nguoi-dung/thong-ke');
        const stats = response.data;

        document.getElementById('stat-campaigns').textContent = stats.so_chien_dich || 0;
        document.getElementById('stat-donations').textContent = 
            ui.formatCurrency(stats.tong_quyen_gop || 0);
        document.getElementById('stat-hours').textContent = stats.gio_tinh_nguyen || 0;

    } catch (error) {
        console.error('Lỗi khi tải thống kê:', error);
    }
}

// Tải danh sách chiến dịch đã tham gia
async function loadUserCampaigns() {
    try {
        const response = await api.get('/nguoi-dung/chien-dich');
        const campaigns = response.data || [];

        const container = document.getElementById('campaigns-list');

        if (campaigns.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Chưa tham gia chiến dịch nào</p>';
            return;
        }

        container.innerHTML = campaigns.map(item => `
            <div class="flex items-start gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div class="w-20 h-20 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-lg flex-shrink-0 overflow-hidden">
                    ${item.hinh_anh 
                        ? `<img src="${item.hinh_anh}" alt="${item.ten_chien_dich}" class="w-full h-full object-cover">`
                        : `<div class="w-full h-full flex items-center justify-center text-white">
                            <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                            </svg>
                        </div>`
                    }
                </div>
                <div class="flex-1">
                    <h4 class="font-semibold text-gray-900 mb-1">
                        <a href="chi-tiet-chien-dich.html?id=${item.id_chien_dich}" class="hover:text-primary-600">
                            ${item.ten_chien_dich}
                        </a>
                    </h4>
                    <div class="flex flex-wrap gap-3 text-sm text-gray-600 mb-2">
                        <span class="badge ${item.trang_thai === 'dang_tien_hanh' ? 'badge-success' : 'badge-secondary'} text-xs">
                            ${getStatusText(item.trang_thai)}
                        </span>
                        <span>${item.vai_tro_tham_gia === 'tinh_nguyen_vien' ? '🙋 Tình nguyện viên' : '💰 Nhà hảo tâm'}</span>
                    </div>
                    <p class="text-sm text-gray-500">Tham gia: ${ui.formatDate(item.ngay_tham_gia)}</p>
                </div>
                <a href="chi-tiet-chien-dich.html?id=${item.id_chien_dich}" class="btn btn-sm btn-secondary">
                    Chi tiết
                </a>
            </div>
        `).join('');

    } catch (error) {
        console.error('Lỗi khi tải chiến dịch:', error);
    }
}

// Tải lịch sử quyên góp
async function loadDonationHistory() {
    try {
        const response = await api.get('/nguoi-dung/quyen-gop');
        const donations = response.data || [];

        const container = document.getElementById('donations-list');

        if (donations.length === 0) {
            container.innerHTML = '<p class="text-gray-500 text-center py-8">Chưa có lịch sử quyên góp</p>';
            return;
        }

        container.innerHTML = donations.map(donation => `
            <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div class="flex items-start gap-4">
                    <div class="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center text-white flex-shrink-0">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                    </div>
                    <div>
                        <h4 class="font-semibold text-gray-900 mb-1">
                            <a href="chi-tiet-chien-dich.html?id=${donation.id_chien_dich}" class="hover:text-primary-600">
                                ${donation.ten_chien_dich}
                            </a>
                        </h4>
                        <p class="text-sm text-gray-600 mb-1">
                            ${donation.loai_quyen_gop === 'tien' 
                                ? `Tiền mặt: ${ui.formatCurrency(donation.so_tien || 0)}`
                                : `Hiện vật: ${donation.mo_ta_hien_vat}`
                            }
                        </p>
                        <p class="text-xs text-gray-500">${ui.formatDate(donation.ngay_quyen_gop)}</p>
                    </div>
                </div>
                <span class="badge ${donation.trang_thai === 'da_xac_nhan' ? 'badge-success' : 'badge-warning'}">
                    ${donation.trang_thai === 'da_xac_nhan' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                </span>
            </div>
        `).join('');

    } catch (error) {
        console.error('Lỗi khi tải lịch sử quyên góp:', error);
    }
}

// Điền form cài đặt
function fillSettingsForm(userData) {
    document.getElementById('setting-name').value = userData.ho_ten || '';
    document.getElementById('setting-email').value = userData.email || '';
    document.getElementById('setting-phone').value = userData.so_dien_thoai || '';
    document.getElementById('setting-address').value = userData.dia_chi || '';
    document.getElementById('setting-bio').value = userData.gioi_thieu || '';
}

// Xử lý cập nhật hồ sơ
async function handleUpdateProfile(e) {
    e.preventDefault();

    const data = {
        ho_ten: document.getElementById('setting-name').value.trim(),
        so_dien_thoai: document.getElementById('setting-phone').value.trim()
    };

    try {
        ui.showLoading(true);
        await api.put('/nguoi-dung/profile', data);
        
        ui.showAlert('Cập nhật hồ sơ thành công!', 'success');
        
        // Cập nhật lại thông tin hiển thị
        await loadProfileData();

    } catch (error) {
        console.error('Lỗi khi cập nhật hồ sơ:', error);
        ui.showAlert(error.message || 'Không thể cập nhật hồ sơ', 'error');
    } finally {
        ui.showLoading(false);
    }
}

// Xử lý đổi mật khẩu
async function handleChangePassword(e) {
    e.preventDefault();

    const currentPassword = document.getElementById('current-password').value;
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Validate
    if (!currentPassword || !newPassword || !confirmPassword) {
        ui.showAlert('Vui lòng điền đầy đủ thông tin', 'warning');
        return;
    }

    if (newPassword.length < 6) {
        ui.showAlert('Mật khẩu mới phải có ít nhất 6 ký tự', 'warning');
        return;
    }

    if (newPassword !== confirmPassword) {
        ui.showAlert('Mật khẩu xác nhận không khớp', 'warning');
        return;
    }

    try {
        ui.showLoading(true);
        await api.post('/nguoi-dung/doi-mat-khau', {
            mat_khau_cu: currentPassword,
            mat_khau_moi: newPassword
        });

        ui.showAlert('Đổi mật khẩu thành công!', 'success');
        
        // Reset form
        document.getElementById('password-form').reset();

    } catch (error) {
        console.error('Lỗi khi đổi mật khẩu:', error);
        ui.showAlert(error.message || 'Không thể đổi mật khẩu', 'error');
    } finally {
        ui.showLoading(false);
    }
}

// Chuyển tab
function switchTab(tabName) {
    // Ẩn tất cả tab content
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Bỏ active class khỏi tất cả tab button
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-primary-600', 'text-primary-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    // Hiển thị tab được chọn
    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    
    // Thêm active class cho tab button
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-primary-600', 'text-primary-600');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
    }
}

// Lấy text trạng thái
function getStatusText(status) {
    const statusMap = {
        'dang_mo': 'Đang mở',
        'dang_tien_hanh': 'Đang tiến hành',
        'hoan_thanh': 'Hoàn thành',
        'da_dong': 'Đã đóng'
    };
    return statusMap[status] || 'Không xác định';
}

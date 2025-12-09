// Quản lý Dashboard Tổ chức

// Biến toàn cục
let currentUser = null;
let organizationData = null;
let campaigns = [];
let volunteers = [];
let donations = [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập và quyền tổ chức
    currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.vai_tro !== 'to_chuc') {
        ui.showAlert('Bạn không có quyền truy cập trang này', 'error');
        window.location.href = 'index.html';
        return;
    }

    // Hiển thị thông tin tổ chức
    document.getElementById('user-name').textContent = currentUser.ho_ten;
    document.getElementById('user-avatar').textContent = currentUser.ho_ten.charAt(0).toUpperCase();

    // Đăng xuất
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.logout();
    });

    // Tải dữ liệu dashboard
    await loadDashboardData();

    // Gắn sự kiện cho form tạo chiến dịch
    document.getElementById('create-campaign-form').addEventListener('submit', handleCreateCampaign);

    // Gắn sự kiện cho bộ lọc
    document.getElementById('filter-campaign-status')?.addEventListener('change', filterCampaigns);

    // Hiện dashboard
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
});

// Tải dữ liệu dashboard
async function loadDashboardData() {
    try {
        await loadOrganizationInfo();
        await loadStatistics();
        await loadCampaigns();
        await loadVolunteers();
        await loadDonations();

    } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        ui.showAlert('Không thể tải dữ liệu dashboard', 'error');
    }
}

// Tải thông tin tổ chức
async function loadOrganizationInfo() {
    try {
        const response = await api.get('/to-chuc/thong-tin');
        organizationData = response.data;
        
        document.getElementById('org-name-header').textContent = organizationData.ten_to_chuc;
        document.getElementById('org-name-title').textContent = organizationData.ten_to_chuc;

    } catch (error) {
        console.error('Lỗi khi tải thông tin tổ chức:', error);
    }
}

// Tải thống kê
async function loadStatistics() {
    try {
        const response = await api.get('/to-chuc/thong-ke');
        const stats = response.data;

        document.getElementById('stat-campaigns').textContent = stats.tong_chien_dich || 0;
        document.getElementById('stat-donations').textContent = ui.formatCurrency(stats.tong_quyen_gop || 0);
        document.getElementById('stat-volunteers').textContent = stats.tong_tinh_nguyen_vien || 0;
        document.getElementById('stat-donors').textContent = stats.tong_nha_hao_tam || 0;

    } catch (error) {
        console.error('Lỗi khi tải thống kê:', error);
    }
}

// Tải danh sách chiến dịch
async function loadCampaigns() {
    try {
        const response = await api.get('/to-chuc/chien-dich');
        campaigns = response.data || [];
        renderCampaigns(campaigns);

    } catch (error) {
        console.error('Lỗi khi tải chiến dịch:', error);
        document.getElementById('campaigns-list').innerHTML = 
            '<p class="text-red-500 text-center py-8">Không thể tải dữ liệu</p>';
    }
}

// Render danh sách chiến dịch
function renderCampaigns(campaignList) {
    const container = document.getElementById('campaigns-list');
    
    if (campaignList.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Chưa có chiến dịch nào</p>';
        return;
    }

    container.innerHTML = campaignList.map(campaign => {
        const progress = campaign.muc_tieu_tien > 0 
            ? Math.min(100, (campaign.da_quyen_gop / campaign.muc_tieu_tien) * 100)
            : 0;

        return `
            <div class="border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div class="flex items-start justify-between mb-4">
                    <div class="flex-1">
                        <h4 class="text-lg font-semibold text-gray-900 mb-2">${campaign.ten_chien_dich}</h4>
                        <div class="flex flex-wrap gap-2 text-sm text-gray-600 mb-3">
                            <span class="badge ${getCampaignStatusBadgeClass(campaign.trang_thai)}">
                                ${getCampaignStatusLabel(campaign.trang_thai)}
                            </span>
                            <span class="flex items-center gap-1">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                                </svg>
                                ${ui.formatDate(campaign.ngay_bat_dau)} - ${ui.formatDate(campaign.ngay_ket_thuc)}
                            </span>
                        </div>
                        <p class="text-sm text-gray-600 mb-4 line-clamp-2">${campaign.mo_ta || 'Không có mô tả'}</p>
                    </div>
                </div>

                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-2">
                        <span class="text-gray-600">Tiến độ quyên góp</span>
                        <span class="font-semibold text-primary-600">${ui.formatCurrency(campaign.da_quyen_gop || 0)} / ${ui.formatCurrency(campaign.muc_tieu_tien)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="text-xs text-gray-500 mt-1 text-right">${progress.toFixed(0)}%</div>
                </div>

                <div class="flex items-center justify-between">
                    <div class="flex gap-4 text-sm text-gray-600">
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            ${campaign.so_tinh_nguyen_vien || 0} TNV
                        </span>
                        <span class="flex items-center gap-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/>
                            </svg>
                            ${campaign.so_nha_hao_tam || 0} NHT
                        </span>
                    </div>

                    <div class="flex gap-2">
                        <a href="chi-tiet-chien-dich.html?id=${campaign.id}" class="btn btn-sm btn-secondary" target="_blank">
                            Xem chi tiết
                        </a>
                        <button onclick="editCampaign(${campaign.id})" class="btn btn-sm btn-primary">
                            Chỉnh sửa
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Tải danh sách tình nguyện viên
async function loadVolunteers() {
    try {
        const response = await api.get('/to-chuc/tinh-nguyen-vien');
        volunteers = response.data || [];
        renderVolunteers(volunteers);

    } catch (error) {
        console.error('Lỗi khi tải tình nguyện viên:', error);
        document.getElementById('volunteers-table-body').innerHTML = 
            '<tr><td colspan="6" class="text-center py-8 text-red-500">Không thể tải dữ liệu</td></tr>';
    }
}

// Render danh sách tình nguyện viên
function renderVolunteers(volunteerList) {
    const tbody = document.getElementById('volunteers-table-body');
    
    if (volunteerList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Chưa có tình nguyện viên nào</td></tr>';
        return;
    }

    tbody.innerHTML = volunteerList.map(volunteer => `
        <tr>
            <td class="font-medium">${volunteer.ho_ten}</td>
            <td>${volunteer.email}</td>
            <td>${volunteer.so_dien_thoai || 'N/A'}</td>
            <td>${volunteer.ten_chien_dich}</td>
            <td>${ui.formatDate(volunteer.ngay_tham_gia)}</td>
            <td>
                <span class="badge ${volunteer.trang_thai === 'duyet' ? 'badge-success' : 'badge-warning'}">
                    ${volunteer.trang_thai === 'duyet' ? 'Đã duyệt' : 'Chờ duyệt'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Tải danh sách quyên góp
async function loadDonations() {
    try {
        const response = await api.get('/to-chuc/quyen-gop');
        donations = response.data || [];
        renderDonations(donations);

    } catch (error) {
        console.error('Lỗi khi tải quyên góp:', error);
        document.getElementById('donations-table-body').innerHTML = 
            '<tr><td colspan="6" class="text-center py-8 text-red-500">Không thể tải dữ liệu</td></tr>';
    }
}

// Render danh sách quyên góp
function renderDonations(donationList) {
    const tbody = document.getElementById('donations-table-body');
    
    if (donationList.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-8 text-gray-500">Chưa có quyên góp nào</td></tr>';
        return;
    }

    tbody.innerHTML = donationList.map(donation => `
        <tr>
            <td class="font-medium">${donation.ten_nguoi_quyen_gop}</td>
            <td>${donation.ten_chien_dich}</td>
            <td>
                <span class="badge ${donation.loai_quyen_gop === 'tien' ? 'badge-success' : 'badge-info'}">
                    ${donation.loai_quyen_gop === 'tien' ? 'Tiền mặt' : 'Hiện vật'}
                </span>
            </td>
            <td class="font-semibold text-green-600">
                ${donation.loai_quyen_gop === 'tien' 
                    ? ui.formatCurrency(donation.so_tien || 0)
                    : 'N/A'
                }
            </td>
            <td>${ui.formatDate(donation.ngay_quyen_gop)}</td>
            <td>
                <span class="badge ${donation.trang_thai === 'da_xac_nhan' ? 'badge-success' : 'badge-warning'}">
                    ${donation.trang_thai === 'da_xac_nhan' ? 'Đã xác nhận' : 'Chờ xác nhận'}
                </span>
            </td>
        </tr>
    `).join('');
}

// Xử lý tạo chiến dịch mới
async function handleCreateCampaign(e) {
    e.preventDefault();

    const data = {
        ten_chien_dich: document.getElementById('campaign-name').value.trim(),
        mo_ta: document.getElementById('campaign-description').value.trim(),
        ngay_bat_dau: document.getElementById('campaign-start-date').value,
        ngay_ket_thuc: document.getElementById('campaign-end-date').value,
        danh_muc: document.getElementById('campaign-category').value,
        dia_diem: document.getElementById('campaign-location').value.trim(),
        muc_tieu_quyen_gop: parseInt(document.getElementById('campaign-target').value),
        so_tinh_nguyen_vien_can: parseInt(document.getElementById('campaign-volunteers-needed').value) || 0,
        hinh_anh: document.getElementById('campaign-image').value.trim()
    };

    // Validate
    if (!data.ten_chien_dich || !data.mo_ta || !data.ngay_bat_dau || !data.ngay_ket_thuc || 
        !data.danh_muc || !data.dia_diem || !data.muc_tieu_quyen_gop) {
        ui.showAlert('Vui lòng điền đầy đủ thông tin bắt buộc', 'warning');
        return;
    }

    if (new Date(data.ngay_ket_thuc) <= new Date(data.ngay_bat_dau)) {
        ui.showAlert('Ngày kết thúc phải sau ngày bắt đầu', 'warning');
        return;
    }

    try {
        ui.showLoading(true);
        await api.post('/to-chuc/chien-dich', data);
        
        ui.showAlert('Tạo chiến dịch thành công!', 'success');
        document.getElementById('create-campaign-form').reset();
        
        // Tải lại danh sách chiến dịch
        await loadCampaigns();
        await loadStatistics();
        
        // Chuyển về tab chiến dịch
        switchTab('campaigns');

    } catch (error) {
        console.error('Lỗi khi tạo chiến dịch:', error);
        ui.showAlert(error.message || 'Không thể tạo chiến dịch', 'error');
    } finally {
        ui.showLoading(false);
    }
}

// Lọc chiến dịch theo trạng thái
function filterCampaigns() {
    const status = document.getElementById('filter-campaign-status').value;
    
    if (!status) {
        renderCampaigns(campaigns);
        return;
    }

    const filtered = campaigns.filter(c => c.trang_thai === status);
    renderCampaigns(filtered);
}

// Chỉnh sửa chiến dịch
function editCampaign(campaignId) {
    // TODO: Hiển thị modal chỉnh sửa
    ui.showAlert('Chức năng đang được phát triển', 'info');
}

// Chuyển tab
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-primary-600', 'text-primary-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-primary-600', 'text-primary-600');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
    }
}

// Các hàm helper
function getCampaignStatusLabel(status) {
    const labels = {
        'dang_mo': 'Đang mở',
        'dang_tien_hanh': 'Đang tiến hành',
        'hoan_thanh': 'Hoàn thành',
        'da_dong': 'Đã đóng'
    };
    return labels[status] || status;
}

function getCampaignStatusBadgeClass(status) {
    const classes = {
        'dang_mo': 'badge-success',
        'dang_tien_hanh': 'badge-info',
        'hoan_thanh': 'badge-primary',
        'da_dong': 'badge-secondary'
    };
    return classes[status] || 'badge-secondary';
}

// Quản lý Dashboard Admin

// Biến toàn cục
let currentUser = null;
let allUsers = [];
let allOrganizations = [];
let allCampaigns = [];
let allReports = [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra đăng nhập và quyền admin
    currentUser = auth.getCurrentUser();
    if (!currentUser || currentUser.vai_tro !== 'admin') {
        ui.showAlert('Bạn không có quyền truy cập trang này', 'error');
        window.location.href = 'index.html';
        return;
    }

    // Hiển thị thông tin admin
    document.getElementById('user-name').textContent = currentUser.ho_ten;
    document.getElementById('user-avatar').textContent = currentUser.ho_ten.charAt(0).toUpperCase();

    // Đăng xuất
    document.getElementById('logout-btn').addEventListener('click', () => {
        auth.logout();
    });

    // Tải dữ liệu dashboard
    await loadDashboardData();

    // Gắn sự kiện cho bộ lọc
    document.getElementById('search-users')?.addEventListener('input', debounce(filterUsers, 300));
    document.getElementById('filter-role')?.addEventListener('change', filterUsers);
    document.getElementById('search-orgs')?.addEventListener('input', debounce(filterOrganizations, 300));
    document.getElementById('filter-org-status')?.addEventListener('change', filterOrganizations);
    document.getElementById('search-campaigns')?.addEventListener('input', debounce(filterCampaigns, 300));
    document.getElementById('filter-campaign-status')?.addEventListener('change', filterCampaigns);

    // Hiện dashboard
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');
});

// Tải dữ liệu dashboard
async function loadDashboardData() {
    try {
        await loadStatistics();
        await loadUsers();
        await loadOrganizations();
        await loadCampaigns();
        await loadReports();

    } catch (error) {
        console.error('Lỗi khi tải dữ liệu dashboard:', error);
        ui.showAlert('Không thể tải dữ liệu dashboard', 'error');
    }
}

// Tải thống kê
async function loadStatistics() {
    try {
        const response = await api.get('/admin/thong-ke');
        const stats = response.data;

        document.getElementById('stat-users').textContent = stats.tong_nguoi_dung || 0;
        document.getElementById('stat-organizations').textContent = stats.tong_to_chuc || 0;
        document.getElementById('stat-campaigns').textContent = stats.tong_chien_dich || 0;
        document.getElementById('stat-donations').textContent = ui.formatCurrency(stats.tong_quyen_gop || 0);

    } catch (error) {
        console.error('Lỗi khi tải thống kê:', error);
    }
}

// Tải danh sách người dùng
async function loadUsers() {
    try {
        const response = await api.get('/admin/nguoi-dung');
        allUsers = response.data || [];
        renderUsers(allUsers);

    } catch (error) {
        console.error('Lỗi khi tải người dùng:', error);
        document.getElementById('users-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center py-8 text-red-500">Không thể tải dữ liệu</td></tr>';
    }
}

// Render danh sách người dùng
function renderUsers(users) {
    const tbody = document.getElementById('users-table-body');
    
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.user_id}</td>
            <td class="font-medium">${user.ho_ten}</td>
            <td>${user.email}</td>
            <td><span class="badge ${getRoleBadgeClass(user.vai_tro)}">${getRoleLabel(user.vai_tro)}</span></td>
            <td><span class="badge ${user.trang_thai === 'active' ? 'badge-success' : 'badge-secondary'}">${user.trang_thai === 'active' ? 'Hoạt động' : 'Tạm khóa'}</span></td>
            <td>${ui.formatDate(user.ngay_tao)}</td>
            <td>
                <button onclick="viewUser(${user.user_id})" class="text-primary-600 hover:text-primary-700 mr-2" title="Xem chi tiết">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </button>
                <button onclick="toggleUserStatus(${user.user_id}, '${user.trang_thai}')" class="text-orange-600 hover:text-orange-700 mr-2" title="${user.trang_thai === 'active' ? 'Khóa' : 'Mở khóa'}">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                    </svg>
                </button>
                <button onclick="deleteUser(${user.user_id})" class="text-red-600 hover:text-red-700" title="Xóa">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// Tải danh sách tổ chức
async function loadOrganizations() {
    try {
        const response = await api.get('/admin/to-chuc');
        allOrganizations = response.data || [];
        renderOrganizations(allOrganizations);

    } catch (error) {
        console.error('Lỗi khi tải tổ chức:', error);
        document.getElementById('organizations-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center py-8 text-red-500">Không thể tải dữ liệu</td></tr>';
    }
}

// Render danh sách tổ chức
function renderOrganizations(orgs) {
    const tbody = document.getElementById('organizations-table-body');
    
    if (orgs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = orgs.map(org => `
        <tr>
            <td>${org.id}</td>
            <td class="font-medium">${org.ten_to_chuc}</td>
            <td>${org.email || 'N/A'}</td>
            <td>${org.so_chien_dich || 0}</td>
            <td><span class="badge ${org.trang_thai === 'hoat_dong' ? 'badge-success' : 'badge-secondary'}">${org.trang_thai === 'hoat_dong' ? 'Hoạt động' : 'Tạm ngừng'}</span></td>
            <td>${ui.formatDate(org.ngay_tao)}</td>
            <td>
                <button onclick="viewOrganization(${org.id})" class="text-primary-600 hover:text-primary-700 mr-2" title="Xem chi tiết">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </button>
                <button onclick="deleteOrganization(${org.id})" class="text-red-600 hover:text-red-700" title="Xóa">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// Tải danh sách chiến dịch
async function loadCampaigns() {
    try {
        const response = await api.get('/admin/chien-dich');
        allCampaigns = response.data || [];
        renderCampaigns(allCampaigns);

    } catch (error) {
        console.error('Lỗi khi tải chiến dịch:', error);
        document.getElementById('campaigns-table-body').innerHTML = 
            '<tr><td colspan="7" class="text-center py-8 text-red-500">Không thể tải dữ liệu</td></tr>';
    }
}

// Render danh sách chiến dịch
function renderCampaigns(campaigns) {
    const tbody = document.getElementById('campaigns-table-body');
    
    if (campaigns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center py-8 text-gray-500">Không có dữ liệu</td></tr>';
        return;
    }

    tbody.innerHTML = campaigns.map(campaign => `
        <tr>
            <td>${campaign.id}</td>
            <td class="font-medium">${campaign.ten_chien_dich}</td>
            <td>${campaign.ten_to_chuc || 'N/A'}</td>
            <td>${ui.formatCurrency(campaign.muc_tieu_quyen_gop)}</td>
            <td>${ui.formatCurrency(campaign.tong_quyen_gop || 0)}</td>
            <td><span class="badge ${getCampaignStatusBadgeClass(campaign.trang_thai)}">${getCampaignStatusLabel(campaign.trang_thai)}</span></td>
            <td>
                <button onclick="viewCampaign(${campaign.id})" class="text-primary-600 hover:text-primary-700 mr-2" title="Xem chi tiết">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                    </svg>
                </button>
                <button onclick="deleteCampaign(${campaign.id})" class="text-red-600 hover:text-red-700" title="Xóa">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                    </svg>
                </button>
            </td>
        </tr>
    `).join('');
}

// Tải báo cáo
async function loadReports() {
    try {
        const response = await api.get('/admin/bao-cao');
        allReports = response.data || [];
        renderReports(allReports);

    } catch (error) {
        console.error('Lỗi khi tải báo cáo:', error);
        document.getElementById('reports-list').innerHTML = 
            '<p class="text-red-500 text-center py-8">Không thể tải dữ liệu</p>';
    }
}

// Render báo cáo
function renderReports(reports) {
    const container = document.getElementById('reports-list');
    
    if (reports.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Không có báo cáo nào</p>';
        return;
    }

    container.innerHTML = reports.map(report => `
        <div class="border border-gray-200 rounded-lg p-4">
            <div class="flex items-start justify-between mb-2">
                <div>
                    <h4 class="font-semibold text-gray-900">${report.tieu_de}</h4>
                    <p class="text-sm text-gray-600 mt-1">${report.noi_dung}</p>
                </div>
                <span class="badge ${report.trang_thai === 'da_xu_ly' ? 'badge-success' : 'badge-warning'}">
                    ${report.trang_thai === 'da_xu_ly' ? 'Đã xử lý' : 'Chờ xử lý'}
                </span>
            </div>
            <div class="flex items-center justify-between text-sm text-gray-500">
                <span>Người báo cáo: ${report.ten_nguoi_bao_cao}</span>
                <span>${ui.formatDate(report.ngay_tao)}</span>
            </div>
            ${report.trang_thai !== 'da_xu_ly' ? `
                <button onclick="handleReport(${report.id})" class="btn btn-sm btn-primary mt-3">
                    Xử lý báo cáo
                </button>
            ` : ''}
        </div>
    `).join('');
}

// Chuyển tab
function switchTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active', 'border-red-600', 'text-red-600');
        btn.classList.add('border-transparent', 'text-gray-500');
    });

    document.getElementById(`tab-${tabName}`).classList.remove('hidden');
    const activeBtn = document.querySelector(`[data-tab="${tabName}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active', 'border-red-600', 'text-red-600');
        activeBtn.classList.remove('border-transparent', 'text-gray-500');
    }
}

// Các hàm filter
function filterUsers() {
    const searchTerm = document.getElementById('search-users').value.toLowerCase();
    const role = document.getElementById('filter-role').value;

    const filtered = allUsers.filter(user => {
        const matchSearch = !searchTerm || 
            user.ho_ten.toLowerCase().includes(searchTerm) ||
            user.email.toLowerCase().includes(searchTerm);
        const matchRole = !role || user.vai_tro === role;
        return matchSearch && matchRole;
    });

    renderUsers(filtered);
}

function filterOrganizations() {
    const searchTerm = document.getElementById('search-orgs').value.toLowerCase();
    const status = document.getElementById('filter-org-status').value;

    const filtered = allOrganizations.filter(org => {
        const matchSearch = !searchTerm || org.ten_to_chuc.toLowerCase().includes(searchTerm);
        const matchStatus = !status || org.trang_thai === status;
        return matchSearch && matchStatus;
    });

    renderOrganizations(filtered);
}

function filterCampaigns() {
    const searchTerm = document.getElementById('search-campaigns').value.toLowerCase();
    const status = document.getElementById('filter-campaign-status').value;

    const filtered = allCampaigns.filter(campaign => {
        const matchSearch = !searchTerm || campaign.ten_chien_dich.toLowerCase().includes(searchTerm);
        const matchStatus = !status || campaign.trang_thai === status;
        return matchSearch && matchStatus;
    });

    renderCampaigns(filtered);
}

// Các hàm thao tác
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    const action = newStatus === 'active' ? 'mở khóa' : 'khóa';
    
    if (!confirm(`Bạn có chắc muốn ${action} người dùng này?`)) return;

    try {
        await api.put(`/admin/nguoi-dung/${userId}/trang-thai`, { trang_thai: newStatus });
        ui.showAlert(`Đã ${action} người dùng thành công`, 'success');
        await loadUsers();
    } catch (error) {
        ui.showAlert('Không thể thay đổi trạng thái người dùng', 'error');
    }
}

async function deleteUser(userId) {
    if (!confirm('Bạn có chắc muốn xóa người dùng này? Hành động không thể hoàn tác.')) return;

    try {
        await api.delete(`/admin/nguoi-dung/${userId}`);
        ui.showAlert('Đã xóa người dùng thành công', 'success');
        await loadUsers();
    } catch (error) {
        ui.showAlert('Không thể xóa người dùng', 'error');
    }
}

function viewUser(userId) {
    window.open(`profile.html?id=${userId}`, '_blank');
}

function viewOrganization(orgId) {
    window.open(`chi-tiet-to-chuc.html?id=${orgId}`, '_blank');
}

function viewCampaign(campaignId) {
    window.open(`chi-tiet-chien-dich.html?id=${campaignId}`, '_blank');
}

async function deleteOrganization(orgId) {
    if (!confirm('Bạn có chắc muốn xóa tổ chức này? Hành động không thể hoàn tác.')) return;

    try {
        await api.delete(`/admin/to-chuc/${orgId}`);
        ui.showAlert('Đã xóa tổ chức thành công', 'success');
        await loadOrganizations();
    } catch (error) {
        ui.showAlert('Không thể xóa tổ chức', 'error');
    }
}

async function deleteCampaign(campaignId) {
    if (!confirm('Bạn có chắc muốn xóa chiến dịch này? Hành động không thể hoàn tác.')) return;

    try {
        await api.delete(`/admin/chien-dich/${campaignId}`);
        ui.showAlert('Đã xóa chiến dịch thành công', 'success');
        await loadCampaigns();
    } catch (error) {
        ui.showAlert('Không thể xóa chiến dịch', 'error');
    }
}

async function handleReport(reportId) {
    try {
        await api.put(`/admin/bao-cao/${reportId}`, { trang_thai: 'da_xu_ly' });
        ui.showAlert('Đã xử lý báo cáo', 'success');
        await loadReports();
    } catch (error) {
        ui.showAlert('Không thể xử lý báo cáo', 'error');
    }
}

// Các hàm helper
function getRoleLabel(role) {
    const labels = {
        'admin': 'Quản trị viên',
        'to_chuc': 'Tổ chức',
        'tinh_nguyen_vien': 'Tình nguyện viên',
        'nha_hao_tam': 'Nhà hảo tâm'
    };
    return labels[role] || role;
}

function getRoleBadgeClass(role) {
    const classes = {
        'admin': 'badge-danger',
        'to_chuc': 'badge-primary',
        'tinh_nguyen_vien': 'badge-success',
        'nha_hao_tam': 'badge-warning'
    };
    return classes[role] || 'badge-secondary';
}

function getCampaignStatusLabel(status) {
    const labels = {
        'cho_duyet': 'Chờ duyệt',
        'dang_dien_ra': 'Đang diễn ra',
        'ket_thuc': 'Kết thúc',
        'bi_huy': 'Bị hủy'
    };
    return labels[status] || status;
}

function getCampaignStatusBadgeClass(status) {
    const classes = {
        'cho_duyet': 'badge-warning',
        'dang_dien_ra': 'badge-success',
        'ket_thuc': 'badge-secondary',
        'bi_huy': 'badge-danger'
    };
    return classes[status] || 'badge-secondary';
}

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

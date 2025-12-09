// Chi tiết tổ chức
const API_URL = 'http://localhost:5000/api';
let currentOrganization = null;

// Lấy ID tổ chức từ URL
function getOrganizationIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Format số tiền
function formatCurrency(amount) {
    if (!amount) return '0đ';
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND'
    }).format(amount);
}

// Format ngày tháng
function formatDate(dateString) {
    if (!dateString) return 'Chưa cập nhật';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Lấy trạng thái badge
function getStatusBadge(status) {
    const badges = {
        'cho_duyet': '<span class="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">Chờ duyệt</span>',
        'dang_dien_ra': '<span class="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">Đang diễn ra</span>',
        'ket_thuc': '<span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Kết thúc</span>',
        'bi_huy': '<span class="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">Bị hủy</span>'
    };
    return badges[status] || '<span class="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium">Không xác định</span>';
}

// Tải thông tin tổ chức
async function loadOrganization() {
    const organizationId = getOrganizationIdFromUrl();
    
    if (!organizationId) {
        showError('Không tìm thấy ID tổ chức');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/organizations/${organizationId}`);
        
        if (!response.ok) {
            throw new Error('Không thể tải thông tin tổ chức');
        }

        const result = await response.json();
        const data = result.data || result;
        currentOrganization = data;
        
        displayOrganization(data);
        loadOrganizationCampaigns(organizationId);
        
        // Ẩn loading, hiện nội dung
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('organization-content').classList.remove('hidden');
        
    } catch (error) {
        console.error('Error loading organization:', error);
        showError('Không thể tải thông tin tổ chức. Vui lòng thử lại sau.');
    }
}

// Hiển thị thông tin tổ chức
function displayOrganization(org) {
    // Avatar
    const avatar = org.ho_ten ? org.ho_ten.charAt(0).toUpperCase() : 'T';
    document.getElementById('org-avatar').textContent = avatar;
    
    // Thông tin cơ bản
    document.getElementById('org-name').textContent = org.ho_ten || 'Tổ chức';
    document.getElementById('org-description').textContent = org.mo_ta || 'Chưa có mô tả';
    document.getElementById('org-address').textContent = org.dia_chi || 'Chưa cập nhật';
    document.getElementById('org-phone').textContent = org.so_dien_thoai || 'Chưa cập nhật';
    document.getElementById('org-join-date').textContent = formatDate(org.ngay_tao);
    
    // Breadcrumb
    document.getElementById('breadcrumb-title').textContent = org.ho_ten || 'Chi tiết';
    
    // Thống kê
    document.getElementById('stat-campaigns').textContent = org.so_chien_dich || 0;
    document.getElementById('stat-volunteers').textContent = org.so_tinh_nguyen_vien || 0;
    document.getElementById('stat-donations').textContent = formatCurrency(org.tong_quyen_gop || 0);
    
    // Đại diện
    if (org.dai_dien_name || org.email) {
        const repAvatar = org.dai_dien_name ? org.dai_dien_name.charAt(0).toUpperCase() : '?';
        document.getElementById('rep-avatar').textContent = repAvatar;
        document.getElementById('rep-name').textContent = org.dai_dien_name || 'Chưa cập nhật';
        document.getElementById('rep-email').textContent = org.email || 'Chưa cập nhật';
    }
    
    // Cập nhật title trang
    document.title = `${org.ho_ten} - Web Thiện Nguyện`;
}

// Tải danh sách chiến dịch của tổ chức
async function loadOrganizationCampaigns(organizationId) {
    try {
        const response = await fetch(`${API_URL}/campaigns?to_chuc_id=${organizationId}&limit=100`);
        
        if (!response.ok) {
            throw new Error('Không thể tải danh sách chiến dịch');
        }

        const result = await response.json();
        const campaigns = result.data || result;
        displayCampaigns(campaigns);
        
    } catch (error) {
        console.error('Error loading campaigns:', error);
        document.getElementById('campaigns-list').innerHTML = 
            '<p class="text-gray-500 text-center py-8">Không thể tải danh sách chiến dịch</p>';
    }
}

// Hiển thị danh sách chiến dịch
function displayCampaigns(campaigns) {
    const container = document.getElementById('campaigns-list');
    
    if (!campaigns || campaigns.length === 0) {
        container.innerHTML = '<p class="text-gray-500 text-center py-8">Tổ chức chưa có chiến dịch nào</p>';
        return;
    }

    const campaignsHTML = campaigns.map(campaign => createCampaignCard(campaign)).join('');
    container.innerHTML = campaignsHTML;
}

// Tạo card chiến dịch
function createCampaignCard(campaign) {
    const progress = campaign.muc_tieu_tien > 0 
        ? Math.min(Math.round((campaign.da_quyen_gop / campaign.muc_tieu_tien) * 100), 100)
        : 0;
    
    const endDate = campaign.ngay_ket_thuc ? new Date(campaign.ngay_ket_thuc) : null;
    const today = new Date();
    const daysLeft = endDate ? Math.ceil((endDate - today) / (1000 * 60 * 60 * 24)) : 0;

    return `
        <div class="border border-gray-200 rounded-lg p-4 hover:border-primary-300 hover:shadow-md transition-all">
            <div class="flex items-start justify-between mb-3">
                <div class="flex-1">
                    <h3 class="font-semibold text-gray-900 hover:text-primary-600 mb-1">
                        <a href="chi-tiet-chien-dich.html?id=${campaign.chien_dich_id}">${campaign.tieu_de}</a>
                    </h3>
                    <p class="text-sm text-gray-600 line-clamp-2">${campaign.mo_ta || ''}</p>
                </div>
                <div class="ml-4">
                    ${getStatusBadge(campaign.trang_thai)}
                </div>
            </div>
            
            <div class="space-y-2 mb-3">
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Đã quyên góp:</span>
                    <span class="font-semibold text-primary-600">${formatCurrency(campaign.da_quyen_gop)}</span>
                </div>
                <div class="flex justify-between text-sm">
                    <span class="text-gray-600">Mục tiêu:</span>
                    <span class="font-semibold text-gray-900">${formatCurrency(campaign.muc_tieu_tien)}</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-2">
                    <div class="bg-gradient-to-r from-primary-500 to-primary-600 h-2 rounded-full transition-all" style="width: ${progress}%"></div>
                </div>
                <div class="flex justify-between text-xs text-gray-500">
                    <span>${progress}% đạt được</span>
                    ${daysLeft > 0 
                        ? `<span>${daysLeft} ngày còn lại</span>` 
                        : campaign.trang_thai === 'dang_dien_ra' 
                            ? '<span>Không giới hạn</span>'
                            : '<span>Đã kết thúc</span>'
                    }
                </div>
            </div>

            <div class="flex items-center justify-between pt-3 border-t border-gray-100">
                <div class="flex items-center gap-4 text-sm text-gray-600">
                    <span class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        ${campaign.so_tinh_nguyen_vien || 0}
                    </span>
                </div>
                <a href="chi-tiet-chien-dich.html?id=${campaign.chien_dich_id}" class="text-primary-600 hover:text-primary-700 font-medium text-sm">
                    Xem chi tiết →
                </a>
            </div>
        </div>
    `;
}

// Hiển thị lỗi
function showError(message) {
    const loadingState = document.getElementById('loading-state');
    loadingState.innerHTML = `
        <div class="text-center">
            <svg class="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h2 class="text-2xl font-bold text-gray-900 mb-2">Không tìm thấy tổ chức</h2>
            <p class="text-gray-600 mb-6">${message}</p>
            <a href="to-chuc.html" class="inline-block px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
                Quay lại danh sách tổ chức
            </a>
        </div>
    `;
}

// Khởi tạo khi trang load
document.addEventListener('DOMContentLoaded', () => {
    loadOrganization();
});

// Quản lý trang danh sách chiến dịch

// Biến toàn cục
let allCampaigns = [];
let filteredCampaigns = [];
let currentPage = 1;
const itemsPerPage = 9;

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async () => {
    // Kiểm tra trạng thái đăng nhập
    const user = auth.getCurrentUser();
    if (user) {
        document.getElementById('auth-links').classList.add('hidden');
        document.getElementById('user-menu').classList.remove('hidden');
        document.getElementById('user-name').textContent = user.ho_ten;
        document.getElementById('user-avatar').textContent = user.ho_ten.charAt(0).toUpperCase();
    }

    // Đăng xuất
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        auth.logout();
    });

    // Tải danh sách chiến dịch
    await loadCampaigns();

    // Gắn sự kiện cho bộ lọc
    document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('category-filter').addEventListener('change', applyFilters);
    document.getElementById('sort-filter').addEventListener('change', applyFilters);

    // Gắn sự kiện cho pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
});

// Hàm tải danh sách chiến dịch
async function loadCampaigns() {
    try {
        showLoading(true);
        
        // Gọi API để lấy danh sách chiến dịch
        const response = await api.get('/campaigns?limit=100');
        allCampaigns = response.data || [];
        filteredCampaigns = [...allCampaigns];
        
        // Áp dụng bộ lọc và render
        applyFilters();
        
    } catch (error) {
        console.error('Lỗi khi tải chiến dịch:', error);
        ui.showAlert('Không thể tải danh sách chiến dịch. Vui lòng thử lại sau.', 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

// Áp dụng bộ lọc
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('status-filter').value;
    const categoryFilter = document.getElementById('category-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;

    // Lọc chiến dịch
    filteredCampaigns = allCampaigns.filter(campaign => {
        // Lọc theo từ khóa tìm kiếm
        const matchSearch = !searchTerm || 
            campaign.ten_chien_dich.toLowerCase().includes(searchTerm) ||
            campaign.mo_ta?.toLowerCase().includes(searchTerm);

        // Lọc theo trạng thái
        const matchStatus = !statusFilter || campaign.trang_thai === statusFilter;

        // Lọc theo danh mục
        const matchCategory = !categoryFilter || campaign.danh_muc === categoryFilter;

        return matchSearch && matchStatus && matchCategory;
    });

    // Sắp xếp
    sortCampaigns(sortFilter);

    // Reset về trang đầu
    currentPage = 1;

    // Render kết quả
    renderCampaigns();
}

// Sắp xếp chiến dịch
function sortCampaigns(sortType) {
    switch (sortType) {
        case 'newest':
            filteredCampaigns.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));
            break;
        case 'oldest':
            filteredCampaigns.sort((a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao));
            break;
        case 'most_donated':
            filteredCampaigns.sort((a, b) => (b.tong_quyen_gop || 0) - (a.tong_quyen_gop || 0));
            break;
        case 'ending_soon':
            filteredCampaigns.sort((a, b) => new Date(a.ngay_ket_thuc) - new Date(b.ngay_ket_thuc));
            break;
    }
}

// Render danh sách chiến dịch
function renderCampaigns() {
    const container = document.getElementById('campaigns-list');
    
    if (filteredCampaigns.length === 0) {
        showEmptyState();
        return;
    }

    // Tính toán phân trang
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const campaignsToShow = filteredCampaigns.slice(startIndex, endIndex);

    // Render các card chiến dịch
    container.innerHTML = campaignsToShow.map(campaign => createCampaignCard(campaign)).join('');

    // Render pagination
    renderPagination();

    // Hiện danh sách
    document.getElementById('empty-state').classList.add('hidden');
    container.classList.remove('hidden');
}

// Tạo HTML cho card chiến dịch
function createCampaignCard(campaign) {
    const progress = campaign.muc_tieu_tien > 0 
        ? Math.min(100, (campaign.da_quyen_gop / campaign.muc_tieu_tien) * 100)
        : 0;

    const statusBadge = getStatusBadge(campaign.trang_thai);
    const categoryBadge = getCategoryBadge(campaign.danh_muc);

    return `
        <div class="card card-hover bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300">
            <div class="relative h-48 bg-gradient-to-br from-primary-400 to-secondary-500 overflow-hidden">
                ${campaign.hinh_anh 
                    ? `<img src="${campaign.hinh_anh}" alt="${campaign.ten_chien_dich}" class="w-full h-full object-cover">`
                    : `<div class="w-full h-full flex items-center justify-center">
                        <svg class="w-20 h-20 text-white opacity-50" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                        </svg>
                    </div>`
                }
                <div class="absolute top-3 left-3">
                    ${statusBadge}
                </div>
                <div class="absolute top-3 right-3">
                    ${categoryBadge}
                </div>
            </div>
            
            <div class="p-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-primary-600">
                    <a href="chi-tiet-chien-dich.html?id=${campaign.chien_dich_id}">${campaign.ten_chien_dich}</a>
                </h3>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">${campaign.mo_ta || 'Không có mô tả'}</p>
                
                <div class="mb-4">
                    <div class="flex justify-between text-sm mb-2">
                        <span class="text-gray-600">Đã quyên góp</span>
                        <span class="font-semibold text-primary-600">${ui.formatCurrency(campaign.da_quyen_gop || 0)}</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Mục tiêu: ${ui.formatCurrency(campaign.muc_tieu_tien)}</span>
                        <span>${progress.toFixed(0)}%</span>
                    </div>
                </div>
                
                <div class="flex items-center justify-between text-sm text-gray-600 mb-4">
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                        </svg>
                        <span>${campaign.so_tinh_nguyen_vien || 0} TNV</span>
                    </div>
                    <div class="flex items-center gap-1">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                        </svg>
                        <span>Đến ${ui.formatDate(campaign.ngay_ket_thuc)}</span>
                    </div>
                </div>
                
                <a href="chi-tiet-chien-dich.html?id=${campaign.chien_dich_id}" class="btn btn-primary w-full">
                    Xem chi tiết
                </a>
            </div>
        </div>
    `;
}

// Lấy badge trạng thái
function getStatusBadge(status) {
    const badges = {
        'dang_mo': '<span class="badge badge-success">Đang mở</span>',
        'dang_tien_hanh': '<span class="badge badge-info">Đang tiến hành</span>',
        'hoan_thanh': '<span class="badge badge-primary">Hoàn thành</span>',
        'da_dong': '<span class="badge badge-secondary">Đã đóng</span>'
    };
    return badges[status] || '<span class="badge badge-secondary">Không xác định</span>';
}

// Lấy badge danh mục
function getCategoryBadge(category) {
    const badges = {
        'giao_duc': '<span class="badge bg-blue-100 text-blue-800">Giáo dục</span>',
        'y_te': '<span class="badge bg-red-100 text-red-800">Y tế</span>',
        'moi_truong': '<span class="badge bg-green-100 text-green-800">Môi trường</span>',
        'cuu_tro': '<span class="badge bg-orange-100 text-orange-800">Cứu trợ</span>',
        'xay_dung': '<span class="badge bg-purple-100 text-purple-800">Xây dựng</span>'
    };
    return badges[category] || '<span class="badge badge-secondary">Khác</span>';
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    
    if (totalPages <= 1) {
        document.getElementById('pagination').classList.add('hidden');
        return;
    }

    document.getElementById('pagination').classList.remove('hidden');
    
    // Cập nhật nút prev/next
    document.getElementById('prev-page').disabled = currentPage === 1;
    document.getElementById('next-page').disabled = currentPage === totalPages;

    // Render số trang
    const pageNumbers = document.getElementById('page-numbers');
    let pagesHTML = '';

    for (let i = 1; i <= totalPages; i++) {
        if (
            i === 1 || 
            i === totalPages || 
            (i >= currentPage - 1 && i <= currentPage + 1)
        ) {
            pagesHTML += `
                <button 
                    onclick="goToPage(${i})" 
                    class="px-4 py-2 border rounded-lg ${i === currentPage 
                        ? 'bg-primary-600 text-white border-primary-600' 
                        : 'border-gray-300 hover:bg-gray-50'}"
                >
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
            pagesHTML += '<span class="px-2">...</span>';
        }
    }

    pageNumbers.innerHTML = pagesHTML;
}

// Chuyển trang
function changePage(direction) {
    const totalPages = Math.ceil(filteredCampaigns.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderCampaigns();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Chuyển đến trang cụ thể
function goToPage(page) {
    currentPage = page;
    renderCampaigns();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hiển thị trạng thái loading
function showLoading(show) {
    document.getElementById('loading-state').classList.toggle('hidden', !show);
    document.getElementById('campaigns-list').classList.toggle('hidden', show);
    document.getElementById('empty-state').classList.add('hidden');
}

// Hiển thị trạng thái rỗng
function showEmptyState() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('campaigns-list').classList.add('hidden');
    document.getElementById('empty-state').classList.remove('hidden');
    document.getElementById('pagination').classList.add('hidden');
}

// Debounce cho tìm kiếm
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

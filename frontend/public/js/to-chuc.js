// Quản lý trang danh sách tổ chức

// Biến toàn cục
let allOrganizations = [];
let filteredOrganizations = [];
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

    // Tải danh sách tổ chức
    await loadOrganizations();

    // Gắn sự kiện cho bộ lọc
    document.getElementById('search-input').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('status-filter').addEventListener('change', applyFilters);
    document.getElementById('sort-filter').addEventListener('change', applyFilters);

    // Gắn sự kiện cho pagination
    document.getElementById('prev-page').addEventListener('click', () => changePage(-1));
    document.getElementById('next-page').addEventListener('click', () => changePage(1));
});

// Hàm tải danh sách tổ chức
async function loadOrganizations() {
    try {
        showLoading(true);
        
        // Gọi API để lấy danh sách tổ chức
        const response = await api.get('/organizations?limit=100');
        allOrganizations = response.data || [];
        filteredOrganizations = [...allOrganizations];
        
        // Áp dụng bộ lọc và render
        applyFilters();
        
    } catch (error) {
        console.error('Lỗi khi tải tổ chức:', error);
        ui.showAlert('Không thể tải danh sách tổ chức. Vui lòng thử lại sau.', 'error');
        showEmptyState();
    } finally {
        showLoading(false);
    }
}

// Áp dụng bộ lọc
function applyFilters() {
    const searchTerm = document.getElementById('search-input').value.toLowerCase().trim();
    const statusFilter = document.getElementById('status-filter').value;
    const sortFilter = document.getElementById('sort-filter').value;

    // Lọc tổ chức
    filteredOrganizations = allOrganizations.filter(org => {
        // Lọc theo từ khóa tìm kiếm
        const matchSearch = !searchTerm || 
            org.ten_to_chuc.toLowerCase().includes(searchTerm) ||
            org.mo_ta?.toLowerCase().includes(searchTerm);

        // Lọc theo trạng thái
        const matchStatus = !statusFilter || org.trang_thai === statusFilter;

        return matchSearch && matchStatus;
    });

    // Sắp xếp
    sortOrganizations(sortFilter);

    // Reset về trang đầu
    currentPage = 1;

    // Render kết quả
    renderOrganizations();
}

// Sắp xếp tổ chức
function sortOrganizations(sortType) {
    switch (sortType) {
        case 'newest':
            filteredOrganizations.sort((a, b) => new Date(b.ngay_tao) - new Date(a.ngay_tao));
            break;
        case 'oldest':
            filteredOrganizations.sort((a, b) => new Date(a.ngay_tao) - new Date(b.ngay_tao));
            break;
        case 'most_campaigns':
            filteredOrganizations.sort((a, b) => (b.so_chien_dich || 0) - (a.so_chien_dich || 0));
            break;
        case 'name_asc':
            filteredOrganizations.sort((a, b) => a.ten_to_chuc.localeCompare(b.ten_to_chuc, 'vi'));
            break;
        case 'name_desc':
            filteredOrganizations.sort((a, b) => b.ten_to_chuc.localeCompare(a.ten_to_chuc, 'vi'));
            break;
    }
}

// Render danh sách tổ chức
function renderOrganizations() {
    const container = document.getElementById('organizations-list');
    
    if (filteredOrganizations.length === 0) {
        showEmptyState();
        return;
    }

    // Tính toán phân trang
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const organizationsToShow = filteredOrganizations.slice(startIndex, endIndex);

    // Render các card tổ chức
    container.innerHTML = organizationsToShow.map(org => createOrganizationCard(org)).join('');

    // Render pagination
    renderPagination();

    // Hiện danh sách
    document.getElementById('empty-state').classList.add('hidden');
    container.classList.remove('hidden');
}

// Tạo HTML cho card tổ chức
function createOrganizationCard(org) {
    const statusBadge = org.trang_thai === 'hoat_dong' 
        ? '<span class="badge badge-success">Đang hoạt động</span>'
        : '<span class="badge badge-secondary">Tạm ngừng</span>';

    const avatar = org.ten_to_chuc.charAt(0).toUpperCase();

    return `
        <div class="card card-hover bg-white rounded-xl shadow-lg overflow-hidden transform transition-all duration-300">
            <!-- Header với gradient -->
            <div class="relative h-32 bg-gradient-to-br from-purple-500 via-purple-600 to-pink-600">
                <div class="absolute inset-0 opacity-20">
                    <div class="absolute top-0 left-0 w-24 h-24 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl"></div>
                    <div class="absolute bottom-0 right-0 w-24 h-24 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl"></div>
                </div>
                <div class="absolute top-3 right-3">
                    ${statusBadge}
                </div>
            </div>

            <!-- Avatar -->
            <div class="px-6 -mt-12 mb-4">
                <div class="w-24 h-24 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 border-4 border-white shadow-xl flex items-center justify-center text-white text-3xl font-bold">
                    ${avatar}
                </div>
            </div>

            <!-- Nội dung -->
            <div class="px-6 pb-6">
                <h3 class="text-xl font-semibold text-gray-900 mb-2 line-clamp-1">
                    ${org.ten_to_chuc}
                </h3>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2 min-h-[40px]">
                    ${org.mo_ta || 'Tổ chức thiện nguyện'}
                </p>

                <!-- Thông tin liên hệ -->
                <div class="space-y-2 mb-4 text-sm text-gray-600">
                    ${org.email ? `
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                            </svg>
                            <span class="truncate">${org.email}</span>
                        </div>
                    ` : ''}
                    ${org.so_dien_thoai ? `
                        <div class="flex items-center gap-2">
                            <svg class="w-4 h-4 text-primary-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                            </svg>
                            <span>${org.so_dien_thoai}</span>
                        </div>
                    ` : ''}
                    ${org.dia_chi ? `
                        <div class="flex items-start gap-2">
                            <svg class="w-4 h-4 text-primary-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                            <span class="line-clamp-2">${org.dia_chi}</span>
                        </div>
                    ` : ''}
                </div>

                <!-- Thống kê -->
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-4">
                    <div class="text-center">
                        <div class="text-lg font-bold text-primary-600">${org.so_chien_dich || 0}</div>
                        <div class="text-xs text-gray-600">Chiến dịch</div>
                    </div>
                    <div class="w-px h-8 bg-gray-300"></div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-green-600">${org.so_thanh_vien || 0}</div>
                        <div class="text-xs text-gray-600">Thành viên</div>
                    </div>
                    <div class="w-px h-8 bg-gray-300"></div>
                    <div class="text-center">
                        <div class="text-lg font-bold text-purple-600">${org.danh_gia || 0}⭐</div>
                        <div class="text-xs text-gray-600">Đánh giá</div>
                    </div>
                </div>

                <!-- Nút xem chi tiết -->
                <a href="chi-tiet-to-chuc.html?id=${org.to_chuc_id}" class="btn btn-primary w-full">
                    Xem chi tiết
                </a>
            </div>
        </div>
    `;
}

// Render pagination
function renderPagination() {
    const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
    
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
    const totalPages = Math.ceil(filteredOrganizations.length / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderOrganizations();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

// Chuyển đến trang cụ thể
function goToPage(page) {
    currentPage = page;
    renderOrganizations();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Hiển thị trạng thái loading
function showLoading(show) {
    document.getElementById('loading-state').classList.toggle('hidden', !show);
    document.getElementById('organizations-list').classList.toggle('hidden', show);
    document.getElementById('empty-state').classList.add('hidden');
}

// Hiển thị trạng thái rỗng
function showEmptyState() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('organizations-list').classList.add('hidden');
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

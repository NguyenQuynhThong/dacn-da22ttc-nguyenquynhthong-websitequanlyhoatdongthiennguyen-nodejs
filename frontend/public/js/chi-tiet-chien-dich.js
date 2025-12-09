// Quản lý trang chi tiết chiến dịch

// Biến toàn cục
let currentCampaign = null;
let currentUser = null;
let campaignId = null;

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', async () => {
    // Lấy ID chiến dịch từ URL
    const urlParams = new URLSearchParams(window.location.search);
    campaignId = urlParams.get('id');

    if (!campaignId) {
        showError();
        return;
    }

    // Kiểm tra trạng thái đăng nhập
    currentUser = auth.getCurrentUser();
    if (currentUser) {
        document.getElementById('auth-links').classList.add('hidden');
        document.getElementById('user-menu').classList.remove('hidden');
        document.getElementById('user-name').textContent = currentUser.ho_ten;
        document.getElementById('user-avatar').textContent = currentUser.ho_ten.charAt(0).toUpperCase();
        
        // Hiện form bình luận nếu đã đăng nhập
        document.getElementById('comment-form').classList.remove('hidden');
    }

    // Đăng xuất
    document.getElementById('logout-btn')?.addEventListener('click', () => {
        auth.logout();
    });

    // Tải thông tin chiến dịch
    await loadCampaignDetail();

    // Gắn sự kiện cho các nút
    document.getElementById('donate-btn').addEventListener('click', handleDonate);
    document.getElementById('volunteer-btn').addEventListener('click', handleVolunteer);
});

// Tải thông tin chi tiết chiến dịch
async function loadCampaignDetail() {
    try {
        // Gọi API để lấy thông tin chiến dịch
        const response = await api.get(`/campaigns/${campaignId}`);
        currentCampaign = response.data;

        // Hiển thị thông tin
        displayCampaignInfo();
        loadUpdates();
        loadComments();

        // Hiện nội dung
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('campaign-content').classList.remove('hidden');

    } catch (error) {
        console.error('Lỗi khi tải chiến dịch:', error);
        showError();
    }
}

// Hiển thị thông tin chiến dịch
function displayCampaignInfo() {
    // Cập nhật tiêu đề
    document.getElementById('campaign-title').textContent = currentCampaign.ten_chien_dich;
    document.getElementById('breadcrumb-title').textContent = currentCampaign.ten_chien_dich;
    document.title = `${currentCampaign.ten_chien_dich} - Web Thiện Nguyện`;

    // Cập nhật hình ảnh
    if (currentCampaign.hinh_anh) {
        const imgElement = document.getElementById('campaign-image');
        imgElement.src = currentCampaign.hinh_anh;
        imgElement.alt = currentCampaign.ten_chien_dich;
        imgElement.classList.remove('hidden');
        document.getElementById('campaign-image-placeholder').classList.add('hidden');
    }

    // Cập nhật badge
    document.getElementById('status-badge').outerHTML = getStatusBadge(currentCampaign.trang_thai);
    // Database không có danh_muc - comment tạm thời
    // document.getElementById('category-badge').outerHTML = getCategoryBadge(currentCampaign.danh_muc);

    // Cập nhật thông tin cơ bản
    document.getElementById('organization-name').textContent = currentCampaign.ten_to_chuc || 'Tổ chức';
    document.getElementById('campaign-dates').textContent = 
        `${ui.formatDate(currentCampaign.ngay_bat_dau)} - ${ui.formatDate(currentCampaign.ngay_ket_thuc)}`;
    // Database không có dia_diem - ẩn hoặc dùng địa chỉ tổ chức
    const locationEl = document.getElementById('campaign-location');
    if (locationEl) {
        locationEl.textContent = currentCampaign.to_chuc_dia_chi || 'Toàn quốc';
    }

    // Cập nhật mô tả
    document.getElementById('campaign-description').textContent = currentCampaign.mo_ta || 'Không có mô tả';

    // Cập nhật thông tin quyên góp
    const daQuyenGop = currentCampaign.da_quyen_gop || 0;
    const mucTieu = currentCampaign.muc_tieu_tien || 0;
    const progress = mucTieu > 0 
        ? Math.min(100, (daQuyenGop / mucTieu) * 100)
        : 0;

    document.getElementById('total-donated').textContent = ui.formatCurrency(daQuyenGop);
    document.getElementById('target-amount').textContent = ui.formatCurrency(mucTieu);
    document.getElementById('progress-percent').textContent = `${progress.toFixed(0)}%`;
    document.getElementById('progress-fill').style.width = `${progress}%`;
    document.getElementById('donor-count').textContent = currentCampaign.so_nha_hao_tam || 0;
    document.getElementById('volunteer-count').textContent = currentCampaign.so_tinh_nguyen_vien || 0;

    // Cập nhật thông tin tổ chức
    document.getElementById('org-avatar').textContent = 
        (currentCampaign.ten_to_chuc || 'T').charAt(0).toUpperCase();
    document.getElementById('org-name').textContent = currentCampaign.ten_to_chuc || 'Tổ chức';
    document.getElementById('org-description').textContent = currentCampaign.to_chuc_mo_ta || 'Tổ chức thiện nguyện';
    document.getElementById('org-link').href = `to-chuc.html?id=${currentCampaign.to_chuc_id}`;
}

// Lấy badge trạng thái
function getStatusBadge(status) {
    const badges = {
        'cho_duyet': '<span class="badge badge-warning">Chờ duyệt</span>',
        'dang_dien_ra': '<span class="badge badge-success">Đang diễn ra</span>',
        'ket_thuc': '<span class="badge badge-primary">Kết thúc</span>',
        'bi_huy': '<span class="badge badge-secondary">Bị hủy</span>'
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
    activeBtn.classList.add('active', 'border-primary-600', 'text-primary-600');
    activeBtn.classList.remove('border-transparent', 'text-gray-500');
}

// Tải danh sách cập nhật
async function loadUpdates() {
    try {
        const response = await api.get(`/chien-dich/${campaignId}/cap-nhat`);
        const updates = response.data || [];

        if (updates.length === 0) {
            return;
        }

        const container = document.getElementById('updates-list');
        container.innerHTML = updates.map(update => `
            <div class="border-l-4 border-primary-500 pl-4 py-2">
                <div class="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>${ui.formatDate(update.ngay_cap_nhat)}</span>
                </div>
                <h4 class="font-semibold text-gray-900 mb-2">${update.tieu_de}</h4>
                <p class="text-gray-600 text-sm">${update.noi_dung}</p>
            </div>
        `).join('');

    } catch (error) {
        console.error('Lỗi khi tải cập nhật:', error);
    }
}

// Tải danh sách bình luận
async function loadComments() {
    try {
        const response = await api.get(`/chien-dich/${campaignId}/binh-luan`);
        const comments = response.data || [];

        if (comments.length === 0) {
            return;
        }

        const container = document.getElementById('comments-list');
        container.innerHTML = comments.map(comment => `
            <div class="flex gap-4">
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 flex items-center justify-center text-white font-semibold flex-shrink-0">
                    ${comment.ten_nguoi_dung.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1">
                    <div class="bg-gray-50 rounded-lg p-4">
                        <div class="flex items-center justify-between mb-2">
                            <span class="font-semibold text-gray-900">${comment.ten_nguoi_dung}</span>
                            <span class="text-xs text-gray-500">${ui.formatDate(comment.ngay_tao)}</span>
                        </div>
                        <p class="text-gray-700 text-sm">${comment.noi_dung}</p>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Lỗi khi tải bình luận:', error);
    }
}

// Gửi bình luận
async function submitComment() {
    if (!currentUser) {
        ui.showAlert('Vui lòng đăng nhập để bình luận', 'warning');
        return;
    }

    const commentInput = document.getElementById('comment-input');
    const content = commentInput.value.trim();

    if (!content) {
        ui.showAlert('Vui lòng nhập nội dung bình luận', 'warning');
        return;
    }

    try {
        await api.post(`/chien-dich/${campaignId}/binh-luan`, {
            noi_dung: content
        });

        ui.showAlert('Đã gửi bình luận thành công', 'success');
        commentInput.value = '';
        
        // Tải lại danh sách bình luận
        await loadComments();

    } catch (error) {
        console.error('Lỗi khi gửi bình luận:', error);
        ui.showAlert('Không thể gửi bình luận. Vui lòng thử lại.', 'error');
    }
}

// Xử lý quyên góp
function handleDonate() {
    if (!currentUser) {
        ui.showAlert('Vui lòng đăng nhập để quyên góp', 'warning');
        window.location.href = 'login.html';
        return;
    }

    // TODO: Hiển thị modal quyên góp
    ui.showAlert('Chức năng quyên góp đang được phát triển', 'info');
}

// Xử lý đăng ký tình nguyện
async function handleVolunteer() {
    if (!currentUser) {
        ui.showAlert('Vui lòng đăng nhập để đăng ký tình nguyện', 'warning');
        window.location.href = 'login.html';
        return;
    }

    if (currentUser.vai_tro !== 'tinh_nguyen_vien') {
        ui.showAlert('Chỉ tài khoản tình nguyện viên mới có thể đăng ký tham gia', 'warning');
        return;
    }

    try {
        await api.post(`/chien-dich/${campaignId}/tham-gia`, {
            loai_tham_gia: 'tinh_nguyen_vien'
        });

        ui.showAlert('Đăng ký tham gia thành công! Tổ chức sẽ liên hệ với bạn sớm.', 'success');
        
        // Tải lại thông tin chiến dịch
        await loadCampaignDetail();

    } catch (error) {
        console.error('Lỗi khi đăng ký tham gia:', error);
        ui.showAlert(error.message || 'Không thể đăng ký tham gia. Vui lòng thử lại.', 'error');
    }
}

// Hiển thị lỗi
function showError() {
    document.getElementById('loading-state').classList.add('hidden');
    document.getElementById('error-state').classList.remove('hidden');
}

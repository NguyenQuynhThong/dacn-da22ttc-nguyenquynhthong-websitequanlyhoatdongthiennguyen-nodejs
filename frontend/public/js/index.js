// JavaScript riêng cho trang chủ

// Tải dữ liệu thống kê khi trang load
async function loadStats() {
    try {
        const response = await api.get('/stats/overview');
        const stats = response.data;
        
        document.getElementById('total-campaigns').textContent = stats.total_campaigns || 0;
        document.getElementById('total-volunteers').textContent = stats.total_volunteers || 0;
        document.getElementById('total-donations').textContent = ui.formatCurrency(stats.total_donations || 0);
        document.getElementById('total-organizations').textContent = stats.total_organizations || 0;
    } catch (error) {
        console.error('Error loading stats:', error);
        // Hiển thị số liệu mẫu nếu lỗi
        document.getElementById('total-campaigns').textContent = '0';
        document.getElementById('total-volunteers').textContent = '0';
        document.getElementById('total-donations').textContent = '0đ';
        document.getElementById('total-organizations').textContent = '0';
    }
}

// Tải danh sách chiến dịch nổi bật
async function loadFeaturedCampaigns() {
    const container = document.getElementById('featured-campaigns');
    
    try {
        const response = await api.get('/campaigns?limit=6&trang_thai=dang_dien_ra');
        const campaigns = response.data;
        
        console.log('Campaigns loaded:', campaigns); // Debug
        
        if (campaigns.length === 0) {
            container.innerHTML = `
                <div class="col-span-full text-center py-12">
                    <p class="text-gray-500">Chưa có chiến dịch nào đang diễn ra</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = campaigns.map(campaign => createCampaignCard(campaign)).join('');
    } catch (error) {
        console.error('Error loading campaigns:', error);
        container.innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-red-500">Không thể tải danh sách chiến dịch</p>
            </div>
        `;
    }
}

// Tạo HTML thẻ chiến dịch
function createCampaignCard(campaign) {
    const progress = ui.calculateProgress(campaign.da_quyen_gop || 0, campaign.muc_tieu_tien);
    const daysLeft = ui.daysRemaining(campaign.ngay_ket_thuc);
    
    return `
        <div class="card card-hover">
            <div class="relative h-48 bg-gradient-to-br from-primary-400 to-primary-600">
                ${campaign.hinh_anh ? `
                    <img src="${campaign.hinh_anh}" alt="${campaign.ten_chien_dich}" class="w-full h-full object-cover">
                ` : `
                    <div class="flex items-center justify-center h-full">
                        <svg class="w-16 h-16 text-white/50" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3.5a1.5 1.5 0 013 0V4a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-.5a1.5 1.5 0 000 3h.5a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-.5a1.5 1.5 0 00-3 0v.5a1 1 0 01-1 1H6a1 1 0 01-1-1v-3a1 1 0 00-1-1h-.5a1.5 1.5 0 010-3H4a1 1 0 001-1V6a1 1 0 011-1h3a1 1 0 001-1v-.5z"/>
                        </svg>
                    </div>
                `}
                <span class="badge ${ui.getStatusBadgeClass(campaign.trang_thai)} absolute top-4 right-4">
                    ${ui.getStatusText(campaign.trang_thai)}
                </span>
            </div>
            
            <div class="p-6">
                <h3 class="text-xl font-semibold mb-2 line-clamp-2">
                    ${campaign.ten_chien_dich}
                </h3>
                
                <p class="text-gray-600 text-sm mb-4 line-clamp-2">
                    ${ui.truncateText(campaign.mo_ta, 100)}
                </p>
                
                <div class="space-y-3">
                    <!-- Tiến độ -->
                    <div>
                        <div class="flex justify-between text-sm mb-1">
                            <span class="text-gray-600">Đã quyên góp</span>
                            <span class="font-semibold text-primary-600">${progress}%</span>
                        </div>
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <div class="flex justify-between text-sm mt-1">
                            <span class="font-semibold text-gray-900">
                                ${ui.formatCurrency(campaign.da_quyen_gop || 0)}
                            </span>
                            <span class="text-gray-600">
                                / ${ui.formatCurrency(campaign.muc_tieu_tien)}
                            </span>
                        </div>
                    </div>
                    
                    <!-- Thông tin -->
                    <div class="flex items-center justify-between text-sm text-gray-600">
                        <div class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                            </svg>
                            <span>Còn ${daysLeft} ngày</span>
                        </div>
                        <div class="flex items-center space-x-1">
                            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
                            </svg>
                            <span>${campaign.so_tinh_nguyen_vien || 0} TNV</span>
                        </div>
                    </div>
                    
                    <!-- Nút bấm -->
                    <a href="chi-tiet-chien-dich.html?id=${campaign.chien_dich_id}" 
                       class="btn btn-primary w-full mt-4">
                        Xem chi tiết
                    </a>
                </div>
            </div>
        </div>
    `;
}

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadFeaturedCampaigns();
    
    // Bật/tắt menu di động
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', () => {
            // Bật/tắt menu di động (sẽ triển khai sau)
            ui.showAlert('Mobile menu - to be implemented', 'info');
        });
    }
});

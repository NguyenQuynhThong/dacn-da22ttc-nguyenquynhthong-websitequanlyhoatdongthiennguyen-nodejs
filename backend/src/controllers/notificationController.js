// Controller xử lý thông báo
const { pool } = require('../config/database');

// Lấy danh sách thông báo của người dùng
const getUserNotifications = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { limit = 20, offset = 0 } = req.query;

        const [notifications] = await pool.query(
            `SELECT * FROM ThongBao 
             WHERE user_id = ? 
             ORDER BY ngay_gui DESC 
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        // Đếm số chưa đọc
        const [unread] = await pool.query(
            'SELECT COUNT(*) as count FROM ThongBao WHERE user_id = ? AND da_doc = FALSE',
            [userId]
        );

        res.json({
            success: true,
            data: notifications,
            unread_count: unread[0].count
        });
    } catch (error) {
        console.error('Lỗi lấy thông báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm số thông báo chưa đọc
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [result] = await pool.query(
            'SELECT COUNT(*) as count FROM ThongBao WHERE user_id = ? AND da_doc = FALSE',
            [userId]
        );

        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error('Lỗi đếm thông báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu đã đọc 1 thông báo
const markAsRead = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { id } = req.params;

        await pool.query(
            'UPDATE ThongBao SET da_doc = TRUE WHERE thong_bao_id = ? AND user_id = ?',
            [id, userId]
        );

        res.json({ success: true, message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        console.error('Lỗi đánh dấu đã đọc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đánh dấu tất cả đã đọc
const markAllAsRead = async (req, res) => {
    try {
        const userId = req.user.user_id;

        await pool.query(
            'UPDATE ThongBao SET da_doc = TRUE WHERE user_id = ? AND da_doc = FALSE',
            [userId]
        );

        res.json({ success: true, message: 'Đã đánh dấu tất cả đã đọc' });
    } catch (error) {
        console.error('Lỗi đánh dấu tất cả đã đọc:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa thông báo
const deleteNotification = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { id } = req.params;

        await pool.query(
            'DELETE FROM ThongBao WHERE thong_bao_id = ? AND user_id = ?',
            [id, userId]
        );

        res.json({ success: true, message: 'Đã xóa thông báo' });
    } catch (error) {
        console.error('Lỗi xóa thông báo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ============ HELPER FUNCTIONS - Tạo thông báo ============

// Tạo thông báo chiến dịch mới cho followers
const notifyNewCampaign = async (toChucId, chienDichId, tenChienDich, tenToChuc) => {
    try {
        // Lấy danh sách người theo dõi tổ chức
        const [followers] = await pool.query(
            'SELECT user_id FROM TheoDoi WHERE to_chuc_id = ?',
            [toChucId]
        );

        if (followers.length === 0) return;

        // Tạo thông báo cho từng follower
        const values = followers.map(f => [
            f.user_id,
            `${tenToChuc} có chiến dịch mới`,
            `Chiến dịch "${tenChienDich}" vừa được đăng. Hãy xem và ủng hộ ngay!`,
            'chien_dich',
            `home.html?post=${chienDichId}`
        ]);

        await pool.query(
            `INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai, lien_ket) VALUES ?`,
            [values]
        );

        console.log(`Đã gửi thông báo chiến dịch mới cho ${followers.length} người theo dõi`);
    } catch (error) {
        console.error('Lỗi gửi thông báo chiến dịch mới:', error);
    }
};

// Tạo thông báo cập nhật chiến dịch cho người tham gia
const notifyCampaignUpdate = async (chienDichId, tieuDe, noiDung) => {
    try {
        // Lấy danh sách người tham gia chiến dịch
        const [participants] = await pool.query(
            `SELECT DISTINCT user_id FROM ThamGia WHERE chien_dich_id = ? AND trang_thai = 'duyet'`,
            [chienDichId]
        );

        // Lấy thêm người đã quyên góp
        const [donors] = await pool.query(
            `SELECT DISTINCT user_id FROM QuyenGop WHERE chien_dich_id = ? AND trang_thai = 'thanh_cong'`,
            [chienDichId]
        );

        // Gộp và loại trùng
        const userIds = [...new Set([
            ...participants.map(p => p.user_id),
            ...donors.map(d => d.user_id)
        ])];

        if (userIds.length === 0) return;

        const values = userIds.map(userId => [
            userId,
            tieuDe,
            noiDung,
            'chien_dich',
            `home.html?post=${chienDichId}`
        ]);

        await pool.query(
            `INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai, lien_ket) VALUES ?`,
            [values]
        );

        console.log(`Đã gửi thông báo cập nhật cho ${userIds.length} người`);
    } catch (error) {
        console.error('Lỗi gửi thông báo cập nhật chiến dịch:', error);
    }
};

// Thông báo chiến dịch sắp kết thúc (còn 3 ngày)
const notifyCampaignEnding = async (chienDichId, tenChienDich, ngayKetThuc) => {
    const daysLeft = Math.ceil((new Date(ngayKetThuc) - new Date()) / (1000 * 60 * 60 * 24));
    
    await notifyCampaignUpdate(
        chienDichId,
        `Chiến dịch sắp kết thúc`,
        `Chiến dịch "${tenChienDich}" chỉ còn ${daysLeft} ngày nữa. Hãy hành động ngay!`
    );
};

// Thông báo chiến dịch đạt mục tiêu
const notifyCampaignGoalReached = async (chienDichId, tenChienDich) => {
    await notifyCampaignUpdate(
        chienDichId,
        `🎉 Chiến dịch đạt mục tiêu!`,
        `Chiến dịch "${tenChienDich}" đã đạt mục tiêu quyên góp. Cảm ơn bạn đã đóng góp!`
    );
};

// Thông báo khi có người reply comment
const notifyCommentReply = async (userId, chienDichId, tenChienDich, tenNguoiReply, noiDungReply) => {
    try {
        const noiDungNgan = noiDungReply.length > 50 ? noiDungReply.substring(0, 50) + '...' : noiDungReply;
        
        await pool.query(
            `INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai, lien_ket) VALUES (?, ?, ?, ?, ?)`,
            [
                userId,
                `💬 ${tenNguoiReply} đã phản hồi bình luận của bạn`,
                `"${noiDungNgan}" - trong chiến dịch "${tenChienDich}"`,
                'ca_nhan',
                `home.html?post=${chienDichId}`
            ]
        );

        console.log(`Đã gửi thông báo reply comment cho user ${userId}`);
    } catch (error) {
        console.error('Lỗi gửi thông báo reply comment:', error);
    }
};

// Thông báo duyệt/từ chối tình nguyện viên
const notifyVolunteerStatus = async (userId, chienDichId, tenChienDich, trangThai, ghiChu) => {
    try {
        let tieuDe, noiDung, loai;
        
        if (trangThai === 'duyet') {
            tieuDe = '✅ Đăng ký tham gia được duyệt';
            noiDung = `Bạn đã được duyệt tham gia chiến dịch "${tenChienDich}". Hãy chuẩn bị và tham gia nhé!`;
            loai = 'tham_gia';
        } else if (trangThai === 'tu_choi') {
            tieuDe = '❌ Đăng ký tham gia bị từ chối';
            noiDung = `Đơn đăng ký tham gia chiến dịch "${tenChienDich}" đã bị từ chối.${ghiChu ? ' Lý do: ' + ghiChu : ''}`;
            loai = 'tham_gia';
        } else {
            return; // Không gửi thông báo cho các trạng thái khác
        }

        await pool.query(
            `INSERT INTO ThongBao (user_id, tieu_de, noi_dung, loai, lien_ket) VALUES (?, ?, ?, ?, ?)`,
            [userId, tieuDe, noiDung, loai, `hoat-dong.html#tham-gia`]
        );

        console.log(`Đã gửi thông báo ${trangThai} tình nguyện viên cho user ${userId}`);
    } catch (error) {
        console.error('Lỗi gửi thông báo tình nguyện viên:', error);
    }
};

module.exports = {
    getUserNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    // Helper functions
    notifyNewCampaign,
    notifyCampaignUpdate,
    notifyCampaignEnding,
    notifyCampaignGoalReached,
    notifyVolunteerStatus,
    notifyCommentReply
};

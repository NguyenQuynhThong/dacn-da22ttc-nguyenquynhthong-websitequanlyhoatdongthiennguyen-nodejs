// Controller xử lý các endpoint admin
const { pool } = require('../config/database');
const { notifyNewCampaign } = require('./notificationController');

// Lấy thống kê tổng quan cho admin
const getAdminStatistics = async (req, res) => {
    try {
        const [users] = await pool.query('SELECT COUNT(*) as total FROM NguoiDung');
        const [organizations] = await pool.query('SELECT COUNT(*) as total FROM ToChuc');
        const [campaigns] = await pool.query('SELECT COUNT(*) as total FROM ChienDich');
        const [donations] = await pool.query("SELECT COALESCE(SUM(so_tien), 0) as total FROM QuyenGop WHERE trang_thai = 'thanh_cong'");

        res.json({
            success: true,
            data: {
                tong_nguoi_dung: users[0].total,
                tong_to_chuc: organizations[0].total,
                tong_chien_dich: campaigns[0].total,
                tong_quyen_gop: donations[0].total || 0
            }
        });
    } catch (error) {
        console.error('Lỗi lấy thống kê admin:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách người dùng
const getAllUsers = async (req, res) => {
    try {
        const [users] = await pool.query(`
            SELECT user_id, ho_ten, email, so_dien_thoai, vai_tro, trang_thai, ngay_tao, lan_dang_nhap_cuoi
            FROM NguoiDung ORDER BY ngay_tao DESC
        `);
        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Lỗi lấy danh sách người dùng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách tổ chức
const getAllOrganizations = async (req, res) => {
    try {
        const [organizations] = await pool.query(`
            SELECT 
                tc.to_chuc_id, tc.ten_to_chuc, tc.email, tc.so_dien_thoai, tc.linh_vuc,
                tc.trang_thai, tc.ngay_tao, tc.ngay_duyet,
                COUNT(DISTINCT cd.chien_dich_id) as so_chien_dich
            FROM ToChuc tc
            LEFT JOIN ChienDich cd ON tc.to_chuc_id = cd.to_chuc_id
            GROUP BY tc.to_chuc_id
            ORDER BY tc.ngay_tao DESC
        `);
        res.json({ success: true, data: organizations });
    } catch (error) {
        console.error('Lỗi lấy danh sách tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Duyệt tổ chức
const approveOrganization = async (req, res) => {
    try {
        const { orgId } = req.params;
        const adminId = req.user.admin_id;

        await pool.query(
            "UPDATE ToChuc SET trang_thai = 'active', ngay_duyet = NOW(), duyet_boi_admin_id = ? WHERE to_chuc_id = ?",
            [adminId, orgId]
        );
        res.json({ success: true, message: 'Duyệt tổ chức thành công' });
    } catch (error) {
        console.error('Lỗi duyệt tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách chiến dịch
const getAllCampaigns = async (req, res) => {
    try {
        const [campaigns] = await pool.query(`
            SELECT 
                cd.chien_dich_id, cd.ten_chien_dich, cd.mo_ta, cd.muc_tieu_tien,
                cd.so_tien_da_quyen_gop, cd.trang_thai, cd.ngay_bat_dau, cd.ngay_ket_thuc, cd.ngay_tao,
                tc.ten_to_chuc,
                cd.so_tinh_nguyen_vien_hien_tai
            FROM ChienDich cd
            INNER JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
            ORDER BY cd.ngay_tao DESC
        `);
        res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Lỗi lấy danh sách chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Duyệt chiến dịch
const approveCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const adminId = req.user.admin_id;

        // Lấy thông tin chiến dịch và tổ chức
        const [campaign] = await pool.query(
            `SELECT cd.ten_chien_dich, cd.to_chuc_id, tc.ten_to_chuc 
             FROM ChienDich cd 
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id 
             WHERE cd.chien_dich_id = ?`,
            [campaignId]
        );

        await pool.query(
            "UPDATE ChienDich SET trang_thai = 'dang_dien_ra', ngay_duyet = NOW(), duyet_boi_admin_id = ? WHERE chien_dich_id = ?",
            [adminId, campaignId]
        );

        // Gửi thông báo cho followers của tổ chức
        if (campaign.length > 0) {
            await notifyNewCampaign(
                campaign[0].to_chuc_id,
                campaignId,
                campaign[0].ten_chien_dich,
                campaign[0].ten_to_chuc
            );
        }

        res.json({ success: true, message: 'Duyệt chiến dịch thành công' });
    } catch (error) {
        console.error('Lỗi duyệt chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Từ chối chiến dịch
const rejectCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        const { ly_do } = req.body;
        const adminId = req.user.admin_id;

        await pool.query(
            "UPDATE ChienDich SET trang_thai = 'bi_huy', ly_do_tu_choi = ?, duyet_boi_admin_id = ? WHERE chien_dich_id = ?",
            [ly_do, adminId, campaignId]
        );
        res.json({ success: true, message: 'Từ chối chiến dịch thành công' });
    } catch (error) {
        console.error('Lỗi từ chối chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách báo cáo
const getAllReports = async (req, res) => {
    try {
        const [reports] = await pool.query(`
            SELECT 
                bc.bao_cao_id, bc.tieu_de, bc.noi_dung, bc.loai_bao_cao,
                bc.tong_thu, bc.tong_chi, bc.ngay_bao_cao,
                cd.ten_chien_dich, tc.ten_to_chuc
            FROM BaoCao bc
            INNER JOIN ChienDich cd ON bc.chien_dich_id = cd.chien_dich_id
            INNER JOIN ToChuc tc ON bc.to_chuc_id = tc.to_chuc_id
            ORDER BY bc.ngay_bao_cao DESC
            LIMIT 50
        `);
        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Lỗi lấy danh sách báo cáo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật trạng thái người dùng
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { trang_thai } = req.body;

        await pool.query('UPDATE NguoiDung SET trang_thai = ? WHERE user_id = ?', [trang_thai, userId]);
        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái người dùng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật trạng thái tổ chức
const updateOrganizationStatus = async (req, res) => {
    try {
        const { orgId } = req.params;
        const { trang_thai } = req.body;

        await pool.query('UPDATE ToChuc SET trang_thai = ? WHERE to_chuc_id = ?', [trang_thai, orgId]);
        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa người dùng
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;
        await pool.query('DELETE FROM NguoiDung WHERE user_id = ?', [userId]);
        res.json({ success: true, message: 'Xóa người dùng thành công' });
    } catch (error) {
        console.error('Lỗi xóa người dùng:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa tổ chức
const deleteOrganization = async (req, res) => {
    try {
        const { orgId } = req.params;
        await pool.query('DELETE FROM ToChuc WHERE to_chuc_id = ?', [orgId]);
        res.json({ success: true, message: 'Xóa tổ chức thành công' });
    } catch (error) {
        console.error('Lỗi xóa tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa chiến dịch
const deleteCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;
        await pool.query('DELETE FROM ChienDich WHERE chien_dich_id = ?', [campaignId]);
        res.json({ success: true, message: 'Xóa chiến dịch thành công' });
    } catch (error) {
        console.error('Lỗi xóa chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getAdminStatistics,
    getAllUsers,
    getAllOrganizations,
    approveOrganization,
    getAllCampaigns,
    approveCampaign,
    rejectCampaign,
    getAllReports,
    updateUserStatus,
    updateOrganizationStatus,
    deleteUser,
    deleteOrganization,
    deleteCampaign
};

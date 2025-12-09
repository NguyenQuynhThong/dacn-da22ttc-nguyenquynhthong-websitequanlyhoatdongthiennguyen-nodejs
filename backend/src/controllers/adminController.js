// Controller xử lý các endpoint admin
const { pool } = require('../config/database');

// Lấy thống kê tổng quan cho admin
const getAdminStatistics = async (req, res) => {
    try {
        // Đếm tổng số người dùng
        const [users] = await pool.query('SELECT COUNT(*) as total FROM NguoiDung');
        
        // Đếm tổng số tổ chức
        const [organizations] = await pool.query('SELECT COUNT(*) as total FROM ToChuc');
        
        // Đếm tổng số chiến dịch
        const [campaigns] = await pool.query('SELECT COUNT(*) as total FROM ChienDich');
        
        // Tính tổng quyên góp
        const [donations] = await pool.query('SELECT SUM(so_tien) as total FROM QuyenGop');

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
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách người dùng
const getAllUsers = async (req, res) => {
    try {
        const query = `
            SELECT 
                user_id,
                ho_ten,
                email,
                vai_tro,
                trang_thai,
                ngay_tao
            FROM NguoiDung
            ORDER BY ngay_tao DESC
        `;

        const [users] = await pool.query(query);

        res.json({
            success: true,
            data: users
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách tổ chức
const getAllOrganizations = async (req, res) => {
    try {
        const query = `
            SELECT 
                tc.to_chuc_id as id,
                tc.ten_to_chuc,
                tc.mo_ta,
                tc.dia_chi,
                tc.dien_thoai,
                tc.ngay_tao,
                nd.email,
                COUNT(DISTINCT cd.chien_dich_id) as so_chien_dich,
                'hoat_dong' as trang_thai
            FROM ToChuc tc
            LEFT JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id
            LEFT JOIN ChienDich cd ON tc.to_chuc_id = cd.to_chuc_id
            GROUP BY tc.to_chuc_id
            ORDER BY tc.ngay_tao DESC
        `;

        const [organizations] = await pool.query(query);

        res.json({
            success: true,
            data: organizations
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách tổ chức:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách chiến dịch
const getAllCampaigns = async (req, res) => {
    try {
        const query = `
            SELECT 
                cd.chien_dich_id as id,
                cd.ten_chien_dich,
                cd.mo_ta,
                cd.muc_tieu_tien as muc_tieu_quyen_gop,
                cd.trang_thai,
                cd.ngay_bat_dau,
                cd.ngay_ket_thuc,
                cd.ngay_tao,
                tc.ten_to_chuc,
                COALESCE(SUM(qg.so_tien), 0) as tong_quyen_gop,
                COUNT(DISTINCT tg.user_id) as so_tinh_nguyen_vien
            FROM ChienDich cd
            INNER JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
            LEFT JOIN QuyenGop qg ON cd.chien_dich_id = qg.chien_dich_id
            LEFT JOIN ThamGia tg ON cd.chien_dich_id = tg.chien_dich_id AND tg.trang_thai = 'duyet'
            GROUP BY cd.chien_dich_id
            ORDER BY cd.ngay_tao DESC
        `;

        const [campaigns] = await pool.query(query);

        res.json({
            success: true,
            data: campaigns
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách chiến dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách báo cáo
const getAllReports = async (req, res) => {
    try {
        const query = `
            SELECT 
                bc.bao_cao_id as id,
                bc.tieu_de,
                bc.noi_dung,
                bc.trang_thai,
                bc.ngay_tao,
                nd.ho_ten as ten_nguoi_bao_cao
            FROM BaoCao bc
            LEFT JOIN NguoiDung nd ON bc.nguoi_bao_cao_id = nd.user_id
            ORDER BY bc.ngay_tao DESC
            LIMIT 50
        `;

        const [reports] = await pool.query(query);

        res.json({
            success: true,
            data: reports
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách báo cáo:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Cập nhật trạng thái người dùng
const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const { trang_thai } = req.body;

        await pool.query(
            'UPDATE NguoiDung SET trang_thai = ? WHERE user_id = ?',
            [trang_thai, userId]
        );

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        });

    } catch (error) {
        console.error('Lỗi cập nhật trạng thái người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Xóa người dùng
const deleteUser = async (req, res) => {
    try {
        const { userId } = req.params;

        await pool.query('DELETE FROM NguoiDung WHERE user_id = ?', [userId]);

        res.json({
            success: true,
            message: 'Xóa người dùng thành công'
        });

    } catch (error) {
        console.error('Lỗi xóa người dùng:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Xóa tổ chức
const deleteOrganization = async (req, res) => {
    try {
        const { orgId } = req.params;

        await pool.query('DELETE FROM ToChuc WHERE to_chuc_id = ?', [orgId]);

        res.json({
            success: true,
            message: 'Xóa tổ chức thành công'
        });

    } catch (error) {
        console.error('Lỗi xóa tổ chức:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Xóa chiến dịch
const deleteCampaign = async (req, res) => {
    try {
        const { campaignId } = req.params;

        await pool.query('DELETE FROM ChienDich WHERE chien_dich_id = ?', [campaignId]);

        res.json({
            success: true,
            message: 'Xóa chiến dịch thành công'
        });

    } catch (error) {
        console.error('Lỗi xóa chiến dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Cập nhật trạng thái báo cáo
const updateReportStatus = async (req, res) => {
    try {
        const { reportId } = req.params;
        const { trang_thai } = req.body;

        await pool.query(
            'UPDATE BaoCao SET trang_thai = ? WHERE bao_cao_id = ?',
            [trang_thai, reportId]
        );

        res.json({
            success: true,
            message: 'Cập nhật báo cáo thành công'
        });

    } catch (error) {
        console.error('Lỗi cập nhật báo cáo:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

module.exports = {
    getAdminStatistics,
    getAllUsers,
    getAllOrganizations,
    getAllCampaigns,
    getAllReports,
    updateUserStatus,
    deleteUser,
    deleteOrganization,
    deleteCampaign,
    updateReportStatus
};

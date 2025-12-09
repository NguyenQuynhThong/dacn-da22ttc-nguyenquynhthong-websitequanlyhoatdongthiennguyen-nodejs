// Controller xử lý các endpoint tổ chức
const { pool } = require('../config/database');

// Lấy thông tin tổ chức của user hiện tại
const getOrganizationInfo = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const query = `
            SELECT 
                tc.*,
                nd.email,
                nd.ho_ten
            FROM ToChuc tc
            INNER JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id
            WHERE nd.user_id = ?
        `;

        const [organizations] = await pool.query(query, [userId]);

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin tổ chức'
            });
        }

        res.json({
            success: true,
            data: organizations[0]
        });

    } catch (error) {
        console.error('Lỗi lấy thông tin tổ chức:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy thống kê của tổ chức
const getOrganizationStatistics = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy to_chuc_id từ user
        const [org] = await pool.query(
            'SELECT to_chuc_id FROM ToChuc WHERE dai_dien_id = ?',
            [userId]
        );

        if (org.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        const toChucId = org[0].to_chuc_id;

        // Đếm số chiến dịch
        const [campaigns] = await pool.query(
            'SELECT COUNT(*) as total FROM ChienDich WHERE to_chuc_id = ?',
            [toChucId]
        );

        // Đếm số chiến dịch đang diễn ra
        const [activeCampaigns] = await pool.query(
            "SELECT COUNT(*) as total FROM ChienDich WHERE to_chuc_id = ? AND trang_thai = 'dang_dien_ra'",
            [toChucId]
        );

        // Đếm tổng tình nguyện viên (unique)
        const [volunteers] = await pool.query(
            `SELECT COUNT(DISTINCT tg.user_id) as total 
             FROM ThamGia tg
             INNER JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
             WHERE cd.to_chuc_id = ? AND tg.trang_thai = 'duyet'`,
            [toChucId]
        );

        // Tính tổng quyên góp
        const [donations] = await pool.query(
            `SELECT SUM(qg.so_tien) as total 
             FROM QuyenGop qg
             INNER JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
             WHERE cd.to_chuc_id = ?`,
            [toChucId]
        );

        res.json({
            success: true,
            data: {
                tong_chien_dich: campaigns[0].total,
                chien_dich_dang_quan_ly: activeCampaigns[0].total,
                tong_tinh_nguyen_vien: volunteers[0].total,
                tong_quyen_gop: donations[0].total || 0
            }
        });

    } catch (error) {
        console.error('Lỗi lấy thống kê tổ chức:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách chiến dịch của tổ chức
const getOrganizationCampaigns = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy to_chuc_id từ user
        const [org] = await pool.query(
            'SELECT to_chuc_id FROM ToChuc WHERE dai_dien_id = ?',
            [userId]
        );

        if (org.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        const toChucId = org[0].to_chuc_id;

        const query = `
            SELECT 
                cd.chien_dich_id as id,
                cd.ten_chien_dich,
                cd.mo_ta,
                cd.muc_tieu_tien,
                cd.trang_thai,
                cd.ngay_bat_dau,
                cd.ngay_ket_thuc,
                cd.ngay_tao,
                COALESCE(SUM(qg.so_tien), 0) as da_quyen_gop,
                COUNT(DISTINCT tg.user_id) as so_tinh_nguyen_vien
            FROM ChienDich cd
            LEFT JOIN QuyenGop qg ON cd.chien_dich_id = qg.chien_dich_id
            LEFT JOIN ThamGia tg ON cd.chien_dich_id = tg.chien_dich_id AND tg.trang_thai = 'duyet'
            WHERE cd.to_chuc_id = ?
            GROUP BY cd.chien_dich_id
            ORDER BY cd.ngay_tao DESC
        `;

        const [campaigns] = await pool.query(query, [toChucId]);

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

// Lấy danh sách tình nguyện viên
const getOrganizationVolunteers = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy to_chuc_id từ user
        const [org] = await pool.query(
            'SELECT to_chuc_id FROM ToChuc WHERE dai_dien_id = ?',
            [userId]
        );

        if (org.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        const toChucId = org[0].to_chuc_id;

        const query = `
            SELECT 
                tg.tham_gia_id as id,
                nd.ho_ten as ten_tinh_nguyen_vien,
                nd.email,
                cd.ten_chien_dich,
                tg.trang_thai,
                tg.ngay_tham_gia,
                tg.ghi_chu
            FROM ThamGia tg
            INNER JOIN NguoiDung nd ON tg.user_id = nd.user_id
            INNER JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
            ORDER BY tg.ngay_tham_gia DESC
            LIMIT 100
        `;

        const [volunteers] = await pool.query(query, [toChucId]);

        res.json({
            success: true,
            data: volunteers
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách tình nguyện viên:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách quyên góp
const getOrganizationDonations = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy to_chuc_id từ user
        const [org] = await pool.query(
            'SELECT to_chuc_id FROM ToChuc WHERE dai_dien_id = ?',
            [userId]
        );

        if (org.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        const toChucId = org[0].to_chuc_id;

        const query = `
            SELECT 
                qg.quyen_gop_id as id,
                nd.ho_ten as ten_nguoi_quyen_gop,
                cd.ten_chien_dich,
                qg.so_tien,
                qg.ngay_quyen_gop,
                qg.phuong_thuc
            FROM QuyenGop qg
            INNER JOIN NguoiDung nd ON qg.user_id = nd.user_id
            INNER JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
            ORDER BY qg.ngay_quyen_gop DESC
            LIMIT 100
        `;

        const [donations] = await pool.query(query, [toChucId]);

        res.json({
            success: true,
            data: donations
        });

    } catch (error) {
        console.error('Lỗi lấy danh sách quyên góp:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Tạo chiến dịch mới
const createCampaign = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const {
            ten_chien_dich,
            mo_ta,
            muc_tieu_tien,
            ngay_bat_dau,
            ngay_ket_thuc
        } = req.body;

        // Lấy to_chuc_id từ user
        const [org] = await pool.query(
            'SELECT to_chuc_id FROM ToChuc WHERE dai_dien_id = ?',
            [userId]
        );

        if (org.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        const toChucId = org[0].to_chuc_id;

        const query = `
            INSERT INTO ChienDich (
                to_chuc_id,
                ten_chien_dich,
                mo_ta,
                muc_tieu_tien,
                ngay_bat_dau,
                ngay_ket_thuc,
                trang_thai
            ) VALUES (?, ?, ?, ?, ?, ?, 'cho_duyet')
        `;

        const [result] = await pool.query(query, [
            toChucId,
            ten_chien_dich,
            mo_ta,
            muc_tieu_tien,
            ngay_bat_dau,
            ngay_ket_thuc
        ]);

        res.json({
            success: true,
            message: 'Tạo chiến dịch thành công',
            data: {
                chien_dich_id: result.insertId
            }
        });

    } catch (error) {
        console.error('Lỗi tạo chiến dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Duyệt/từ chối tình nguyện viên
const updateVolunteerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai } = req.body;

        await pool.query(
            'UPDATE ThamGia SET trang_thai = ? WHERE tham_gia_id = ?',
            [trang_thai, id]
        );

        res.json({
            success: true,
            message: 'Cập nhật trạng thái thành công'
        });

    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tình nguyện viên:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

module.exports = {
    getOrganizationInfo,
    getOrganizationStatistics,
    getOrganizationCampaigns,
    getOrganizationVolunteers,
    getOrganizationDonations,
    createCampaign,
    updateVolunteerStatus
};

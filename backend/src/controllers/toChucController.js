// Controller xử lý Tổ chức (Public)
const { pool } = require('../config/database');

// Lấy danh sách tổ chức
const getToChucList = async (req, res) => {
    try {
        const { page = 1, limit = 12, linh_vuc, search } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE trang_thai = 'active'";
        const params = [];

        if (linh_vuc) {
            whereClause += " AND linh_vuc = ?";
            params.push(linh_vuc);
        }

        if (search) {
            whereClause += " AND (ten_to_chuc LIKE ? OR mo_ta LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        // Đếm tổng
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM ToChuc ${whereClause}`, params
        );

        // Lấy danh sách với số chiến dịch
        const [orgs] = await pool.query(
            `SELECT tc.*, 
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id AND trang_thai = 'dang_dien_ra') as so_chien_dich_dang_chay,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id) as tong_chien_dich,
                (SELECT COALESCE(SUM(cd.so_tien_da_quyen_gop), 0) FROM ChienDich cd WHERE cd.to_chuc_id = tc.to_chuc_id) as tong_quyen_gop
             FROM ToChuc tc
             ${whereClause}
             ORDER BY tc.ngay_tao DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        res.json({
            success: true,
            data: orgs,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi lấy danh sách tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Lấy chi tiết tổ chức
const getToChucById = async (req, res) => {
    try {
        const { id } = req.params;

        const [orgs] = await pool.query(
            `SELECT tc.*,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id) as tong_chien_dich,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id AND trang_thai = 'dang_dien_ra') as chien_dich_dang_chay,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id AND trang_thai = 'ket_thuc') as chien_dich_hoan_thanh,
                (SELECT COALESCE(SUM(cd.so_tien_da_quyen_gop), 0) FROM ChienDich cd WHERE cd.to_chuc_id = tc.to_chuc_id) as tong_quyen_gop,
                (SELECT COUNT(DISTINCT tg.user_id) FROM ThamGia tg JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id WHERE cd.to_chuc_id = tc.to_chuc_id AND tg.trang_thai = 'duyet') as tong_tinh_nguyen_vien
             FROM ToChuc tc
             WHERE tc.to_chuc_id = ? AND tc.trang_thai = 'active'`,
            [id]
        );

        if (orgs.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tổ chức' });
        }

        res.json({ success: true, data: orgs[0] });
    } catch (error) {
        console.error('Lỗi lấy chi tiết tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách chiến dịch của tổ chức
const getToChucCampaigns = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 6, trang_thai } = req.query;
        const offset = (page - 1) * limit;

        let whereClause = "WHERE cd.to_chuc_id = ?";
        const params = [id];

        if (trang_thai) {
            whereClause += " AND cd.trang_thai = ?";
            params.push(trang_thai);
        } else {
            whereClause += " AND cd.trang_thai IN ('dang_dien_ra', 'ket_thuc')";
        }

        const [campaigns] = await pool.query(
            `SELECT cd.* FROM ChienDich cd
             ${whereClause}
             ORDER BY cd.ngay_tao DESC
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
        );

        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM ChienDich cd ${whereClause}`,
            params
        );

        res.json({
            success: true,
            data: campaigns,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: countResult[0].total,
                totalPages: Math.ceil(countResult[0].total / limit)
            }
        });
    } catch (error) {
        console.error('Lỗi lấy chiến dịch của tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getToChucList,
    getToChucById,
    getToChucCampaigns
};

// Controller xử lý các endpoint công khai (không cần đăng nhập)
const { pool } = require('../config/database');

// Lấy thống kê tổng quan
const getStatistics = async (req, res) => {
    try {
        // Đếm tổng số chiến dịch
        const [campaigns] = await pool.query('SELECT COUNT(*) as total FROM ChienDich');

        // Đếm tổng số tổ chức
        const [organizations] = await pool.query('SELECT COUNT(*) as total FROM ToChuc');

        // Đếm tổng số tình nguyện viên
        const [volunteers] = await pool.query(
            "SELECT COUNT(*) as total FROM NguoiDung WHERE vai_tro = 'tinh_nguyen_vien'"
        );

        // Tính tổng quyên góp
        const [donations] = await pool.query('SELECT SUM(so_tien) as total FROM QuyenGop');

        res.json({
            success: true,
            data: {
                total_campaigns: campaigns[0].total,
                total_organizations: organizations[0].total,
                total_volunteers: volunteers[0].total,
                total_donations: donations[0].total || 0
            }
        });

    } catch (error) {
        console.error('Lỗi lấy thống kê:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy danh sách chiến dịch
const getCampaigns = async (req, res) => {
    try {
        const { limit = 6, trang_thai, to_chuc_id } = req.query;

        let query = `
            SELECT 
                cd.chien_dich_id,
                cd.ten_chien_dich as tieu_de,
                cd.mo_ta,
                cd.ngay_bat_dau,
                cd.ngay_ket_thuc,
                cd.muc_tieu_tien,
                cd.trang_thai,
                cd.ngay_tao,
                tc.ten_to_chuc,
                tc.to_chuc_id,
                COALESCE(SUM(qg.so_tien), 0) as da_quyen_gop,
                COUNT(DISTINCT tg.user_id) as so_tinh_nguyen_vien
            FROM ChienDich cd
            INNER JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
            LEFT JOIN QuyenGop qg ON cd.chien_dich_id = qg.chien_dich_id
            LEFT JOIN ThamGia tg ON cd.chien_dich_id = tg.chien_dich_id AND tg.trang_thai = 'duyet'
        `;

        const params = [];
        const conditions = [];

        if (trang_thai) {
            conditions.push('cd.trang_thai = ?');
            params.push(trang_thai);
        }

        if (to_chuc_id) {
            conditions.push('cd.to_chuc_id = ?');
            params.push(to_chuc_id);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' GROUP BY cd.chien_dich_id, cd.ten_chien_dich, cd.mo_ta, cd.ngay_bat_dau, cd.ngay_ket_thuc, cd.muc_tieu_tien, cd.trang_thai, cd.ngay_tao, tc.ten_to_chuc, tc.to_chuc_id';
        query += ' ORDER BY cd.ngay_tao DESC';
        query += ' LIMIT ?';
        params.push(parseInt(limit));

        const [campaigns] = await pool.query(query, params);

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

// Lấy danh sách tổ chức
const getOrganizations = async (req, res) => {
    try {
        const { limit = 10 } = req.query;

        const query = `
            SELECT 
                tc.to_chuc_id,
                tc.ten_to_chuc,
                tc.mo_ta,
                tc.dia_chi,
                tc.dien_thoai,
                tc.ngay_tao,
                nd.ho_ten as dai_dien_name,
                nd.email as dai_dien_email,
                COUNT(DISTINCT cd.chien_dich_id) as so_chien_dich
            FROM ToChuc tc
            LEFT JOIN NguoiDung nd ON tc.dai_dien_id = nd.user_id
            LEFT JOIN ChienDich cd ON tc.to_chuc_id = cd.to_chuc_id
            GROUP BY tc.to_chuc_id, tc.ten_to_chuc, tc.mo_ta, tc.dia_chi, tc.dien_thoai, tc.ngay_tao, nd.ho_ten, nd.email
            ORDER BY tc.ngay_tao DESC
            LIMIT ?
        `;

        const [organizations] = await pool.query(query, [parseInt(limit)]);

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

// Lấy chi tiết chiến dịch
const getCampaignDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                cd.*,
                tc.ten_to_chuc,
                tc.mo_ta as to_chuc_mo_ta,
                tc.dia_chi as to_chuc_dia_chi,
                tc.dien_thoai as to_chuc_dien_thoai,
                COALESCE(SUM(qg.so_tien), 0) as da_quyen_gop,
                COUNT(DISTINCT tg.user_id) as so_tinh_nguyen_vien,
                COUNT(DISTINCT qg.user_id) as so_nha_hao_tam
            FROM ChienDich cd
            INNER JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
            LEFT JOIN QuyenGop qg ON cd.chien_dich_id = qg.chien_dich_id
            LEFT JOIN ThamGia tg ON cd.chien_dich_id = tg.chien_dich_id AND tg.trang_thai = 'duyet'
            WHERE cd.chien_dich_id = ?
            GROUP BY cd.chien_dich_id
        `;

        const [campaigns] = await pool.query(query, [id]);

        if (campaigns.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy chiến dịch'
            });
        }

        res.json({
            success: true,
            data: campaigns[0]
        });

    } catch (error) {
        console.error('Lỗi lấy chi tiết chiến dịch:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

// Lấy chi tiết tổ chức
const getOrganizationDetail = async (req, res) => {
    try {
        const { id } = req.params;

        const query = `
            SELECT 
                tc.to_chuc_id,
                tc.ten_to_chuc as ho_ten,
                tc.mo_ta,
                tc.dia_chi,
                tc.so_dien_thoai,
                tc.email,
                tc.logo,
                tc.website,
                tc.ngay_tao,
                COUNT(DISTINCT cd.chien_dich_id) as so_chien_dich,
                COUNT(DISTINCT tg.user_id) as so_tinh_nguyen_vien,
                COALESCE(SUM(qg.so_tien), 0) as tong_quyen_gop
            FROM ToChuc tc
            LEFT JOIN ChienDich cd ON tc.to_chuc_id = cd.to_chuc_id
            LEFT JOIN ThamGia tg ON cd.chien_dich_id = tg.chien_dich_id AND tg.trang_thai = 'duyet'
            LEFT JOIN QuyenGop qg ON cd.chien_dich_id = qg.chien_dich_id
            WHERE tc.to_chuc_id = ?
            GROUP BY tc.to_chuc_id, tc.ten_to_chuc, tc.mo_ta, tc.dia_chi, tc.so_dien_thoai, tc.email, tc.logo, tc.website, tc.ngay_tao
        `;

        const [organizations] = await pool.query(query, [id]);

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy tổ chức'
            });
        }

        res.json({
            success: true,
            data: organizations[0]
        });

    } catch (error) {
        console.error('Lỗi lấy chi tiết tổ chức:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi server',
            error: error.message
        });
    }
};

module.exports = {
    getStatistics,
    getCampaigns,
    getOrganizations,
    getCampaignDetail,
    getOrganizationDetail
};

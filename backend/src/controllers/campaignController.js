// Controller xử lý Chiến dịch
const { pool } = require('../config/database');

// Lấy danh sách chiến dịch (public)
const getCampaigns = async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 10, 
            trang_thai, 
            linh_vuc,
            search,
            sort = 'newest'
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = "WHERE cd.trang_thai = 'dang_dien_ra'";
        const params = [];

        if (trang_thai) {
            whereClause = "WHERE cd.trang_thai = ?";
            params.push(trang_thai);
        }

        if (linh_vuc) {
            whereClause += " AND tc.linh_vuc = ?";
            params.push(linh_vuc);
        }

        if (search) {
            whereClause += " AND (cd.ten_chien_dich LIKE ? OR cd.mo_ta LIKE ?)";
            params.push(`%${search}%`, `%${search}%`);
        }

        let orderBy = "ORDER BY cd.ngay_tao DESC";
        if (sort === 'oldest') orderBy = "ORDER BY cd.ngay_tao ASC";
        if (sort === 'ending_soon') orderBy = "ORDER BY cd.ngay_ket_thuc ASC";
        if (sort === 'most_funded') orderBy = "ORDER BY cd.so_tien_da_quyen_gop DESC";

        // Đếm tổng số
        const [countResult] = await pool.query(
            `SELECT COUNT(*) as total FROM ChienDich cd 
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id ${whereClause}`,
            params
        );

        // Lấy danh sách với số like, comment, share
        const [campaigns] = await pool.query(
            `SELECT cd.*, tc.ten_to_chuc, tc.logo_url as to_chuc_logo, tc.linh_vuc,
                (SELECT COUNT(*) FROM LuotThich WHERE chien_dich_id = cd.chien_dich_id) as like_count,
                (SELECT COUNT(*) FROM BinhLuan WHERE chien_dich_id = cd.chien_dich_id AND trang_thai = 'hien_thi') as comment_count,
                (SELECT COUNT(*) FROM ChiaSe WHERE chien_dich_id = cd.chien_dich_id) as share_count
             FROM ChienDich cd
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
             ${whereClause}
             ${orderBy}
             LIMIT ? OFFSET ?`,
            [...params, parseInt(limit), parseInt(offset)]
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
        console.error('Lỗi lấy danh sách chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Lấy chi tiết chiến dịch
const getCampaignById = async (req, res) => {
    try {
        const { id } = req.params;

        const [campaigns] = await pool.query(
            `SELECT cd.*, tc.ten_to_chuc, tc.logo_url as to_chuc_logo, tc.linh_vuc, 
                    tc.mo_ta as to_chuc_mo_ta, tc.dia_chi as to_chuc_dia_chi
             FROM ChienDich cd
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
             WHERE cd.chien_dich_id = ?`,
            [id]
        );

        if (campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy chiến dịch' });
        }

        // Lấy số người tham gia
        const [participants] = await pool.query(
            `SELECT COUNT(*) as total FROM ThamGia WHERE chien_dich_id = ? AND trang_thai = 'duyet'`,
            [id]
        );

        // Lấy số người quyên góp
        const [donors] = await pool.query(
            `SELECT COUNT(DISTINCT user_id) as total FROM QuyenGop WHERE chien_dich_id = ? AND trang_thai = 'thanh_cong'`,
            [id]
        );

        const campaign = campaigns[0];
        campaign.so_nguoi_tham_gia = participants[0].total;
        campaign.so_nguoi_quyen_gop = donors[0].total;

        res.json({ success: true, data: campaign });
    } catch (error) {
        console.error('Lỗi lấy chi tiết chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đăng ký tham gia chiến dịch
const joinCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const { ly_do_tham_gia, ky_nang } = req.body;

        // Kiểm tra chiến dịch
        const [campaigns] = await pool.query(
            `SELECT * FROM ChienDich WHERE chien_dich_id = ? AND trang_thai = 'dang_dien_ra'`,
            [id]
        );

        if (campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại hoặc đã kết thúc' });
        }

        // Kiểm tra đã đăng ký chưa
        const [existing] = await pool.query(
            `SELECT * FROM ThamGia WHERE chien_dich_id = ? AND user_id = ?`,
            [id, userId]
        );

        if (existing.length > 0) {
            return res.status(409).json({ success: false, message: 'Bạn đã đăng ký tham gia chiến dịch này' });
        }

        // Thêm đăng ký
        await pool.query(
            `INSERT INTO ThamGia (chien_dich_id, user_id, ly_do_tham_gia, ky_nang) VALUES (?, ?, ?, ?)`,
            [id, userId, ly_do_tham_gia, ky_nang]
        );

        res.status(201).json({ success: true, message: 'Đăng ký tham gia thành công. Vui lòng chờ phê duyệt.' });
    } catch (error) {
        console.error('Lỗi đăng ký tham gia:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Quyên góp cho chiến dịch
const donateCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const { so_tien, phuong_thuc, ghi_chu, an_danh } = req.body;

        if (!so_tien || so_tien <= 0) {
            return res.status(400).json({ success: false, message: 'Số tiền không hợp lệ' });
        }

        // Kiểm tra chiến dịch
        const [campaigns] = await pool.query(
            `SELECT * FROM ChienDich WHERE chien_dich_id = ? AND trang_thai = 'dang_dien_ra'`,
            [id]
        );

        if (campaigns.length === 0) {
            return res.status(404).json({ success: false, message: 'Chiến dịch không tồn tại hoặc đã kết thúc' });
        }

        // Tạo mã giao dịch
        const maGiaoDich = 'QG' + Date.now() + Math.random().toString(36).substr(2, 9).toUpperCase();

        // Thêm quyên góp
        const [result] = await pool.query(
            `INSERT INTO QuyenGop (user_id, chien_dich_id, so_tien, phuong_thuc, ma_giao_dich, ghi_chu, an_danh) 
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [userId, id, so_tien, phuong_thuc || 'chuyen_khoan', maGiaoDich, ghi_chu, an_danh || false]
        );

        res.status(201).json({ 
            success: true, 
            message: 'Quyên góp thành công. Cảm ơn bạn!',
            data: { quyen_gop_id: result.insertId, ma_giao_dich: maGiaoDich }
        });
    } catch (error) {
        console.error('Lỗi quyên góp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách quyên góp của chiến dịch
const getCampaignDonations = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [donations] = await pool.query(
            `SELECT qg.quyen_gop_id, qg.so_tien, qg.ngay_gop, qg.an_danh, qg.ghi_chu,
                    CASE WHEN qg.an_danh = 1 THEN 'Ẩn danh' ELSE nd.ho_ten END as nguoi_gop,
                    CASE WHEN qg.an_danh = 1 THEN NULL ELSE nd.avatar_url END as avatar_url
             FROM QuyenGop qg
             JOIN NguoiDung nd ON qg.user_id = nd.user_id
             WHERE qg.chien_dich_id = ? AND qg.trang_thai = 'thanh_cong'
             ORDER BY qg.ngay_gop DESC
             LIMIT ? OFFSET ?`,
            [id, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, data: donations });
    } catch (error) {
        console.error('Lỗi lấy danh sách quyên góp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách tình nguyện viên của chiến dịch
const getCampaignVolunteers = async (req, res) => {
    try {
        const { id } = req.params;

        const [volunteers] = await pool.query(
            `SELECT tg.tham_gia_id, tg.trang_thai, tg.ngay_dang_ky,
                    nd.ho_ten, nd.avatar_url
             FROM ThamGia tg
             JOIN NguoiDung nd ON tg.user_id = nd.user_id
             WHERE tg.chien_dich_id = ? AND tg.trang_thai = 'duyet'
             ORDER BY tg.ngay_dang_ky DESC`,
            [id]
        );

        res.json({ success: true, data: volunteers });
    } catch (error) {
        console.error('Lỗi lấy danh sách tình nguyện viên:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Kiểm tra trạng thái tham gia của user
const checkParticipation = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const [participation] = await pool.query(
            `SELECT * FROM ThamGia WHERE chien_dich_id = ? AND user_id = ?`,
            [id, userId]
        );

        res.json({ 
            success: true, 
            data: participation.length > 0 ? participation[0] : null 
        });
    } catch (error) {
        console.error('Lỗi kiểm tra tham gia:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getCampaigns,
    getCampaignById,
    joinCampaign,
    donateCampaign,
    getCampaignDonations,
    getCampaignVolunteers,
    checkParticipation
};

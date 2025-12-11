// Controller xử lý các endpoint tổ chức
const { pool } = require('../config/database');

// Lấy thông tin tổ chức từ token (to_chuc_id trong JWT)
const getOrganizationInfo = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [organizations] = await pool.query(
            'SELECT * FROM ToChuc WHERE to_chuc_id = ?',
            [toChucId]
        );

        if (organizations.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Không tìm thấy thông tin tổ chức'
            });
        }

        res.json({ success: true, data: organizations[0] });
    } catch (error) {
        console.error('Lỗi lấy thông tin tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy thống kê của tổ chức
const getOrganizationStatistics = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

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
            `SELECT COALESCE(SUM(qg.so_tien), 0) as total 
             FROM QuyenGop qg
             INNER JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
             WHERE cd.to_chuc_id = ? AND qg.trang_thai = 'thanh_cong'`,
            [toChucId]
        );

        res.json({
            success: true,
            data: {
                tong_chien_dich: campaigns[0].total,
                chien_dich_dang_dien_ra: activeCampaigns[0].total,
                tong_tinh_nguyen_vien: volunteers[0].total,
                tong_quyen_gop: donations[0].total || 0
            }
        });
    } catch (error) {
        console.error('Lỗi lấy thống kê tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách chiến dịch của tổ chức
const getOrganizationCampaigns = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        console.log('getOrganizationCampaigns - toChucId:', toChucId, 'user:', req.user);

        if (!toChucId) {
            return res.status(400).json({
                success: false,
                message: 'Không tìm thấy to_chuc_id trong token'
            });
        }

        const [campaigns] = await pool.query(
            `SELECT 
                cd.chien_dich_id, cd.ten_chien_dich, cd.mo_ta, cd.noi_dung_chi_tiet,
                cd.muc_tieu_tien, cd.so_tien_da_quyen_gop, cd.trang_thai, 
                cd.ngay_bat_dau, cd.ngay_ket_thuc, cd.dia_diem,
                cd.so_tinh_nguyen_vien_hien_tai, cd.muc_tieu_tinh_nguyen_vien, 
                cd.muc_tieu_hien_vat, cd.ngay_tao
            FROM ChienDich cd
            WHERE cd.to_chuc_id = ?
            ORDER BY cd.ngay_tao DESC`,
            [toChucId]
        );

        res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Lỗi lấy danh sách chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách tình nguyện viên
const getOrganizationVolunteers = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [volunteers] = await pool.query(
            `SELECT 
                tg.tham_gia_id, tg.ly_do_tham_gia, tg.ky_nang, tg.trang_thai,
                tg.ngay_dang_ky, tg.ghi_chu,
                nd.user_id, nd.ho_ten, nd.email, nd.so_dien_thoai,
                cd.chien_dich_id, cd.ten_chien_dich
            FROM ThamGia tg
            INNER JOIN NguoiDung nd ON tg.user_id = nd.user_id
            INNER JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
            ORDER BY tg.ngay_dang_ky DESC
            LIMIT 100`,
            [toChucId]
        );

        res.json({ success: true, data: volunteers });
    } catch (error) {
        console.error('Lỗi lấy danh sách tình nguyện viên:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách quyên góp
const getOrganizationDonations = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [donations] = await pool.query(
            `SELECT 
                qg.quyen_gop_id, qg.so_tien, qg.phuong_thuc, qg.trang_thai,
                qg.ngay_gop, qg.an_danh,
                nd.ho_ten as ten_nguoi_quyen_gop, nd.email,
                cd.chien_dich_id, cd.ten_chien_dich
            FROM QuyenGop qg
            INNER JOIN NguoiDung nd ON qg.user_id = nd.user_id
            INNER JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
            ORDER BY qg.ngay_gop DESC
            LIMIT 100`,
            [toChucId]
        );

        res.json({ success: true, data: donations });
    } catch (error) {
        console.error('Lỗi lấy danh sách quyên góp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Tạo chiến dịch mới
const createCampaign = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const {
            ten_chien_dich,
            mo_ta,
            noi_dung_chi_tiet,
            muc_tieu_tien,
            muc_tieu_tinh_nguyen_vien,
            muc_tieu_hien_vat,
            ngay_bat_dau,
            ngay_ket_thuc,
            dia_diem
        } = req.body;

        const [result] = await pool.query(
            `INSERT INTO ChienDich (
                to_chuc_id, ten_chien_dich, mo_ta, noi_dung_chi_tiet,
                muc_tieu_tien, muc_tieu_tinh_nguyen_vien, muc_tieu_hien_vat,
                ngay_bat_dau, ngay_ket_thuc, dia_diem, trang_thai
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'cho_duyet')`,
            [
                toChucId, ten_chien_dich, mo_ta, noi_dung_chi_tiet,
                muc_tieu_tien || 0, muc_tieu_tinh_nguyen_vien || 0, muc_tieu_hien_vat,
                ngay_bat_dau, ngay_ket_thuc, dia_diem
            ]
        );

        res.json({
            success: true,
            message: 'Tạo chiến dịch thành công. Đang chờ Admin phê duyệt.',
            data: { chien_dich_id: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi tạo chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật chiến dịch
const updateCampaign = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { campaignId } = req.params;
        const {
            ten_chien_dich,
            mo_ta,
            noi_dung_chi_tiet,
            muc_tieu_tien,
            muc_tieu_tinh_nguyen_vien,
            muc_tieu_hien_vat,
            ngay_bat_dau,
            ngay_ket_thuc,
            dia_diem
        } = req.body;

        // Kiểm tra quyền sở hữu
        const [campaign] = await pool.query(
            'SELECT to_chuc_id FROM ChienDich WHERE chien_dich_id = ?',
            [campaignId]
        );

        if (campaign.length === 0 || campaign[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa chiến dịch này'
            });
        }

        await pool.query(
            `UPDATE ChienDich SET 
                ten_chien_dich = ?, mo_ta = ?, noi_dung_chi_tiet = ?,
                muc_tieu_tien = ?, muc_tieu_tinh_nguyen_vien = ?, muc_tieu_hien_vat = ?,
                ngay_bat_dau = ?, ngay_ket_thuc = ?, dia_diem = ?
            WHERE chien_dich_id = ?`,
            [
                ten_chien_dich, mo_ta, noi_dung_chi_tiet,
                muc_tieu_tien, muc_tieu_tinh_nguyen_vien, muc_tieu_hien_vat,
                ngay_bat_dau, ngay_ket_thuc, dia_diem, campaignId
            ]
        );

        res.json({ success: true, message: 'Cập nhật chiến dịch thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Duyệt/từ chối tình nguyện viên
const updateVolunteerStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { trang_thai, ghi_chu } = req.body;

        // Lấy thông tin tham gia để biết chiến dịch và trạng thái cũ
        const [thamGia] = await pool.query(
            'SELECT chien_dich_id, trang_thai as trang_thai_cu FROM ThamGia WHERE tham_gia_id = ?',
            [id]
        );

        if (thamGia.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký' });
        }

        const { chien_dich_id, trang_thai_cu } = thamGia[0];

        // Cập nhật trạng thái
        await pool.query(
            'UPDATE ThamGia SET trang_thai = ?, ghi_chu = ?, ngay_duyet = NOW() WHERE tham_gia_id = ?',
            [trang_thai, ghi_chu || null, id]
        );

        // Cập nhật số tình nguyện viên hiện tại trong chiến dịch
        // Nếu duyệt (từ chờ duyệt -> đã duyệt): tăng số TNV
        // Nếu từ chối hoặc hủy (từ đã duyệt -> khác): giảm số TNV
        if (trang_thai === 'duyet' && trang_thai_cu !== 'duyet') {
            await pool.query(
                'UPDATE ChienDich SET so_tinh_nguyen_vien_hien_tai = so_tinh_nguyen_vien_hien_tai + 1 WHERE chien_dich_id = ?',
                [chien_dich_id]
            );
        } else if (trang_thai !== 'duyet' && trang_thai_cu === 'duyet') {
            await pool.query(
                'UPDATE ChienDich SET so_tinh_nguyen_vien_hien_tai = GREATEST(0, so_tinh_nguyen_vien_hien_tai - 1) WHERE chien_dich_id = ?',
                [chien_dich_id]
            );
        }

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tình nguyện viên:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Tạo báo cáo chiến dịch
const createReport = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { chien_dich_id, tieu_de, noi_dung, loai_bao_cao, tong_thu, tong_chi } = req.body;

        // Kiểm tra quyền sở hữu chiến dịch
        const [campaign] = await pool.query(
            'SELECT to_chuc_id FROM ChienDich WHERE chien_dich_id = ?',
            [chien_dich_id]
        );

        if (campaign.length === 0 || campaign[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền tạo báo cáo cho chiến dịch này'
            });
        }

        const [result] = await pool.query(
            `INSERT INTO BaoCao (chien_dich_id, to_chuc_id, tieu_de, noi_dung, loai_bao_cao, tong_thu, tong_chi)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [chien_dich_id, toChucId, tieu_de, noi_dung, loai_bao_cao, tong_thu || 0, tong_chi || 0]
        );

        res.json({
            success: true,
            message: 'Tạo báo cáo thành công',
            data: { bao_cao_id: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi tạo báo cáo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Lấy danh sách báo cáo của tổ chức
const getOrganizationReports = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [reports] = await pool.query(
            `SELECT 
                bc.bao_cao_id, bc.tieu_de, bc.noi_dung, bc.loai_bao_cao,
                bc.tong_thu, bc.tong_chi, bc.ngay_bao_cao,
                cd.chien_dich_id, cd.ten_chien_dich
            FROM BaoCao bc
            INNER JOIN ChienDich cd ON bc.chien_dich_id = cd.chien_dich_id
            WHERE bc.to_chuc_id = ?
            ORDER BY bc.ngay_bao_cao DESC`,
            [toChucId]
        );

        res.json({ success: true, data: reports });
    } catch (error) {
        console.error('Lỗi lấy danh sách báo cáo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

module.exports = {
    getOrganizationInfo,
    getOrganizationStatistics,
    getOrganizationCampaigns,
    getOrganizationVolunteers,
    getOrganizationDonations,
    createCampaign,
    updateCampaign,
    updateVolunteerStatus,
    createReport,
    getOrganizationReports
};

// Lấy dữ liệu dashboard tổng quan
const getDashboardData = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        // Thống kê tổng quan
        const [stats] = await pool.query(`
            SELECT 
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = ?) as tong_chien_dich,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = ? AND trang_thai = 'dang_dien_ra') as chien_dich_dang_chay,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = ? AND trang_thai = 'cho_duyet') as chien_dich_cho_duyet,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = ? AND trang_thai = 'ket_thuc') as chien_dich_hoan_thanh
        `, [toChucId, toChucId, toChucId, toChucId]);

        // Tổng quyên góp
        const [donations] = await pool.query(`
            SELECT COALESCE(SUM(qg.so_tien), 0) as tong_quyen_gop,
                   COUNT(*) as so_luot_quyen_gop
            FROM QuyenGop qg
            JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ? AND qg.trang_thai = 'thanh_cong'
        `, [toChucId]);

        // Tổng tình nguyện viên
        const [volunteers] = await pool.query(`
            SELECT COUNT(DISTINCT tg.user_id) as tong_tinh_nguyen_vien,
                   COUNT(CASE WHEN tg.trang_thai = 'cho_duyet' THEN 1 END) as cho_duyet
            FROM ThamGia tg
            JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
        `, [toChucId]);

        // Số người theo dõi
        const [followers] = await pool.query(
            'SELECT COUNT(*) as total FROM TheoDoi WHERE to_chuc_id = ?',
            [toChucId]
        );

        // Quyên góp gần đây
        const [recentDonations] = await pool.query(`
            SELECT qg.*, nd.ho_ten, cd.ten_chien_dich
            FROM QuyenGop qg
            JOIN NguoiDung nd ON qg.user_id = nd.user_id
            JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ? AND qg.trang_thai = 'thanh_cong'
            ORDER BY qg.ngay_gop DESC LIMIT 5
        `, [toChucId]);

        // Tình nguyện viên chờ duyệt
        const [pendingVolunteers] = await pool.query(`
            SELECT tg.*, nd.ho_ten, nd.email, nd.so_dien_thoai, cd.ten_chien_dich
            FROM ThamGia tg
            JOIN NguoiDung nd ON tg.user_id = nd.user_id
            JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ? AND tg.trang_thai = 'cho_duyet'
            ORDER BY tg.ngay_dang_ky DESC LIMIT 5
        `, [toChucId]);

        // Chiến dịch đang diễn ra
        const [activeCampaigns] = await pool.query(`
            SELECT cd.*, 
                (SELECT COUNT(*) FROM ThamGia WHERE chien_dich_id = cd.chien_dich_id AND trang_thai = 'duyet') as so_tinh_nguyen_vien
            FROM ChienDich cd
            WHERE cd.to_chuc_id = ? AND cd.trang_thai = 'dang_dien_ra'
            ORDER BY cd.ngay_tao DESC LIMIT 5
        `, [toChucId]);

        res.json({
            success: true,
            data: {
                thong_ke: {
                    ...stats[0],
                    tong_quyen_gop: donations[0].tong_quyen_gop,
                    so_luot_quyen_gop: donations[0].so_luot_quyen_gop,
                    tong_tinh_nguyen_vien: volunteers[0].tong_tinh_nguyen_vien,
                    tinh_nguyen_vien_cho_duyet: volunteers[0].cho_duyet,
                    so_nguoi_theo_doi: followers[0].total
                },
                quyen_gop_gan_day: recentDonations,
                tinh_nguyen_vien_cho_duyet: pendingVolunteers,
                chien_dich_dang_chay: activeCampaigns
            }
        });
    } catch (error) {
        console.error('Lỗi lấy dashboard:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports.getDashboardData = getDashboardData;

// Controller xử lý các endpoint tổ chức
const { pool } = require('../config/database');
const { notifyVolunteerStatus } = require('./notificationController');

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
                tg.ngay_dang_ky, tg.ngay_duyet, tg.ghi_chu,
                nd.user_id, nd.ho_ten, nd.email, nd.so_dien_thoai,
                cd.chien_dich_id, cd.ten_chien_dich, cd.trang_thai as trang_thai_chien_dich,
                cd.ngay_bat_dau, cd.ngay_ket_thuc
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

        // Lấy thông tin tham gia để biết chiến dịch, user và trạng thái cũ
        const [thamGia] = await pool.query(
            `SELECT tg.chien_dich_id, tg.user_id, tg.trang_thai as trang_thai_cu, cd.ten_chien_dich
             FROM ThamGia tg
             JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
             WHERE tg.tham_gia_id = ?`,
            [id]
        );

        if (thamGia.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đơn đăng ký' });
        }

        const { chien_dich_id, user_id, trang_thai_cu, ten_chien_dich } = thamGia[0];

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

        // Gửi thông báo cho người dùng
        await notifyVolunteerStatus(user_id, chien_dich_id, ten_chien_dich, trang_thai, ghi_chu);

        res.json({ success: true, message: 'Cập nhật trạng thái thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái tình nguyện viên:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Cập nhật trạng thái chiến dịch (Kết thúc sớm, Tạm dừng)
const updateCampaignStatus = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { campaignId } = req.params;
        const { trang_thai, ly_do } = req.body;

        // Kiểm tra trạng thái hợp lệ mà tổ chức có thể đổi
        // Hỗ trợ cả 'ket_thuc' và 'da_ket_thuc'
        const allowedStatuses = ['tam_dung', 'ket_thuc', 'da_ket_thuc'];
        if (!allowedStatuses.includes(trang_thai)) {
            return res.status(400).json({
                success: false,
                message: 'Trạng thái không hợp lệ. Chỉ có thể đổi sang: Tạm dừng hoặc Kết thúc sớm'
            });
        }

        // Chuẩn hóa trạng thái kết thúc về 'ket_thuc'
        const finalStatus = (trang_thai === 'da_ket_thuc') ? 'ket_thuc' : trang_thai;

        // Kiểm tra quyền sở hữu và trạng thái hiện tại
        const [campaign] = await pool.query(
            'SELECT to_chuc_id, trang_thai FROM ChienDich WHERE chien_dich_id = ?',
            [campaignId]
        );

        if (campaign.length === 0 || campaign[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thay đổi trạng thái chiến dịch này'
            });
        }

        const currentStatus = campaign[0].trang_thai;

        // Chỉ cho phép đổi trạng thái từ chiến dịch đang diễn ra hoặc tạm dừng
        if (!['dang_dien_ra', 'tam_dung'].includes(currentStatus)) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể thay đổi trạng thái chiến dịch đang diễn ra hoặc đang tạm dừng'
            });
        }

        // Nếu đang tạm dừng và muốn tiếp tục
        if (currentStatus === 'tam_dung' && trang_thai === 'dang_dien_ra') {
            // Cho phép tiếp tục chiến dịch
        }

        await pool.query(
            `UPDATE ChienDich SET trang_thai = ? WHERE chien_dich_id = ?`,
            [finalStatus, campaignId]
        );

        const statusMessages = {
            'tam_dung': 'Đã tạm dừng chiến dịch',
            'ket_thuc': 'Đã kết thúc sớm chiến dịch',
            'da_ket_thuc': 'Đã kết thúc sớm chiến dịch'
        };

        res.json({
            success: true,
            message: statusMessages[trang_thai] || 'Cập nhật trạng thái thành công'
        });
    } catch (error) {
        console.error('Lỗi cập nhật trạng thái chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Tiếp tục chiến dịch đang tạm dừng
const resumeCampaign = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { campaignId } = req.params;

        // Kiểm tra quyền sở hữu và trạng thái hiện tại
        const [campaign] = await pool.query(
            'SELECT to_chuc_id, trang_thai FROM ChienDich WHERE chien_dich_id = ?',
            [campaignId]
        );

        if (campaign.length === 0 || campaign[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thay đổi trạng thái chiến dịch này'
            });
        }

        if (campaign[0].trang_thai !== 'tam_dung') {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể tiếp tục chiến dịch đang tạm dừng'
            });
        }

        await pool.query(
            `UPDATE ChienDich SET trang_thai = 'dang_dien_ra' WHERE chien_dich_id = ?`,
            [campaignId]
        );

        res.json({ success: true, message: 'Đã tiếp tục chiến dịch' });
    } catch (error) {
        console.error('Lỗi tiếp tục chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Mở lại chiến dịch đã kết thúc (chuyển về chờ duyệt)
const reopenCampaign = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { campaignId } = req.params;

        // Kiểm tra quyền sở hữu và trạng thái hiện tại
        const [campaign] = await pool.query(
            'SELECT to_chuc_id, trang_thai FROM ChienDich WHERE chien_dich_id = ?',
            [campaignId]
        );

        if (campaign.length === 0 || campaign[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền thay đổi trạng thái chiến dịch này'
            });
        }

        // Chỉ cho phép mở lại chiến dịch đã kết thúc
        if (!['ket_thuc', 'da_ket_thuc'].includes(campaign[0].trang_thai)) {
            return res.status(400).json({
                success: false,
                message: 'Chỉ có thể mở lại chiến dịch đã kết thúc'
            });
        }

        await pool.query(
            `UPDATE ChienDich SET trang_thai = 'cho_duyet' WHERE chien_dich_id = ?`,
            [campaignId]
        );

        res.json({ success: true, message: 'Đã gửi yêu cầu mở lại chiến dịch. Vui lòng chờ Admin phê duyệt.' });
    } catch (error) {
        console.error('Lỗi mở lại chiến dịch:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Tạo báo cáo chiến dịch
const createReport = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { chien_dich_id, tieu_de, noi_dung, loai_bao_cao, tong_thu, tong_chi } = req.body;

        // Lấy file đính kèm nếu có
        const file_dinh_kem = req.file ? `/uploads/reports/${req.file.filename}` : null;

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
            `INSERT INTO BaoCao (chien_dich_id, to_chuc_id, tieu_de, noi_dung, loai_bao_cao, tong_thu, tong_chi, file_dinh_kem)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [chien_dich_id, toChucId, tieu_de, noi_dung, loai_bao_cao, tong_thu || 0, tong_chi || 0, file_dinh_kem]
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
                bc.tong_thu, bc.tong_chi, bc.ngay_bao_cao, bc.file_dinh_kem,
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

// Cập nhật báo cáo
const updateReport = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { reportId } = req.params;
        const { tieu_de, noi_dung, loai_bao_cao, tong_thu, tong_chi } = req.body;

        // Kiểm tra quyền sở hữu
        const [report] = await pool.query(
            'SELECT to_chuc_id FROM BaoCao WHERE bao_cao_id = ?',
            [reportId]
        );

        if (report.length === 0 || report[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền chỉnh sửa báo cáo này'
            });
        }

        // Nếu có file mới upload
        let updateQuery = `UPDATE BaoCao SET tieu_de = ?, noi_dung = ?, loai_bao_cao = ?, tong_thu = ?, tong_chi = ?`;
        let params = [tieu_de, noi_dung, loai_bao_cao, tong_thu || 0, tong_chi || 0];

        if (req.file) {
            updateQuery += `, file_dinh_kem = ?`;
            params.push(`/uploads/reports/${req.file.filename}`);
        }

        updateQuery += ` WHERE bao_cao_id = ?`;
        params.push(reportId);

        await pool.query(updateQuery, params);

        res.json({ success: true, message: 'Cập nhật báo cáo thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật báo cáo:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Xóa báo cáo
const deleteReport = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { reportId } = req.params;

        // Kiểm tra quyền sở hữu
        const [report] = await pool.query(
            'SELECT to_chuc_id FROM BaoCao WHERE bao_cao_id = ?',
            [reportId]
        );

        if (report.length === 0 || report[0].to_chuc_id !== toChucId) {
            return res.status(403).json({
                success: false,
                message: 'Bạn không có quyền xóa báo cáo này'
            });
        }

        await pool.query('DELETE FROM BaoCao WHERE bao_cao_id = ?', [reportId]);

        res.json({ success: true, message: 'Xóa báo cáo thành công' });
    } catch (error) {
        console.error('Lỗi xóa báo cáo:', error);
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
    updateCampaignStatus,
    resumeCampaign,
    reopenCampaign,
    updateVolunteerStatus,
    createReport,
    getOrganizationReports,
    updateReport,
    deleteReport
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

// Cập nhật thông tin tổ chức
const updateOrganizationInfo = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { ten_to_chuc, so_dien_thoai, website, dia_chi, mo_ta } = req.body;

        // Build dynamic update query
        let updates = [];
        let params = [];

        if (ten_to_chuc !== undefined) {
            updates.push('ten_to_chuc = ?');
            params.push(ten_to_chuc);
        }
        if (so_dien_thoai !== undefined) {
            updates.push('so_dien_thoai = ?');
            params.push(so_dien_thoai);
        }
        if (website !== undefined) {
            updates.push('website = ?');
            params.push(website);
        }
        if (dia_chi !== undefined) {
            updates.push('dia_chi = ?');
            params.push(dia_chi);
        }
        if (mo_ta !== undefined) {
            updates.push('mo_ta = ?');
            params.push(mo_ta);
        }

        // Thử cập nhật logo nếu có upload (bỏ qua nếu cột không tồn tại)
        if (req.file) {
            try {
                const logo = `/uploads/logos/${req.file.filename}`;
                updates.push('logo = ?');
                params.push(logo);
            } catch (e) {
                console.log('Bỏ qua logo - cột có thể không tồn tại');
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Không có dữ liệu để cập nhật' });
        }

        params.push(toChucId);
        const updateQuery = `UPDATE ToChuc SET ${updates.join(', ')} WHERE to_chuc_id = ?`;

        try {
            await pool.query(updateQuery, params);
        } catch (dbError) {
            // Nếu lỗi do cột logo không tồn tại, thử lại không có logo
            if (dbError.code === 'ER_BAD_FIELD_ERROR' && req.file) {
                updates = updates.filter(u => !u.includes('logo'));
                params = params.filter((p, i) => i !== updates.length); // Bỏ param logo
                params.pop(); // Bỏ toChucId cuối
                params.push(toChucId);
                
                if (updates.length > 0) {
                    const retryQuery = `UPDATE ToChuc SET ${updates.join(', ')} WHERE to_chuc_id = ?`;
                    await pool.query(retryQuery, params);
                }
            } else {
                throw dbError;
            }
        }

        res.json({ success: true, message: 'Cập nhật thông tin thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật thông tin tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

// Đổi mật khẩu tổ chức
const changePassword = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { mat_khau_cu, mat_khau_moi } = req.body;

        // Lấy mật khẩu hiện tại
        const [org] = await pool.query('SELECT mat_khau FROM ToChuc WHERE to_chuc_id = ?', [toChucId]);
        
        if (org.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy tổ chức' });
        }

        // So sánh mật khẩu (cần bcrypt nếu đã hash)
        const bcrypt = require('bcryptjs');
        const isMatch = await bcrypt.compare(mat_khau_cu, org[0].mat_khau);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: 'Mật khẩu hiện tại không đúng' });
        }

        // Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        
        await pool.query('UPDATE ToChuc SET mat_khau = ? WHERE to_chuc_id = ?', [hashedPassword, toChucId]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ success: false, message: 'Lỗi server', error: error.message });
    }
};

module.exports.updateOrganizationInfo = updateOrganizationInfo;
module.exports.changePassword = changePassword;

// ============ QUẢN LÝ BÌNH LUẬN ============

// Lấy danh sách bình luận trên các chiến dịch của tổ chức
const getOrganizationComments = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { chien_dich_id } = req.query;

        let query = `
            SELECT bl.*, 
                   nd.ho_ten as user_name, nd.avatar_url as user_avatar,
                   tc.ten_to_chuc as org_name, tc.logo as org_logo,
                   cd.ten_chien_dich, cd.chien_dich_id
            FROM BinhLuan bl
            LEFT JOIN NguoiDung nd ON bl.user_id = nd.user_id
            LEFT JOIN ToChuc tc ON bl.to_chuc_id = tc.to_chuc_id
            JOIN ChienDich cd ON bl.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ? AND bl.trang_thai = 'hien_thi'
        `;
        const params = [toChucId];

        if (chien_dich_id) {
            query += ' AND bl.chien_dich_id = ?';
            params.push(chien_dich_id);
        }

        query += ' ORDER BY bl.ngay_binh_luan DESC LIMIT 100';

        const [comments] = await pool.query(query, params);

        res.json({ success: true, data: comments });
    } catch (error) {
        console.error('Lỗi lấy bình luận:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tổ chức reply bình luận
const replyComment = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { commentId } = req.params;
        const { noi_dung } = req.body;

        if (!noi_dung || noi_dung.trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
        }

        // Kiểm tra comment gốc có thuộc chiến dịch của tổ chức không
        const [parentComment] = await pool.query(
            `SELECT bl.*, cd.to_chuc_id, cd.ten_chien_dich
             FROM BinhLuan bl
             JOIN ChienDich cd ON bl.chien_dich_id = cd.chien_dich_id
             WHERE bl.binh_luan_id = ?`,
            [commentId]
        );

        if (parentComment.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        if (parentComment[0].to_chuc_id !== toChucId) {
            return res.status(403).json({ success: false, message: 'Bạn chỉ có thể reply bình luận trên chiến dịch của mình' });
        }

        // Tạo reply
        const [result] = await pool.query(
            `INSERT INTO BinhLuan (chien_dich_id, to_chuc_id, noi_dung, parent_id) VALUES (?, ?, ?, ?)`,
            [parentComment[0].chien_dich_id, toChucId, noi_dung.trim(), commentId]
        );

        // Gửi thông báo cho người dùng được reply (nếu comment gốc là của user)
        if (parentComment[0].user_id) {
            const { notifyCommentReply } = require('./notificationController');
            const [org] = await pool.query('SELECT ten_to_chuc FROM ToChuc WHERE to_chuc_id = ?', [toChucId]);
            await notifyCommentReply(
                parentComment[0].user_id,
                parentComment[0].chien_dich_id,
                parentComment[0].ten_chien_dich,
                org[0]?.ten_to_chuc || 'Tổ chức',
                noi_dung.trim()
            );
        }

        // Lấy thông tin reply vừa tạo
        const [newReply] = await pool.query(
            `SELECT bl.*, tc.ten_to_chuc as org_name, tc.logo as org_logo
             FROM BinhLuan bl
             LEFT JOIN ToChuc tc ON bl.to_chuc_id = tc.to_chuc_id
             WHERE bl.binh_luan_id = ?`,
            [result.insertId]
        );

        res.status(201).json({ success: true, data: newReply[0], message: 'Phản hồi thành công' });
    } catch (error) {
        console.error('Lỗi reply bình luận:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa bình luận (tổ chức có thể xóa comment trên chiến dịch của mình)
const deleteOrgComment = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { commentId } = req.params;

        // Kiểm tra comment có thuộc chiến dịch của tổ chức không
        const [comment] = await pool.query(
            `SELECT bl.*, cd.to_chuc_id
             FROM BinhLuan bl
             JOIN ChienDich cd ON bl.chien_dich_id = cd.chien_dich_id
             WHERE bl.binh_luan_id = ?`,
            [commentId]
        );

        if (comment.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        if (comment[0].to_chuc_id !== toChucId) {
            return res.status(403).json({ success: false, message: 'Không có quyền xóa bình luận này' });
        }

        await pool.query("UPDATE BinhLuan SET trang_thai = 'xoa' WHERE binh_luan_id = ?", [commentId]);

        res.json({ success: true, message: 'Đã xóa bình luận' });
    } catch (error) {
        console.error('Lỗi xóa bình luận:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports.getOrganizationComments = getOrganizationComments;
module.exports.replyComment = replyComment;
module.exports.deleteOrgComment = deleteOrgComment;

// ============ QUẢN LÝ LƯỢT THÍCH ============

// Lấy danh sách người đã like các chiến dịch của tổ chức
const getCampaignLikes = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { chien_dich_id } = req.query;

        let query = `
            SELECT lt.like_id, lt.ngay_thich,
                   nd.user_id, nd.ho_ten, nd.email, nd.avatar_url,
                   cd.chien_dich_id, cd.ten_chien_dich
            FROM LuotThich lt
            JOIN NguoiDung nd ON lt.user_id = nd.user_id
            JOIN ChienDich cd ON lt.chien_dich_id = cd.chien_dich_id
            WHERE cd.to_chuc_id = ?
        `;
        const params = [toChucId];

        if (chien_dich_id) {
            query += ' AND lt.chien_dich_id = ?';
            params.push(chien_dich_id);
        }

        query += ' ORDER BY lt.ngay_thich DESC LIMIT 200';

        const [likes] = await pool.query(query, params);

        // Thống kê tổng
        const [stats] = await pool.query(`
            SELECT cd.chien_dich_id, cd.ten_chien_dich, COUNT(lt.like_id) as so_luot_thich
            FROM ChienDich cd
            LEFT JOIN LuotThich lt ON cd.chien_dich_id = lt.chien_dich_id
            WHERE cd.to_chuc_id = ?
            GROUP BY cd.chien_dich_id
            ORDER BY so_luot_thich DESC
        `, [toChucId]);

        res.json({ 
            success: true, 
            data: likes,
            stats: stats,
            total: likes.length
        });
    } catch (error) {
        console.error('Lỗi lấy lượt thích:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports.getCampaignLikes = getCampaignLikes;

// Controller xử lý trang cá nhân
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Lấy thông tin profile
const getProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [users] = await pool.query(
            `SELECT user_id, ho_ten, email, so_dien_thoai, dia_chi, ngay_sinh, gioi_tinh, 
                    avatar_url, vai_tro, ngay_tao
             FROM NguoiDung WHERE user_id = ?`,
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        }

        // Lấy thống kê
        const [donationStats] = await pool.query(
            `SELECT COUNT(*) as so_lan_quyen_gop, COALESCE(SUM(so_tien), 0) as tong_quyen_gop
             FROM QuyenGop WHERE user_id = ? AND trang_thai = 'thanh_cong'`,
            [userId]
        );

        const [participationStats] = await pool.query(
            `SELECT COUNT(*) as so_chien_dich_tham_gia
             FROM ThamGia WHERE user_id = ? AND trang_thai IN ('duyet', 'hoan_thanh')`,
            [userId]
        );

        const [likeStats] = await pool.query(
            `SELECT COUNT(*) as so_luot_thich FROM LuotThich WHERE user_id = ?`,
            [userId]
        );

        const user = users[0];
        user.thong_ke = {
            so_lan_quyen_gop: donationStats[0].so_lan_quyen_gop,
            tong_quyen_gop: donationStats[0].tong_quyen_gop,
            so_chien_dich_tham_gia: participationStats[0].so_chien_dich_tham_gia,
            so_luot_thich: likeStats[0].so_luot_thich
        };

        res.json({ success: true, data: user });
    } catch (error) {
        console.error('Lỗi lấy profile:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Cập nhật profile (không cập nhật avatar_url ở đây)
const updateProfile = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { ho_ten, so_dien_thoai, dia_chi, ngay_sinh, gioi_tinh } = req.body;

        // Xử lý ngày sinh - chuyển về format MySQL hoặc null
        let formattedDate = null;
        if (ngay_sinh && ngay_sinh !== '' && ngay_sinh !== 'null') {
            formattedDate = ngay_sinh;
        }

        await pool.query(
            `UPDATE NguoiDung SET ho_ten = ?, so_dien_thoai = ?, dia_chi = ?, 
             ngay_sinh = ?, gioi_tinh = ? WHERE user_id = ?`,
            [ho_ten, so_dien_thoai || null, dia_chi || null, formattedDate, gioi_tinh, userId]
        );

        res.json({ success: true, message: 'Cập nhật thành công' });
    } catch (error) {
        console.error('Lỗi cập nhật profile:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đổi mật khẩu
const changePassword = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { mat_khau_cu, mat_khau_moi } = req.body;

        const [users] = await pool.query('SELECT mat_khau FROM NguoiDung WHERE user_id = ?', [userId]);
        
        if (!users[0].mat_khau) {
            return res.status(400).json({ success: false, message: 'Tài khoản đăng ký bằng Google, không có mật khẩu' });
        }

        const isValid = await bcrypt.compare(mat_khau_cu, users[0].mat_khau);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Mật khẩu cũ không đúng' });
        }

        const hashedPassword = await bcrypt.hash(mat_khau_moi, 10);
        await pool.query('UPDATE NguoiDung SET mat_khau = ? WHERE user_id = ?', [hashedPassword, userId]);

        res.json({ success: true, message: 'Đổi mật khẩu thành công' });
    } catch (error) {
        console.error('Lỗi đổi mật khẩu:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Lấy lịch sử quyên góp
const getDonationHistory = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [donations] = await pool.query(
            `SELECT qg.*, cd.ten_chien_dich, cd.hinh_anh_url, tc.ten_to_chuc
             FROM QuyenGop qg
             JOIN ChienDich cd ON qg.chien_dich_id = cd.chien_dich_id
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
             WHERE qg.user_id = ?
             ORDER BY qg.ngay_gop DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, data: donations });
    } catch (error) {
        console.error('Lỗi lấy lịch sử quyên góp:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy lịch sử tham gia
const getParticipationHistory = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [participations] = await pool.query(
            `SELECT tg.*, cd.ten_chien_dich, cd.hinh_anh_url, cd.ngay_bat_dau, cd.ngay_ket_thuc,
                    tc.ten_to_chuc
             FROM ThamGia tg
             JOIN ChienDich cd ON tg.chien_dich_id = cd.chien_dich_id
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
             WHERE tg.user_id = ?
             ORDER BY tg.ngay_dang_ky DESC
             LIMIT ? OFFSET ?`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        res.json({ success: true, data: participations });
    } catch (error) {
        console.error('Lỗi lấy lịch sử tham gia:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy chiến dịch đã thích
const getLikedCampaigns = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [campaigns] = await pool.query(
            `SELECT cd.*, tc.ten_to_chuc, lt.ngay_thich
             FROM LuotThich lt
             JOIN ChienDich cd ON lt.chien_dich_id = cd.chien_dich_id
             JOIN ToChuc tc ON cd.to_chuc_id = tc.to_chuc_id
             WHERE lt.user_id = ?
             ORDER BY lt.ngay_thich DESC
             LIMIT 20`,
            [userId]
        );

        res.json({ success: true, data: campaigns });
    } catch (error) {
        console.error('Lỗi lấy chiến dịch đã thích:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Upload avatar
const uploadAvatar = async (req, res) => {
    try {
        const userId = req.user.user_id;
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Vui lòng chọn ảnh' });
        }

        const avatarUrl = `/uploads/avatars/${req.file.filename}`;
        
        await pool.query('UPDATE NguoiDung SET avatar_url = ? WHERE user_id = ?', [avatarUrl, userId]);

        res.json({ success: true, message: 'Cập nhật avatar thành công', avatar_url: avatarUrl });
    } catch (error) {
        console.error('Lỗi upload avatar:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getProfile,
    updateProfile,
    changePassword,
    getDonationHistory,
    getParticipationHistory,
    getLikedCampaigns,
    uploadAvatar
};

// Controller xử lý Theo dõi tổ chức
const { pool } = require('../config/database');

// Follow/Unfollow tổ chức
const toggleFollow = async (req, res) => {
    try {
        const { id } = req.params; // to_chuc_id
        const userId = req.user.user_id;

        // Kiểm tra đã follow chưa
        const [existing] = await pool.query(
            'SELECT theo_doi_id FROM TheoDoi WHERE user_id = ? AND to_chuc_id = ?',
            [userId, id]
        );

        if (existing.length > 0) {
            // Đã follow -> Unfollow
            await pool.query('DELETE FROM TheoDoi WHERE user_id = ? AND to_chuc_id = ?', [userId, id]);
            res.json({ success: true, followed: false, message: 'Đã hủy theo dõi' });
        } else {
            // Chưa follow -> Follow
            await pool.query('INSERT INTO TheoDoi (user_id, to_chuc_id) VALUES (?, ?)', [userId, id]);
            res.json({ success: true, followed: true, message: 'Đã theo dõi' });
        }
    } catch (error) {
        console.error('Lỗi toggle follow:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Kiểm tra đã follow chưa
const checkFollow = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const [result] = await pool.query(
            'SELECT theo_doi_id FROM TheoDoi WHERE user_id = ? AND to_chuc_id = ?',
            [userId, id]
        );

        res.json({ success: true, followed: result.length > 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm số người theo dõi
const countFollowers = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'SELECT COUNT(*) as total FROM TheoDoi WHERE to_chuc_id = ?',
            [id]
        );

        res.json({ success: true, count: result[0].total });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách tổ chức đang theo dõi (cho user)
const getFollowingOrgs = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [orgs] = await pool.query(
            `SELECT tc.*, td.ngay_theo_doi,
                (SELECT COUNT(*) FROM TheoDoi WHERE to_chuc_id = tc.to_chuc_id) as so_nguoi_theo_doi,
                (SELECT COUNT(*) FROM ChienDich WHERE to_chuc_id = tc.to_chuc_id AND trang_thai = 'dang_dien_ra') as so_chien_dich
             FROM TheoDoi td
             JOIN ToChuc tc ON td.to_chuc_id = tc.to_chuc_id
             WHERE td.user_id = ? AND tc.trang_thai = 'active'
             ORDER BY td.ngay_theo_doi DESC`,
            [userId]
        );

        res.json({ success: true, data: orgs });
    } catch (error) {
        console.error('Lỗi lấy danh sách theo dõi:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách người theo dõi của tổ chức
const getFollowers = async (req, res) => {
    try {
        const { id } = req.params;

        const [followers] = await pool.query(
            `SELECT nd.user_id, nd.ho_ten, nd.avatar_url, td.ngay_theo_doi
             FROM TheoDoi td
             JOIN NguoiDung nd ON td.user_id = nd.user_id
             WHERE td.to_chuc_id = ?
             ORDER BY td.ngay_theo_doi DESC
             LIMIT 50`,
            [id]
        );

        res.json({ success: true, data: followers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    toggleFollow,
    checkFollow,
    countFollowers,
    getFollowingOrgs,
    getFollowers
};

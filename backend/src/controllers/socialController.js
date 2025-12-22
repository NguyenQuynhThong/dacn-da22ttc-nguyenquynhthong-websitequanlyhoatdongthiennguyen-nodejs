// Controller xử lý tương tác xã hội (Like, Comment, Share)
const { pool } = require('../config/database');

// ==================== LIKE ====================

// Like/Unlike chiến dịch
const toggleLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        // Kiểm tra đã like chưa
        const [existing] = await pool.query(
            'SELECT like_id FROM LuotThich WHERE chien_dich_id = ? AND user_id = ?',
            [id, userId]
        );

        if (existing.length > 0) {
            // Đã like -> Unlike
            await pool.query('DELETE FROM LuotThich WHERE chien_dich_id = ? AND user_id = ?', [id, userId]);
            res.json({ success: true, liked: false, message: 'Đã bỏ thích' });
        } else {
            // Chưa like -> Like
            await pool.query('INSERT INTO LuotThich (chien_dich_id, user_id) VALUES (?, ?)', [id, userId]);
            res.json({ success: true, liked: true, message: 'Đã thích' });
        }
    } catch (error) {
        console.error('Lỗi toggle like:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Kiểm tra trạng thái like
const checkLike = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;

        const [result] = await pool.query(
            'SELECT like_id FROM LuotThich WHERE chien_dich_id = ? AND user_id = ?',
            [id, userId]
        );

        res.json({ success: true, liked: result.length > 0 });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm số like
const countLikes = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'SELECT COUNT(*) as total FROM LuotThich WHERE chien_dich_id = ?', [id]
        );
        res.json({ success: true, count: result[0].total });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// ==================== COMMENT ====================

// Lấy danh sách bình luận
const getComments = async (req, res) => {
    try {
        const { id } = req.params;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const [comments] = await pool.query(
            `SELECT bl.*, 
                    nd.ho_ten, nd.avatar_url,
                    tc.ten_to_chuc as org_name, tc.logo as org_logo
             FROM BinhLuan bl
             LEFT JOIN NguoiDung nd ON bl.user_id = nd.user_id
             LEFT JOIN ToChuc tc ON bl.to_chuc_id = tc.to_chuc_id
             WHERE bl.chien_dich_id = ? AND bl.trang_thai = 'hien_thi' AND bl.parent_id IS NULL
             ORDER BY bl.ngay_binh_luan DESC
             LIMIT ? OFFSET ?`,
            [id, parseInt(limit), parseInt(offset)]
        );

        // Lấy replies cho mỗi comment
        for (let comment of comments) {
            const [replies] = await pool.query(
                `SELECT bl.*, 
                        nd.ho_ten, nd.avatar_url,
                        tc.ten_to_chuc as org_name, tc.logo as org_logo
                 FROM BinhLuan bl
                 LEFT JOIN NguoiDung nd ON bl.user_id = nd.user_id
                 LEFT JOIN ToChuc tc ON bl.to_chuc_id = tc.to_chuc_id
                 WHERE bl.parent_id = ? AND bl.trang_thai = 'hien_thi'
                 ORDER BY bl.ngay_binh_luan ASC`,
                [comment.binh_luan_id]
            );
            comment.replies = replies;
        }

        const [countResult] = await pool.query(
            "SELECT COUNT(*) as total FROM BinhLuan WHERE chien_dich_id = ? AND trang_thai = 'hien_thi' AND parent_id IS NULL",
            [id]
        );

        res.json({ success: true, data: comments, total: countResult[0].total });
    } catch (error) {
        console.error('Lỗi lấy bình luận:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Thêm bình luận
const addComment = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const { noi_dung, parent_id } = req.body;

        if (!noi_dung || noi_dung.trim() === '') {
            return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
        }

        const [result] = await pool.query(
            `INSERT INTO BinhLuan (chien_dich_id, user_id, noi_dung, parent_id) VALUES (?, ?, ?, ?)`,
            [id, userId, noi_dung.trim(), parent_id || null]
        );

        // Lấy thông tin comment vừa tạo
        const [newComment] = await pool.query(
            `SELECT bl.*, nd.ho_ten, nd.avatar_url
             FROM BinhLuan bl
             LEFT JOIN NguoiDung nd ON bl.user_id = nd.user_id
             WHERE bl.binh_luan_id = ?`,
            [result.insertId]
        );

        res.status(201).json({ success: true, data: newComment[0], message: 'Bình luận thành công' });
    } catch (error) {
        console.error('Lỗi thêm bình luận:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Xóa bình luận (chỉ chủ comment)
const deleteComment = async (req, res) => {
    try {
        const { commentId } = req.params;
        const userId = req.user.user_id;

        const [comment] = await pool.query('SELECT user_id FROM BinhLuan WHERE binh_luan_id = ?', [commentId]);
        
        if (comment.length === 0) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy bình luận' });
        }

        if (comment[0].user_id !== userId) {
            return res.status(403).json({ success: false, message: 'Không có quyền xóa' });
        }

        await pool.query("UPDATE BinhLuan SET trang_thai = 'xoa' WHERE binh_luan_id = ?", [commentId]);
        res.json({ success: true, message: 'Đã xóa bình luận' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// ==================== SHARE ====================

// Chia sẻ chiến dịch
const shareCampaign = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user_id;
        const { noi_dung } = req.body;

        await pool.query(
            'INSERT INTO ChiaSe (chien_dich_id, user_id, noi_dung) VALUES (?, ?, ?)',
            [id, userId, noi_dung || null]
        );

        res.status(201).json({ success: true, message: 'Chia sẻ thành công' });
    } catch (error) {
        console.error('Lỗi chia sẻ:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Đếm số chia sẻ
const countShares = async (req, res) => {
    try {
        const { id } = req.params;
        const [result] = await pool.query(
            'SELECT COUNT(*) as total FROM ChiaSe WHERE chien_dich_id = ?', [id]
        );
        res.json({ success: true, count: result[0].total });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    toggleLike,
    checkLike,
    countLikes,
    getComments,
    addComment,
    deleteComment,
    shareCampaign,
    countShares
};

// Controller xử lý tin nhắn
const { pool } = require('../config/database');

// Lấy danh sách hội thoại của user (TNV)
const getUserConversations = async (req, res) => {
    try {
        const userId = req.user.user_id;

        // Lấy các tổ chức mà user đã nhắn tin hoặc nhận tin (chưa xóa)
        const [conversations] = await pool.query(`
            SELECT DISTINCT
                tc.to_chuc_id,
                tc.ten_to_chuc,
                (SELECT noi_dung FROM TinNhan 
                 WHERE ((nguoi_gui_user_id = ? AND nguoi_nhan_to_chuc_id = tc.to_chuc_id)
                    OR (nguoi_gui_to_chuc_id = tc.to_chuc_id AND nguoi_nhan_user_id = ?))
                    AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)
                 ORDER BY ngay_gui DESC LIMIT 1) as tin_nhan_cuoi,
                (SELECT ngay_gui FROM TinNhan 
                 WHERE ((nguoi_gui_user_id = ? AND nguoi_nhan_to_chuc_id = tc.to_chuc_id)
                    OR (nguoi_gui_to_chuc_id = tc.to_chuc_id AND nguoi_nhan_user_id = ?))
                    AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)
                 ORDER BY ngay_gui DESC LIMIT 1) as ngay_gui_cuoi,
                (SELECT COUNT(*) FROM TinNhan 
                 WHERE nguoi_gui_to_chuc_id = tc.to_chuc_id 
                   AND nguoi_nhan_user_id = ? 
                   AND da_doc = FALSE
                   AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)) as chua_doc
            FROM ToChuc tc
            WHERE tc.to_chuc_id IN (
                SELECT DISTINCT nguoi_nhan_to_chuc_id FROM TinNhan 
                WHERE nguoi_gui_user_id = ? AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)
                UNION
                SELECT DISTINCT nguoi_gui_to_chuc_id FROM TinNhan 
                WHERE nguoi_nhan_user_id = ? AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)
            )
            ORDER BY ngay_gui_cuoi DESC
        `, [userId, userId, userId, userId, userId, userId, userId]);

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Lỗi lấy danh sách hội thoại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy tin nhắn với một tổ chức
const getMessagesWithOrganization = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { toChucId } = req.params;

        // Lọc tin nhắn chưa bị user xóa
        const [messages] = await pool.query(`
            SELECT 
                tn.*,
                CASE WHEN tn.nguoi_gui_user_id IS NOT NULL THEN 'user' ELSE 'tochuc' END as loai_nguoi_gui
            FROM TinNhan tn
            WHERE ((tn.nguoi_gui_user_id = ? AND tn.nguoi_nhan_to_chuc_id = ?)
               OR (tn.nguoi_gui_to_chuc_id = ? AND tn.nguoi_nhan_user_id = ?))
               AND (tn.da_xoa_boi_user = FALSE OR tn.da_xoa_boi_user IS NULL)
            ORDER BY tn.ngay_gui ASC
        `, [userId, toChucId, toChucId, userId]);

        // Đánh dấu đã đọc các tin nhắn từ tổ chức (chỉ những tin chưa xóa)
        await pool.query(`
            UPDATE TinNhan SET da_doc = TRUE 
            WHERE nguoi_gui_to_chuc_id = ? AND nguoi_nhan_user_id = ? AND da_doc = FALSE
            AND (da_xoa_boi_user = FALSE OR da_xoa_boi_user IS NULL)
        `, [toChucId, userId]);

        // Lấy thông tin tổ chức
        const [org] = await pool.query(
            'SELECT to_chuc_id, ten_to_chuc FROM ToChuc WHERE to_chuc_id = ?',
            [toChucId]
        );

        res.json({
            success: true,
            data: messages,
            to_chuc: org[0] || null
        });
    } catch (error) {
        console.error('Lỗi lấy tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// User gửi tin nhắn cho tổ chức
const sendMessageToOrganization = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { toChucId } = req.params;
        const { noi_dung, chien_dich_id } = req.body;

        if (!noi_dung || !noi_dung.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
        }

        const [result] = await pool.query(`
            INSERT INTO TinNhan (nguoi_gui_user_id, nguoi_nhan_to_chuc_id, noi_dung, chien_dich_id)
            VALUES (?, ?, ?, ?)
        `, [userId, toChucId, noi_dung.trim(), chien_dich_id || null]);

        // Lấy thông tin user để gửi kèm
        const [userInfo] = await pool.query('SELECT ho_ten FROM NguoiDung WHERE user_id = ?', [userId]);

        // Emit realtime event đến tổ chức
        const { sendToOrg } = require('../config/socket');
        sendToOrg(toChucId, 'new_message', {
            tin_nhan_id: result.insertId,
            nguoi_gui_user_id: userId,
            ho_ten: userInfo[0]?.ho_ten || 'User',
            noi_dung: noi_dung.trim(),
            ngay_gui: new Date()
        });

        res.json({
            success: true,
            message: 'Đã gửi tin nhắn',
            data: { tin_nhan_id: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi gửi tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy số tin nhắn chưa đọc của user
const getUnreadCount = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [result] = await pool.query(`
            SELECT COUNT(*) as count FROM TinNhan 
            WHERE nguoi_nhan_user_id = ? AND da_doc = FALSE
        `, [userId]);

        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error('Lỗi đếm tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy danh sách tổ chức đã follow (để hiển thị mặc định)
const getContactableOrganizations = async (req, res) => {
    try {
        const userId = req.user.user_id;

        const [orgs] = await pool.query(`
            SELECT DISTINCT tc.to_chuc_id, tc.ten_to_chuc
            FROM ToChuc tc
            INNER JOIN TheoDoi td ON td.to_chuc_id = tc.to_chuc_id
            WHERE td.user_id = ? AND tc.trang_thai = 'active'
            ORDER BY tc.ten_to_chuc
        `, [userId]);

        res.json({ success: true, data: orgs });
    } catch (error) {
        console.error('Lỗi lấy danh sách tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tìm kiếm tổ chức (tất cả, kể cả chưa follow)
const searchOrganizations = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const [orgs] = await pool.query(`
            SELECT tc.to_chuc_id, tc.ten_to_chuc,
                   (SELECT COUNT(*) FROM TheoDoi WHERE to_chuc_id = tc.to_chuc_id AND user_id = ?) > 0 as da_follow
            FROM ToChuc tc
            WHERE tc.trang_thai = 'active' AND tc.ten_to_chuc LIKE ?
            ORDER BY da_follow DESC, tc.ten_to_chuc
            LIMIT 10
        `, [userId, `%${q.trim()}%`]);

        res.json({ success: true, data: orgs });
    } catch (error) {
        console.error('Lỗi tìm kiếm tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports = {
    getUserConversations,
    getMessagesWithOrganization,
    sendMessageToOrganization,
    getUnreadCount,
    getContactableOrganizations,
    searchOrganizations
};


// ==================== PHẦN TỔ CHỨC ====================

// Lấy danh sách hội thoại của tổ chức
const getOrgConversations = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [conversations] = await pool.query(`
            SELECT DISTINCT
                nd.user_id,
                nd.ho_ten,
                (SELECT noi_dung FROM TinNhan 
                 WHERE ((nguoi_gui_to_chuc_id = ? AND nguoi_nhan_user_id = nd.user_id)
                    OR (nguoi_gui_user_id = nd.user_id AND nguoi_nhan_to_chuc_id = ?))
                    AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)
                 ORDER BY ngay_gui DESC LIMIT 1) as tin_nhan_cuoi,
                (SELECT ngay_gui FROM TinNhan 
                 WHERE ((nguoi_gui_to_chuc_id = ? AND nguoi_nhan_user_id = nd.user_id)
                    OR (nguoi_gui_user_id = nd.user_id AND nguoi_nhan_to_chuc_id = ?))
                    AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)
                 ORDER BY ngay_gui DESC LIMIT 1) as ngay_gui_cuoi,
                (SELECT COUNT(*) FROM TinNhan 
                 WHERE nguoi_gui_user_id = nd.user_id 
                   AND nguoi_nhan_to_chuc_id = ? 
                   AND da_doc = FALSE
                   AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)) as chua_doc
            FROM NguoiDung nd
            WHERE nd.user_id IN (
                SELECT DISTINCT nguoi_nhan_user_id FROM TinNhan 
                WHERE nguoi_gui_to_chuc_id = ? AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)
                UNION
                SELECT DISTINCT nguoi_gui_user_id FROM TinNhan 
                WHERE nguoi_nhan_to_chuc_id = ? AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)
            )
            ORDER BY ngay_gui_cuoi DESC
        `, [toChucId, toChucId, toChucId, toChucId, toChucId, toChucId, toChucId]);

        res.json({ success: true, data: conversations });
    } catch (error) {
        console.error('Lỗi lấy danh sách hội thoại tổ chức:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy tin nhắn với một user
const getOrgMessagesWithUser = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { userId } = req.params;

        // Lọc tin nhắn chưa bị tổ chức xóa
        const [messages] = await pool.query(`
            SELECT 
                tn.*,
                CASE WHEN tn.nguoi_gui_to_chuc_id IS NOT NULL THEN 'tochuc' ELSE 'user' END as loai_nguoi_gui
            FROM TinNhan tn
            WHERE ((tn.nguoi_gui_to_chuc_id = ? AND tn.nguoi_nhan_user_id = ?)
               OR (tn.nguoi_gui_user_id = ? AND tn.nguoi_nhan_to_chuc_id = ?))
               AND (tn.da_xoa_boi_tochuc = FALSE OR tn.da_xoa_boi_tochuc IS NULL)
            ORDER BY tn.ngay_gui ASC
        `, [toChucId, userId, userId, toChucId]);

        // Đánh dấu đã đọc (chỉ những tin chưa xóa)
        await pool.query(`
            UPDATE TinNhan SET da_doc = TRUE 
            WHERE nguoi_gui_user_id = ? AND nguoi_nhan_to_chuc_id = ? AND da_doc = FALSE
            AND (da_xoa_boi_tochuc = FALSE OR da_xoa_boi_tochuc IS NULL)
        `, [userId, toChucId]);

        // Lấy thông tin user
        const [user] = await pool.query(
            'SELECT user_id, ho_ten, email FROM NguoiDung WHERE user_id = ?',
            [userId]
        );

        res.json({ 
            success: true, 
            data: messages,
            user: user[0] || null
        });
    } catch (error) {
        console.error('Lỗi lấy tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};


// Tổ chức gửi tin nhắn cho user
const sendOrgMessageToUser = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { userId } = req.params;
        const { noi_dung } = req.body;

        if (!noi_dung || !noi_dung.trim()) {
            return res.status(400).json({ success: false, message: 'Nội dung không được để trống' });
        }

        const [result] = await pool.query(`
            INSERT INTO TinNhan (nguoi_gui_to_chuc_id, nguoi_nhan_user_id, noi_dung)
            VALUES (?, ?, ?)
        `, [toChucId, userId, noi_dung.trim()]);

        // Lấy thông tin tổ chức để gửi kèm
        const [orgInfo] = await pool.query('SELECT ten_to_chuc FROM ToChuc WHERE to_chuc_id = ?', [toChucId]);

        // Emit realtime event đến user
        const { sendToUser } = require('../config/socket');
        sendToUser(userId, 'new_message', {
            tin_nhan_id: result.insertId,
            nguoi_gui_to_chuc_id: toChucId,
            ten_to_chuc: orgInfo[0]?.ten_to_chuc || 'Tổ chức',
            noi_dung: noi_dung.trim(),
            ngay_gui: new Date()
        });

        res.json({ 
            success: true, 
            message: 'Đã gửi tin nhắn',
            data: { tin_nhan_id: result.insertId }
        });
    } catch (error) {
        console.error('Lỗi gửi tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Lấy số tin nhắn chưa đọc của tổ chức
const getOrgUnreadCount = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;

        const [result] = await pool.query(`
            SELECT COUNT(*) as count FROM TinNhan 
            WHERE nguoi_nhan_to_chuc_id = ? AND da_doc = FALSE
        `, [toChucId]);

        res.json({ success: true, count: result[0].count });
    } catch (error) {
        console.error('Lỗi đếm tin nhắn:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tìm kiếm user (TNV đã tham gia chiến dịch của tổ chức)
const searchUsersForOrg = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { q } = req.query;

        if (!q || q.trim().length < 2) {
            return res.json({ success: true, data: [] });
        }

        const [users] = await pool.query(`
            SELECT DISTINCT nd.user_id, nd.ho_ten, nd.email
            FROM NguoiDung nd
            INNER JOIN ThamGia tg ON tg.user_id = nd.user_id
            INNER JOIN ChienDich cd ON cd.chien_dich_id = tg.chien_dich_id
            WHERE cd.to_chuc_id = ? AND tg.trang_thai = 'duyet'
              AND (nd.ho_ten LIKE ? OR nd.email LIKE ?)
            ORDER BY nd.ho_ten
            LIMIT 10
        `, [toChucId, `%${q.trim()}%`, `%${q.trim()}%`]);

        res.json({ success: true, data: users });
    } catch (error) {
        console.error('Lỗi tìm kiếm user:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// User xóa hội thoại với tổ chức
const deleteUserConversation = async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { toChucId } = req.params;

        // Đánh dấu tất cả tin nhắn trong hội thoại này là đã xóa bởi user
        await pool.query(`
            UPDATE TinNhan SET da_xoa_boi_user = TRUE 
            WHERE (nguoi_gui_user_id = ? AND nguoi_nhan_to_chuc_id = ?)
               OR (nguoi_gui_to_chuc_id = ? AND nguoi_nhan_user_id = ?)
        `, [userId, toChucId, toChucId, userId]);

        res.json({ success: true, message: 'Đã xóa hội thoại' });
    } catch (error) {
        console.error('Lỗi xóa hội thoại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

// Tổ chức xóa hội thoại với user
const deleteOrgConversation = async (req, res) => {
    try {
        const toChucId = req.user.to_chuc_id;
        const { userId } = req.params;

        // Đánh dấu tất cả tin nhắn trong hội thoại này là đã xóa bởi tổ chức
        await pool.query(`
            UPDATE TinNhan SET da_xoa_boi_tochuc = TRUE 
            WHERE (nguoi_gui_to_chuc_id = ? AND nguoi_nhan_user_id = ?)
               OR (nguoi_gui_user_id = ? AND nguoi_nhan_to_chuc_id = ?)
        `, [toChucId, userId, userId, toChucId]);

        res.json({ success: true, message: 'Đã xóa hội thoại' });
    } catch (error) {
        console.error('Lỗi xóa hội thoại:', error);
        res.status(500).json({ success: false, message: 'Lỗi server' });
    }
};

module.exports.getOrgConversations = getOrgConversations;
module.exports.getOrgMessagesWithUser = getOrgMessagesWithUser;
module.exports.sendOrgMessageToUser = sendOrgMessageToUser;
module.exports.getOrgUnreadCount = getOrgUnreadCount;
module.exports.searchUsersForOrg = searchUsersForOrg;
module.exports.deleteUserConversation = deleteUserConversation;
module.exports.deleteOrgConversation = deleteOrgConversation;

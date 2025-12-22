const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateToken } = require('../middlewares/auth');

// Tất cả routes cần đăng nhập
router.use(authenticateToken);

// Lấy danh sách thông báo
router.get('/', notificationController.getUserNotifications);

// Đếm số chưa đọc
router.get('/unread-count', notificationController.getUnreadCount);

// Đánh dấu tất cả đã đọc
router.put('/mark-all-read', notificationController.markAllAsRead);

// Đánh dấu 1 thông báo đã đọc
router.put('/:id/read', notificationController.markAsRead);

// Xóa thông báo
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;

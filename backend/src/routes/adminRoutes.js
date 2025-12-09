// Routes cho admin
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// Tất cả routes admin cần xác thực và quyền admin
router.use(authenticateToken);
router.use(requireAdmin);

// Thống kê
router.get('/thong-ke', adminController.getAdminStatistics);

// Quản lý người dùng
router.get('/nguoi-dung', adminController.getAllUsers);
router.put('/nguoi-dung/:userId/trang-thai', adminController.updateUserStatus);
router.delete('/nguoi-dung/:userId', adminController.deleteUser);

// Quản lý tổ chức
router.get('/to-chuc', adminController.getAllOrganizations);
router.delete('/to-chuc/:orgId', adminController.deleteOrganization);

// Quản lý chiến dịch
router.get('/chien-dich', adminController.getAllCampaigns);
router.delete('/chien-dich/:campaignId', adminController.deleteCampaign);

// Quản lý báo cáo
router.get('/bao-cao', adminController.getAllReports);
router.put('/bao-cao/:reportId', adminController.updateReportStatus);

module.exports = router;

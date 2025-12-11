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
router.put('/to-chuc/:orgId/duyet', adminController.approveOrganization);
router.put('/to-chuc/:orgId/trang-thai', adminController.updateOrganizationStatus);
router.delete('/to-chuc/:orgId', adminController.deleteOrganization);

// Quản lý chiến dịch
router.get('/chien-dich', adminController.getAllCampaigns);
router.put('/chien-dich/:campaignId/duyet', adminController.approveCampaign);
router.put('/chien-dich/:campaignId/tu-choi', adminController.rejectCampaign);
router.delete('/chien-dich/:campaignId', adminController.deleteCampaign);

// Quản lý báo cáo
router.get('/bao-cao', adminController.getAllReports);

module.exports = router;

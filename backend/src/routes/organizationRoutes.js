// Routes cho tổ chức
const express = require('express');
const router = express.Router();
const organizationController = require('../controllers/organizationController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Tất cả routes cần xác thực và quyền tổ chức
router.use(authenticateToken);
router.use(requireRole('to_chuc'));

// Thông tin tổ chức
router.get('/thong-tin', organizationController.getOrganizationInfo);

// Thống kê
router.get('/thong-ke', organizationController.getOrganizationStatistics);

// Quản lý chiến dịch
router.get('/chien-dich', organizationController.getOrganizationCampaigns);
router.post('/chien-dich', organizationController.createCampaign);

// Quản lý tình nguyện viên
router.get('/tinh-nguyen-vien', organizationController.getOrganizationVolunteers);
router.put('/tinh-nguyen-vien/:id', organizationController.updateVolunteerStatus);

// Xem quyên góp
router.get('/quyen-gop', organizationController.getOrganizationDonations);

module.exports = router;

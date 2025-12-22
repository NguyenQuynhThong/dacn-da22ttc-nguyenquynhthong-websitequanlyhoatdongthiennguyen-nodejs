// Routes cho tổ chức
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const organizationController = require('../controllers/organizationController');
const { authenticateToken, requireRole } = require('../middlewares/auth');

// Cấu hình multer cho upload ảnh báo cáo
const reportStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/reports/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'report-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Cấu hình multer cho upload logo tổ chức
const logoStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/logos/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'logo-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const uploadReport = multer({
    storage: reportStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép upload file ảnh (jpeg, jpg, png, gif, webp)'));
    }
});

const uploadLogo = multer({
    storage: logoStorage,
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Chỉ cho phép upload file ảnh'));
    }
});

// Tất cả routes cần xác thực và quyền tổ chức
router.use(authenticateToken);
router.use(requireRole('tochuc', 'to_chuc'));

// Dashboard
router.get('/dashboard', organizationController.getDashboardData);

// Thông tin tổ chức
router.get('/thong-tin', organizationController.getOrganizationInfo);
router.put('/cap-nhat', uploadLogo.single('logo'), organizationController.updateOrganizationInfo);
router.put('/doi-mat-khau', organizationController.changePassword);

// Thống kê
router.get('/thong-ke', organizationController.getOrganizationStatistics);

// Quản lý chiến dịch
router.get('/chien-dich', organizationController.getOrganizationCampaigns);
router.post('/chien-dich', organizationController.createCampaign);
// Routes cụ thể phải đặt TRƯỚC route có param chung
router.put('/chien-dich/:campaignId/trang-thai', organizationController.updateCampaignStatus);
router.put('/chien-dich/:campaignId/tiep-tuc', organizationController.resumeCampaign);
router.put('/chien-dich/:campaignId/mo-lai', organizationController.reopenCampaign);
router.put('/chien-dich/:campaignId', organizationController.updateCampaign);

// Quản lý tình nguyện viên
router.get('/tinh-nguyen-vien', organizationController.getOrganizationVolunteers);
router.put('/tinh-nguyen-vien/:id', organizationController.updateVolunteerStatus);

// Xem quyên góp
router.get('/quyen-gop', organizationController.getOrganizationDonations);

// Báo cáo
router.get('/bao-cao', organizationController.getOrganizationReports);
router.post('/bao-cao', uploadReport.single('hinh_anh'), organizationController.createReport);
router.put('/bao-cao/:reportId', uploadReport.single('hinh_anh'), organizationController.updateReport);
router.delete('/bao-cao/:reportId', organizationController.deleteReport);

// Quản lý bình luận
router.get('/binh-luan', organizationController.getOrganizationComments);
router.post('/binh-luan/:commentId/reply', organizationController.replyComment);
router.delete('/binh-luan/:commentId', organizationController.deleteOrgComment);

// Quản lý lượt thích
router.get('/luot-thich', organizationController.getCampaignLikes);

module.exports = router;

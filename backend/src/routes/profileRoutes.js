// Routes cho Profile
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticateToken } = require('../middlewares/auth');
const { uploadAvatar } = require('../middlewares/upload');

// Tất cả routes đều cần đăng nhập
router.use(authenticateToken);

router.get('/', profileController.getProfile);
router.put('/', profileController.updateProfile);
router.put('/password', profileController.changePassword);
router.post('/avatar', uploadAvatar.single('avatar'), profileController.uploadAvatar);
router.get('/donations', profileController.getDonationHistory);
router.get('/participations', profileController.getParticipationHistory);
router.get('/liked', profileController.getLikedCampaigns);
router.get('/comments', profileController.getMyComments);

module.exports = router;

// Routes cho Chiến dịch
const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignController');
const { authenticateToken } = require('../middlewares/auth');

// Public routes
router.get('/', campaignController.getCampaigns);
router.get('/:id', campaignController.getCampaignById);
router.get('/:id/donations', campaignController.getCampaignDonations);
router.get('/:id/volunteers', campaignController.getCampaignVolunteers);

// Protected routes (cần đăng nhập)
router.post('/:id/join', authenticateToken, campaignController.joinCampaign);
router.post('/:id/donate', authenticateToken, campaignController.donateCampaign);
router.get('/:id/my-participation', authenticateToken, campaignController.checkParticipation);

module.exports = router;

// Routes cho tương tác xã hội
const express = require('express');
const router = express.Router();
const socialController = require('../controllers/socialController');
const { authenticateToken, optionalAuth } = require('../middlewares/auth');

// Like routes
router.post('/:id/like', authenticateToken, socialController.toggleLike);
router.get('/:id/like/check', authenticateToken, socialController.checkLike);
router.get('/:id/like/count', socialController.countLikes);

// Comment routes
router.get('/:id/comments', socialController.getComments);
router.post('/:id/comments', authenticateToken, socialController.addComment);
router.delete('/comments/:commentId', authenticateToken, socialController.deleteComment);

// Share routes
router.post('/:id/share', authenticateToken, socialController.shareCampaign);
router.get('/:id/share/count', socialController.countShares);

module.exports = router;

// Routes cho Theo dõi
const express = require('express');
const router = express.Router();
const followController = require('../controllers/followController');
const { authenticateToken } = require('../middlewares/auth');

// Public routes
router.get('/tochuc/:id/count', followController.countFollowers);
router.get('/tochuc/:id/followers', followController.getFollowers);

// Protected routes
router.post('/tochuc/:id', authenticateToken, followController.toggleFollow);
router.get('/tochuc/:id/check', authenticateToken, followController.checkFollow);
router.get('/my-following', authenticateToken, followController.getFollowingOrgs);

module.exports = router;

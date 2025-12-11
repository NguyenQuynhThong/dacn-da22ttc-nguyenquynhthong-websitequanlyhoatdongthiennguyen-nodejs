// Routes cho Tổ chức (Public)
const express = require('express');
const router = express.Router();
const toChucController = require('../controllers/toChucController');

router.get('/', toChucController.getToChucList);
router.get('/:id', toChucController.getToChucById);
router.get('/:id/campaigns', toChucController.getToChucCampaigns);

module.exports = router;

// Routes cho các endpoint công khai (không cần xác thực)
const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

// Thống kê tổng quan
router.get('/stats/overview', publicController.getStatistics);

// Danh sách chiến dịch
router.get('/campaigns', publicController.getCampaigns);

// Danh sách tổ chức
router.get('/organizations', publicController.getOrganizations);

// Chi tiết chiến dịch
router.get('/campaigns/:id', publicController.getCampaignDetail);

// Chi tiết tổ chức
router.get('/organizations/:id', publicController.getOrganizationDetail);

module.exports = router;

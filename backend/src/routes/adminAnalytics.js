/**
 * Admin Analytics Routes
* 管理后台报表和分析路由 for Issue #160
 */
const express = require('express');
const router = express.Router();
const adminAnalyticsController = require('../controllers/adminAnalyticsController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

// 销售报表
router.get('/sales', adminAnalyticsController.getSalesAnalytics);

// 用户分析
router.get('/users', adminAnalyticsController.getUserAnalytics);

// 产品分析
router.get('/products', adminAnalyticsController.getProductAnalytics);

module.exports = router;


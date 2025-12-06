// [2025-12-06] PRD v2.0: 线下订单尺码费用管理路由
const express = require('express');
const router = express.Router();
const offlineOrderSizeFeeController = require('../controllers/offlineOrderSizeFeeController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

router.get('/', offlineOrderSizeFeeController.getSizeFees);
router.patch('/', offlineOrderSizeFeeController.updateSizeFees);

module.exports = router;


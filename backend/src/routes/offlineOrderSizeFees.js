/**
 * Offline Order Size Fees Routes
 * [2025-12-06 17:55:00] PRD v2.0: 尺码额外费用配置路由
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/offlineOrderSizeFeeController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.getSizeFees);
router.patch('/', controller.updateSizeFees);

module.exports = router;


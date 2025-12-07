// [2025-12-06] PRD v2.0: 线下订单尺码费用管理路由
// [2025-12-07 06:10:00] 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderSizeFeeController = require('../controllers/offlineOrderSizeFeeController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// [2025-12-07 06:30:00] 先认证，再检查角色权限
router.use(authenticate);
router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.get('/', offlineOrderSizeFeeController.getSizeFees);
router.patch('/', offlineOrderSizeFeeController.updateSizeFees);

module.exports = router;


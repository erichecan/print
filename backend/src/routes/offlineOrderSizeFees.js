// [2025-12-06] PRD v2.0: 线下订单尺码费用管理路由
// [2025-12-07 06:10:00] 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderSizeFeeController = require('../controllers/offlineOrderSizeFeeController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

// [2025-12-07 06:40:00] 添加路由级别的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderSizeFees Route] 🔵 Request received', {
    method: req.method,
    path: req.path,
    hasCookies: !!req.cookies,
    hasToken: !!req.cookies?.token,
  });
  next();
});

// [2025-12-07 06:30:00] 先认证，再检查角色权限
router.use(authenticate);

router.use((req, res, next) => {
  logger.info('[OfflineOrderSizeFees Route] ✅ Authentication passed', {
    userId: req.user?.id,
    userRole: req.user?.role,
  });
  next();
});

router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.use((req, res, next) => {
  logger.info('[OfflineOrderSizeFees Route] ✅ Authorization passed', {
    userRole: req.user?.role,
  });
  next();
});

router.get('/', offlineOrderSizeFeeController.getSizeFees);
router.patch('/', offlineOrderSizeFeeController.updateSizeFees);

module.exports = router;


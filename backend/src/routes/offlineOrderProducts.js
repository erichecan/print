// [2025-12-06] PRD v2.0: 线下订单产品管理路由
// [2025-12-07 06:10:00] 允许 SALES_MANAGER 和 ADMIN 访问
// [2025-01-27 11:00:00] 重构：统一产品管理路由，支持公开接口和管理接口
const express = require('express');
const router = express.Router();
const offlineOrderProductController = require('../controllers/offlineOrderProductController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

// [2025-12-07 06:40:00] 添加路由级别的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderProducts Route] 🔵 Request received', {
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
  logger.info('[OfflineOrderProducts Route] ✅ Authentication passed', {
    userId: req.user?.id,
    userRole: req.user?.role,
  });
  next();
});

router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.use((req, res, next) => {
  logger.info('[OfflineOrderProducts Route] ✅ Authorization passed', {
    userRole: req.user?.role,
  });
  next();
});

// 管理接口：获取所有产品（包含非激活的）
router.get('/', offlineOrderProductController.listAllProducts);
router.post('/', offlineOrderProductController.createProduct);
router.patch('/:id', offlineOrderProductController.updateProduct);
router.delete('/:id', offlineOrderProductController.deleteProduct);

module.exports = router;


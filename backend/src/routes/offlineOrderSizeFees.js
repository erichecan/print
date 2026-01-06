// PRD v2.0: 线下订单尺码费用管理路由
// 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderSizeFeeController = require('../controllers/offlineOrderSizeFeeController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

// 添加路由级别的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderSizeFees Route] 🔵 Request received', {
    method: req.method,
    path: req.path,
    hasCookies: !!req.cookies,
    hasToken: !!req.cookies?.token,
  });
  next();
});

// 先认证，再检查角色权限
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

// GET / - 获取所有尺码配置
router.get('/', offlineOrderSizeFeeController.getSizeFees);

// POST / - 创建新尺码配置
router.post('/', offlineOrderSizeFeeController.createSizeFee);

// PATCH / - 批量更新（保持向后兼容）
router.patch('/', offlineOrderSizeFeeController.updateSizeFees);

// PATCH /:id - 更新单个尺码配置
router.patch('/:id', offlineOrderSizeFeeController.updateSizeFee);

// DELETE /:id - 删除尺码配置
router.delete('/:id', offlineOrderSizeFeeController.deleteSizeFee);

module.exports = router;


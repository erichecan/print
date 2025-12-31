// PRD v2.0: 线下订单颜色管理路由
// 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderColorController = require('../controllers/offlineOrderColorController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
const logger = require('../utils/logger');

// 添加路由级别的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderColors Route] 🔵 Request received', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    baseUrl: req.baseUrl,
    url: req.url,
    hasCookies: !!req.cookies,
    hasToken: !!req.cookies?.token,
    hasAuthHeader: !!req.headers.authorization,
    tokenPreview: req.cookies?.token?.substring(0, 20) || req.headers.authorization?.substring(0, 30) || 'none',
    userAgent: req.headers['user-agent'],
    origin: req.headers.origin,
  });
  next();
});

// 先认证，再检查角色权限
router.use(authenticate);

// 认证后的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderColors Route] ✅ Authentication passed', {
    userId: req.user?.id,
    userEmail: req.user?.email,
    userRole: req.user?.role,
  });
  next();
});

router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

// 授权后的日志
router.use((req, res, next) => {
  logger.info('[OfflineOrderColors Route] ✅ Authorization passed', {
    userId: req.user?.id,
    userRole: req.user?.role,
  });
  next();
});

router.get('/', offlineOrderColorController.listColors);
router.post('/', offlineOrderColorController.createColor);
router.patch('/:id', offlineOrderColorController.updateColor);
router.delete('/:id', offlineOrderColorController.deleteColor);

module.exports = router;


/**
 * Public Offline Order Products Routes
 * [2025-01-27 11:15:00] 公开的产品列表接口（用于订单创建页面的下拉菜单）
 */
const express = require('express');
const router = express.Router();
const offlineOrderProductController = require('../controllers/offlineOrderProductController');
const logger = require('../utils/logger');

// [2025-01-27 16:30:00] 添加路由级别的日志，用于调试
router.use((req, res, next) => {
  logger.info('[OfflineOrderProductsPublic Route] 🔵 Request received', {
    method: req.method,
    path: req.path,
    originalUrl: req.originalUrl,
    url: req.url,
  });
  next();
});

// 公开接口：获取激活的产品列表（无需认证）
router.get('/', offlineOrderProductController.listProducts);

module.exports = router;


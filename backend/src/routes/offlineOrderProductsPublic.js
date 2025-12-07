/**
 * Public Offline Order Products Routes
 * [2025-01-27 11:15:00] 公开的产品列表接口（用于订单创建页面的下拉菜单）
 */
const express = require('express');
const router = express.Router();
const offlineOrderProductController = require('../controllers/offlineOrderProductController');

// 公开接口：获取激活的产品列表（无需认证）
router.get('/', offlineOrderProductController.listProducts);

module.exports = router;


/**
 * Simple Offline Order Products Routes
 * [2025-12-07 08:00:00] 简化的产品管理路由
 */
const express = require('express');
const router = express.Router();
const simpleOfflineOrderProductController = require('../controllers/simpleOfflineOrderProductController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 公开接口：获取产品列表（用于下拉菜单）
router.get('/', simpleOfflineOrderProductController.listProducts);

// 管理接口：需要认证和授权
router.get('/admin', authenticate, authorizeRoles('SALES_MANAGER', 'ADMIN'), simpleOfflineOrderProductController.listAllProducts);
router.post('/admin', authenticate, authorizeRoles('SALES_MANAGER', 'ADMIN'), simpleOfflineOrderProductController.createProduct);
router.patch('/admin/:id', authenticate, authorizeRoles('SALES_MANAGER', 'ADMIN'), simpleOfflineOrderProductController.updateProduct);
router.delete('/admin/:id', authenticate, authorizeRoles('SALES_MANAGER', 'ADMIN'), simpleOfflineOrderProductController.deleteProduct);

module.exports = router;


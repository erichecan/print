/**
 * Unified Orders Routes
* 统一订单管理路由：合并线上和线下订单
 */
const express = require('express');
const router = express.Router();
const unifiedOrderController = require('../controllers/unifiedOrderController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

// GET /api/admin/all-orders - 统一订单列表
router.get('/', unifiedOrderController.listAllOrders);

// GET /api/admin/all-orders/export - 导出统一订单列表
router.get('/export', unifiedOrderController.exportAllOrders);

module.exports = router;


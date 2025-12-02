// [2025-12-02 04:48:00] Sales 线下订单路由
const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// [2025-12-02 04:48:00] 仅允许 SALES / SALES_MANAGER / ADMIN 访问
router.use(authenticate);
router.use(authorizeRoles('SALES', 'SALES_MANAGER', 'ADMIN'));

// GET /api/sales/orders - 列表
router.get('/', salesOrderController.listSalesOrders);

// GET /api/sales/orders/:id - 详情
router.get('/:id', salesOrderController.getSalesOrderById);

module.exports = router;



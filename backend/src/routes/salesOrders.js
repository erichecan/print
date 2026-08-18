// Sales 线下订单路由
const express = require('express');
const router = express.Router();
const salesOrderController = require('../controllers/salesOrderController');
const { authenticate, authorizeRoles } = require('../middleware/auth');
// [2026-08-18] 非创建者只读：阶段变更仅限订单创建者
const { requireOfflineOrderOwner } = require('../utils/offlineOrderOwnership');

// 仅允许 SALES / SALES_MANAGER / ADMIN 访问
router.use(authenticate);
router.use(authorizeRoles('SALES', 'SALES_MANAGER', 'ADMIN'));

// GET /api/sales/orders - 列表
router.get('/', salesOrderController.listSalesOrders);

// GET /api/sales/orders/creators - 获取创建者列表 (用于筛选)
router.get('/creators', salesOrderController.getSalesCreators);

// GET /api/sales/orders/:id - 详情
router.get('/:id', salesOrderController.getSalesOrderById);

// PATCH /api/sales/orders/:id/stage - 更新订单阶段
router.patch('/:id/stage', requireOfflineOrderOwner, salesOrderController.updateSalesOrderStage);

// PATCH /api/sales/orders/:id/status - 更新订单状态
router.patch('/:id/status', salesOrderController.updateSalesOrderStatus);

module.exports = router;



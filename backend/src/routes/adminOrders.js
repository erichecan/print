// [2025-11-12 01:05:02] 后台订单路由
const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/', adminOrderController.listOrders);
router.get('/:id', adminOrderController.getOrderById);
router.patch('/:id/status', adminOrderController.updateOrderStatus);
router.post('/:id/refund', adminOrderController.recordRefund);

module.exports = router;



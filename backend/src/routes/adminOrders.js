// [2025-11-12 01:05:02] 后台订单路由
const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/', adminOrderController.listOrders);
router.get('/export', adminOrderController.exportOrders); // [2025-12-06 16:40:00] Batch export for Issue #87
router.patch('/batch/status', adminOrderController.batchUpdateStatus); // [2025-12-06 16:40:00] Batch update for Issue #87
router.get('/:id', adminOrderController.getOrderById);
router.get('/:id/status-history', adminOrderController.getOrderStatusHistory);
router.patch('/:id/status', adminOrderController.updateOrderStatus);
router.post('/:id/refund', adminOrderController.recordRefund);
// [2025-12-06 15:30:00] EasyShip shipping label routes
router.get('/:id/shipment/rates', adminOrderController.getShippingRates);
router.post('/:id/shipment/label', adminOrderController.generateShippingLabel);

module.exports = router;



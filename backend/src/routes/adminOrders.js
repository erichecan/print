// 后台订单路由
const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { requireAdmin } = require('../middleware/auth');
const validate = require('../middleware/validate');
const schemas = require('../utils/schemas');

router.use(requireAdmin);

router.get('/', validate(schemas.paginationQuery, 'query'), adminOrderController.listOrders);
router.get('/export', adminOrderController.exportOrders); // Batch export for Issue #87
router.patch('/batch/status', adminOrderController.batchUpdateStatus); // Batch update for Issue #87
router.get('/:id', adminOrderController.getOrderById);
router.get('/:id/status-history', adminOrderController.getOrderStatusHistory);
router.patch('/:id/status', adminOrderController.updateOrderStatus);
router.post('/:id/refund', adminOrderController.recordRefund);
// EasyShip shipping label routes
router.get('/:id/shipment/rates', adminOrderController.getShippingRates);
router.post('/:id/shipment/label', adminOrderController.generateShippingLabel);

module.exports = router;



// 后台订单路由
const express = require('express');
const router = express.Router();
const adminOrderController = require('../controllers/adminOrderController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

router.get('/', adminOrderController.listOrders);
router.get('/export', adminOrderController.exportOrders); // Batch export for Issue #87
router.patch('/batch/status', adminOrderController.batchUpdateStatus); // Batch update for Issue #87
router.get('/:id', adminOrderController.getOrderById);
router.get('/:id/status-history', adminOrderController.getOrderStatusHistory);
router.patch('/:id/status', adminOrderController.updateOrderStatus);
router.post('/:id/refund', adminOrderController.recordRefund);
// EasyShip shipping label routes
router.get('/:id/shipment/rates', adminOrderController.getShippingRates);
router.post('/:id/shipment/label', adminOrderController.generateShippingLabel);

// Design Review flow
router.get('/design-review/queue', adminOrderController.listDesignReviewQueue);
router.patch('/:id/design-review/sync', adminOrderController.syncDesignToOrder);
router.patch('/:id/design-review/reject', adminOrderController.rejectDesignToCustomer);
router.patch('/:id/design-review/save-draft', adminOrderController.saveDesignerDraft);

// Logistics export + CSV import
router.get('/logistics/export', adminOrderController.exportLogisticsOrders);
router.post('/logistics/import-csv', adminOrderController.importLogisticsCsv);

// Gang Sheet
router.get('/:id/gang-sheet', adminOrderController.getGangSheet);

module.exports = router;



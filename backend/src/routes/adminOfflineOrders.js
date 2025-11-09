// [2025-11-08 06:57:02] Admin routes for offline POD orders
const express = require('express');
const offlineOrderController = require('../controllers/offlineOrderController');

const router = express.Router();

router.get(
  '/config/stages',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.getOfflineWorkflowStages
);

router.put(
  '/config/stages',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.updateOfflineWorkflowStages
);

router.get(
  '/metrics/summary',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.getOfflineOrderMetrics
);

router.get(
  '/',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.listOfflineOrders
);

router.get(
  '/:id',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.getOfflineOrderById
);

router.patch(
  '/:id/stage',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.updateOfflineOrderStage
);

router.patch(
  '/:id',
  // TODO: restore requireAdmin when authentication is ready
  offlineOrderController.updateOfflineOrder
);

module.exports = router;


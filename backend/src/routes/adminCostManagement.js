// [2025-11-10 10:30:00] Admin routes for product cost management
const express = require('express');
const costManagementController = require('../controllers/costManagementController');

const router = express.Router();

router.get(
  '/summary',
  // TODO: restore requireAdmin middleware when auth is ready [2025-11-10 10:30:00]
  costManagementController.getCostSummary
);

router.get(
  '/products',
  // TODO: restore requireAdmin middleware when auth is ready [2025-11-10 10:30:00]
  costManagementController.listProductCosts
);

router.put(
  '/products/:id',
  // TODO: restore requireAdmin middleware when auth is ready [2025-11-10 10:30:00]
  costManagementController.updateProductCost
);

router.get(
  '/categories',
  // TODO: restore requireAdmin middleware when auth is ready [2025-11-10 10:30:00]
  costManagementController.listCostCategories
);

module.exports = router;



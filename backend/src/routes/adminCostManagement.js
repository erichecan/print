// [2025-11-10 10:30:00] Admin routes for product cost management
const express = require('express');
const costManagementController = require('../controllers/costManagementController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/summary', costManagementController.getCostSummary);

router.get('/products', costManagementController.listProductCosts);

router.put('/products/:id', costManagementController.updateProductCost);

router.get('/categories', costManagementController.listCostCategories);

module.exports = router;



// [2025-11-11 23:19:40] 后台商品管理路由
// [2025-01-27 13:50:00] Added inventory management routes
const express = require('express');
const controller = require('../controllers/adminProductController');
const inventoryController = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

// Inventory management routes (must be before /:id routes)
router.get('/low-stock', inventoryController.getLowStockProducts);
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);

router.get('/', controller.listProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.archiveProduct);
router.patch('/:id/status', controller.updateProductStatus);

module.exports = router;



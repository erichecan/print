/**
 * Offline Order Products Routes
 * [2025-12-06 17:55:00] PRD v2.0: 线下订单产品管理路由
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/offlineOrderProductController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listProducts);
router.post('/', controller.createProduct);
router.patch('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);

module.exports = router;


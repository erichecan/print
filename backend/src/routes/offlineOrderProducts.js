// [2025-12-06] PRD v2.0: 线下订单产品管理路由
const express = require('express');
const router = express.Router();
const offlineOrderProductController = require('../controllers/offlineOrderProductController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

router.get('/', offlineOrderProductController.listProducts);
router.post('/', offlineOrderProductController.createProduct);
router.patch('/:id', offlineOrderProductController.updateProduct);
router.delete('/:id', offlineOrderProductController.deleteProduct);

module.exports = router;


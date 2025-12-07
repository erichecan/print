// [2025-12-06] PRD v2.0: 线下订单产品管理路由
// [2025-12-07 06:10:00] 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderProductController = require('../controllers/offlineOrderProductController');
const { authorizeRoles } = require('../middleware/auth');

// 允许 SALES_MANAGER 和 ADMIN 访问
router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.get('/', offlineOrderProductController.listProducts);
router.post('/', offlineOrderProductController.createProduct);
router.patch('/:id', offlineOrderProductController.updateProduct);
router.delete('/:id', offlineOrderProductController.deleteProduct);

module.exports = router;


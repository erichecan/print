/**
 * Admin Simple Offline Order Products Routes
 * [2025-12-07 08:00:00] 管理端产品管理路由
 */
const express = require('express');
const router = express.Router();
const simpleOfflineOrderProductController = require('../controllers/simpleOfflineOrderProductController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

// 所有管理接口都需要认证和授权
router.use(authenticate);
router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.get('/', simpleOfflineOrderProductController.listAllProducts);
router.post('/', simpleOfflineOrderProductController.createProduct);
router.patch('/:id', simpleOfflineOrderProductController.updateProduct);
router.delete('/:id', simpleOfflineOrderProductController.deleteProduct);

module.exports = router;


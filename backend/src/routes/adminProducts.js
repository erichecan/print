// [2025-11-11 23:19:40] 后台商品管理路由
const express = require('express');
const controller = require('../controllers/adminProductController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.archiveProduct);
router.patch('/:id/status', controller.updateProductStatus);

module.exports = router;



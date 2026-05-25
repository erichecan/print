// 线下商品分类管理路由（SALES_MANAGER 和 ADMIN 均可访问）
const express = require('express');
const controller = require('../controllers/offlineOrderCategoryController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.get('/', controller.listCategories);
router.get('/:id', controller.getCategoryById);
router.post('/', controller.createCategory);
router.put('/:id', controller.updateCategory);
router.delete('/:id', controller.archiveCategory);

module.exports = router;

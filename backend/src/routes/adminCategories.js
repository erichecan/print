// [2025-11-11 23:19:56] 后台分类管理路由
const express = require('express');
const controller = require('../controllers/adminCategoryController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listCategories);
router.get('/:id', controller.getCategoryById);
router.post('/', controller.createCategory);
router.put('/:id', controller.updateCategory);
router.delete('/:id', controller.archiveCategory);

module.exports = router;



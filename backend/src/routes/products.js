// 产品路由绑定真实控制器 [2025-11-10 14:05:30]
const express = require('express');
const productController = require('../controllers/productController');

const router = express.Router();

// [2025-11-10 14:05:30] 产品列表
router.get('/', productController.getProducts);

// [2025-11-10 14:05:30] 指定 slug 产品详情
router.get('/:slug', productController.getProductBySlug);

module.exports = router;

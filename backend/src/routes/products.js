// 产品路由绑定真实控制器 [2025-11-10 14:05:30]
const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/productReviewController');
const { authenticateOptional, authenticate } = require('../middleware/auth');

const router = express.Router();

// [2025-01-27 17:00:00] 筛选选项API（必须在 / 之前，避免被 :slug 匹配）
router.get('/filters/options', productController.getFilterOptions);

// [2025-11-10 14:05:30] 产品列表
router.get('/', productController.getProducts);

// [2025-11-12 03:00:00] 相关产品（必须在 :slug 之前）
router.get('/:slug/related', productController.getRelatedProducts);

// [2025-01-27 21:45:00] 产品评价路由（必须在 :slug 之前）
router.get('/:id/reviews', authenticateOptional, reviewController.getProductReviews);
router.post('/:id/reviews', authenticate, reviewController.createProductReview);

// [2025-11-10 14:05:30] 指定 slug 产品详情
router.get('/:slug', productController.getProductBySlug);

module.exports = router;

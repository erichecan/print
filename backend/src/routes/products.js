// 产品路由绑定真实控制器 
const express = require('express');
const productController = require('../controllers/productController');
const reviewController = require('../controllers/productReviewController');
const { authenticateOptional, authenticate } = require('../middleware/auth');

const router = express.Router();

// 筛选选项API（必须在 / 之前，避免被 :slug 匹配）
router.get('/filters/options', productController.getFilterOptions);

// Tag 分类体系（含每个 tag 的产品数量）
router.get('/tag-taxonomy', productController.getTagTaxonomy);

// 产品列表
router.get('/', productController.getProducts);

// 根据 variantId 获取产品基础信息（Design Lab）
router.get('/variant/:variantId', productController.getProductByVariantId);

// 相关产品（必须在 :slug 之前）
router.get('/:slug/related', productController.getRelatedProducts);

// 产品评价路由（必须在 :slug 之前）
router.get('/:id/reviews', authenticateOptional, reviewController.getProductReviews);
router.post('/:id/reviews', authenticate, reviewController.createProductReview);

// 指定 slug 产品详情
router.get('/:slug', productController.getProductBySlug);

module.exports = router;

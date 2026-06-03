/**
 * Public Promotion Routes
* Public routes for promotion queries (no authentication required)
 */
const express = require('express');
const controller = require('../controllers/promotionController');

const router = express.Router();

// 公共促销活动 API，不需要认证
router.get('/', controller.getActivePromotions);
// Batch endpoint — must be before /:productId to avoid route conflicts
router.get('/products', controller.getPromotionsForProducts);
router.get('/product/:productId', controller.getPromotionsForProduct);
router.get('/category/:categoryId', controller.getPromotionsForCategory);
router.post('/calculate', controller.calculatePromotionDiscount);

module.exports = router;


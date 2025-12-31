// Admin promotion routes
// 添加关联管理路由
const express = require('express');
const controller = require('../controllers/adminPromotionController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listPromotions);
router.post('/', controller.createPromotion);
router.put('/:id', controller.updatePromotion);
router.delete('/:id', controller.deletePromotion);

// 商品关联管理
router.post('/:id/products', controller.addProductsToPromotion);
router.delete('/:id/products/:productId', controller.removeProductFromPromotion);

// 类目关联管理
router.post('/:id/categories', controller.addCategoriesToPromotion);
router.delete('/:id/categories/:categoryId', controller.removeCategoryFromPromotion);

// 优惠券关联管理
router.put('/:id/coupon', controller.setPromotionCoupon);

module.exports = router;


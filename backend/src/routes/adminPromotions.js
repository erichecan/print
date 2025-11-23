// [2025-11-15 15:20:00] Admin promotion routes
// [2025-01-28 12:15:00] 添加关联管理路由
const express = require('express');
const controller = require('../controllers/adminPromotionController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listPromotions);
router.post('/', controller.createPromotion);
router.put('/:id', controller.updatePromotion);
router.delete('/:id', controller.deletePromotion);

// [2025-01-28 12:15:00] 商品关联管理
router.post('/:id/products', controller.addProductsToPromotion);
router.delete('/:id/products/:productId', controller.removeProductFromPromotion);

// [2025-01-28 12:15:00] 类目关联管理
router.post('/:id/categories', controller.addCategoriesToPromotion);
router.delete('/:id/categories/:categoryId', controller.removeCategoryFromPromotion);

// [2025-01-28 12:15:00] 优惠券关联管理
router.put('/:id/coupon', controller.setPromotionCoupon);

module.exports = router;


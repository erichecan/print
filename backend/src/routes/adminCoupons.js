// [2025-11-15 15:15:00] Admin coupon routes
const express = require('express');
const controller = require('../controllers/adminCouponController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listCoupons);
router.get('/statistics', controller.getCouponStatistics); // [2025-12-06 17:30:00] Coupon statistics for Issue #138
router.get('/:id/statistics', controller.getCouponDetailStatistics); // [2025-12-06 17:30:00] Coupon detail statistics
router.post('/', controller.createCoupon);
router.put('/:id', controller.updateCoupon);
router.patch('/:id/status', controller.toggleCoupon);
router.delete('/:id', controller.deleteCoupon);

module.exports = router;


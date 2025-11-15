// [2025-11-15 15:15:00] Admin coupon routes
const express = require('express');
const controller = require('../controllers/adminCouponController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listCoupons);
router.post('/', controller.createCoupon);
router.put('/:id', controller.updateCoupon);
router.patch('/:id/status', controller.toggleCoupon);
router.delete('/:id', controller.deleteCoupon);

module.exports = router;


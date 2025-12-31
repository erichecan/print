/**
 * Coupon Routes
* 优惠券路由
 */
const express = require('express');
const router = express.Router();
const { validateCoupon, getActiveCoupons } = require('../controllers/couponController');
const { authenticateOptional } = require('../middleware/auth');

// Public routes
// GET /api/coupons - Get all active coupons
router.get('/', getActiveCoupons);

// POST /api/coupons/validate - Validate coupon code
router.post('/validate', authenticateOptional, validateCoupon);

module.exports = router;


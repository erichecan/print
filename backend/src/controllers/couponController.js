/**
 * Coupon Controller
* 优惠券验证和应用控制器
* 迁移到 Prisma
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * Validate and apply coupon
* 验证和应用优惠券
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, userId } = req.body || {};

    if (!code || !subtotal) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          code: !code ? 'Coupon code is required' : undefined,
          subtotal: !subtotal ? 'Subtotal is required' : undefined,
        },
      });
    }

// Find coupon first to provide specific error messages
    const normalizedCode = code.toUpperCase().trim();
    const coupon = await prisma.coupon.findUnique({
      where: { code: normalizedCode },
    }).catch((err) => {
      logger.error('[couponController] Error finding coupon:', err);
      return null;
    });

    if (!coupon) {
      return res.status(400).json({
        error: 'Invalid coupon code',
      });
    }

    if (!coupon.isActive) {
      return res.status(400).json({
        error: 'This coupon is no longer active',
      });
    }

    const now = new Date();
    if (coupon.startDate > now) {
      return res.status(400).json({
        error: 'Coupon is not yet active',
      });
    }
    if (coupon.endDate < now) {
      return res.status(400).json({
        error: 'Coupon has expired',
      });
    }

// Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        error: 'Coupon has reached its usage limit',
      });
    }

// Check user usage limit (query OrderCoupon table)
    if (userId && coupon.userUsageLimit) {
      const userUsageCount = await prisma.orderCoupon.count({
        where: {
          couponId: coupon.id,
          userId: userId,
        },
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return res.status(400).json({
          error: 'You have already used this coupon the maximum number of times',
        });
      }
    }

// Check minimum order value
// Enhanced validation for Issue #138
    const minOrderValue = coupon.minOrderValue ? Number(coupon.minOrderValue) : null;
    if (minOrderValue && Number(subtotal) < minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value of $${minOrderValue.toFixed(2)} required`,
        minOrderValue: minOrderValue,
      });
    }

// Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (Number(subtotal) * Number(coupon.value)) / 100;
      // Apply max discount limit
      const maxDiscount = coupon.maxDiscount ? Number(coupon.maxDiscount) : null;
      if (maxDiscount && discountAmount > maxDiscount) {
        discountAmount = maxDiscount;
      }
    } else {
      // Fixed discount
      discountAmount = Number(coupon.value);
      // Don't exceed subtotal
      if (discountAmount > Number(subtotal)) {
        discountAmount = Number(subtotal);
      }
    }

    logger.info('[couponController] Coupon validated successfully', {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      subtotal,
      userId: userId || null,
    });

    res.status(200).json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed', // Map enum to string for API compatibility
        value: Number(coupon.value),
        discountAmount: Number(discountAmount.toFixed(2)),
        minOrderValue: minOrderValue,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      },
    });
  } catch (error) {
    logger.error('[couponController] Error validating coupon', {
      error: error.message,
      stack: error.stack,
      code: req.body?.code,
      subtotal: req.body?.subtotal,
    });

    res.status(500).json({
      error: 'Failed to validate coupon',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all active coupons (public)
* 获取所有激活的优惠券
 */
exports.getActiveCoupons = async (req, res) => {
  try {
// Get active coupons using Prisma
    const now = new Date();
    const coupons = await prisma.coupon.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
        minOrderValue: true,
        maxDiscount: true,
        startDate: true,
        endDate: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed', // Map enum to string for API compatibility
        value: Number(coupon.value),
        minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
startDate: coupon.startDate.toISOString().split('T')[0], // Format date as YYYY-MM-DD
        endDate: coupon.endDate.toISOString().split('T')[0],
      })),
    });
  } catch (error) {
    logger.error('Error fetching active coupons', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to fetch coupons',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


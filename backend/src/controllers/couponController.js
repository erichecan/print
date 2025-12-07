/**
 * Coupon Controller
 * [2025-01-27 19:30:00] 优惠券验证和应用控制器
 * [2025-01-28 11:15:00] 迁移到 Prisma
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * Validate and apply coupon
 * [2025-01-27 19:30:00] 验证和应用优惠券
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

    // [2025-01-28 11:15:00] Find active coupon using Prisma
    const now = new Date();
    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase().trim(),
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    }).catch((err) => {
      logger.error('[couponController] Error finding coupon:', err);
      return null;
    });

    if (!coupon) {
      return res.status(404).json({
        error: 'Invalid or expired coupon code',
      });
    }

    // [2025-01-28 11:15:00] Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({
        error: 'Coupon has reached its usage limit',
      });
    }

    // [2025-01-28 11:15:00] Check user usage limit (query OrderCoupon table)
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

    // [2025-01-28 11:15:00] Check minimum order value
    // [2025-12-06 17:30:00] Enhanced validation for Issue #138
    const minOrderValue = coupon.minOrderValue ? Number(coupon.minOrderValue) : null;
    if (minOrderValue && Number(subtotal) < minOrderValue) {
      return res.status(400).json({
        error: `Minimum order value of $${minOrderValue.toFixed(2)} required`,
        minOrderValue: minOrderValue,
      });
    }

    // [2025-12-06 17:30:00] Check if coupon is still within valid date range
    // Note: 'now' is already declared at line 28, no need to redeclare
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

    // [2025-01-28 11:15:00] Calculate discount
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
        type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed', // [2025-01-28 11:15:00] Map enum to string for API compatibility
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
 * [2025-01-27 19:30:00] 获取所有激活的优惠券
 */
exports.getActiveCoupons = async (req, res) => {
  try {
    // [2025-01-28 11:15:00] Get active coupons using Prisma
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
        type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed', // [2025-01-28 11:15:00] Map enum to string for API compatibility
        value: Number(coupon.value),
        minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
        maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
        startDate: coupon.startDate.toISOString().split('T')[0], // [2025-01-28 11:15:00] Format date as YYYY-MM-DD
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


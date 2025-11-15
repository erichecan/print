/**
 * Coupon Controller
 * [2025-01-27 19:30:00] 优惠券验证和应用控制器
 */
const models = require('../models');
const { Coupon, CouponUsage } = models;
const logger = require('../utils/logger');
const { Op } = require('sequelize');

/**
 * Validate and apply coupon
 * [2025-01-27 19:30:00] 验证和应用优惠券
 */
exports.validateCoupon = async (req, res) => {
  try {
    const { code, subtotal, userId } = req.body;

    if (!code || !subtotal) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          code: !code ? 'Coupon code is required' : undefined,
          subtotal: !subtotal ? 'Subtotal is required' : undefined,
        },
      });
    }

    // Find active coupon
    const coupon = await Coupon.findOne({
      where: {
        code: code.toUpperCase().trim(),
        is_active: true,
        start_date: { [Op.lte]: new Date() },
        end_date: { [Op.gte]: new Date() },
      },
    });

    if (!coupon) {
      return res.status(404).json({
        error: 'Invalid or expired coupon code',
      });
    }

    // Check usage limit
    if (coupon.usage_limit && coupon.used_count >= coupon.usage_limit) {
      return res.status(400).json({
        error: 'Coupon has reached its usage limit',
      });
    }

    // Check user usage limit
    if (userId && coupon.user_usage_limit) {
      const userUsageCount = await CouponUsage.count({
        where: {
          coupon_id: coupon.id,
          user_id: userId,
        },
      });

      if (userUsageCount >= coupon.user_usage_limit) {
        return res.status(400).json({
          error: 'You have already used this coupon the maximum number of times',
        });
      }
    }

    // Check minimum order value
    if (coupon.min_order_value && Number(subtotal) < Number(coupon.min_order_value)) {
      return res.status(400).json({
        error: `Minimum order value of $${Number(coupon.min_order_value).toFixed(2)} required`,
        minOrderValue: Number(coupon.min_order_value),
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'percentage') {
      discountAmount = (Number(subtotal) * Number(coupon.value)) / 100;
      // Apply max discount limit
      if (coupon.max_discount && discountAmount > Number(coupon.max_discount)) {
        discountAmount = Number(coupon.max_discount);
      }
    } else {
      // Fixed discount
      discountAmount = Number(coupon.value);
      // Don't exceed subtotal
      if (discountAmount > Number(subtotal)) {
        discountAmount = Number(subtotal);
      }
    }

    logger.info('Coupon validated', {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      discountAmount,
      subtotal,
    });

    res.status(200).json({
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        discountAmount: Number(discountAmount.toFixed(2)),
        minOrderValue: coupon.min_order_value ? Number(coupon.min_order_value) : null,
        maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null,
      },
    });
  } catch (error) {
    logger.error('Error validating coupon', {
      error: error.message,
      stack: error.stack,
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
    const coupons = await Coupon.findAll({
      where: {
        is_active: true,
        start_date: { [Op.lte]: new Date() },
        end_date: { [Op.gte]: new Date() },
      },
      attributes: ['id', 'code', 'type', 'value', 'min_order_value', 'max_discount', 'start_date', 'end_date'],
      order: [['created_at', 'DESC']],
    });

    res.status(200).json({
      coupons: coupons.map((coupon) => ({
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        value: Number(coupon.value),
        minOrderValue: coupon.min_order_value ? Number(coupon.min_order_value) : null,
        maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null,
        startDate: coupon.start_date,
        endDate: coupon.end_date,
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


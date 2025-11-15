/**
 * Admin Coupon Controller
 * [2025-11-15 15:15:00] Coupon CRUD for admin console
 */
const { Op } = require('sequelize');
const { Coupon } = require('../models');

const toDecimal = (value) => (value === undefined || value === null ? null : Number(value));

const mapCoupon = (coupon) => ({
  id: coupon.id,
  code: coupon.code,
  type: coupon.type,
  value: Number(coupon.value),
  minOrderValue: coupon.min_order_value ? Number(coupon.min_order_value) : null,
  maxDiscount: coupon.max_discount ? Number(coupon.max_discount) : null,
  usageLimit: coupon.usage_limit,
  userUsageLimit: coupon.user_usage_limit,
  usedCount: coupon.used_count,
  startDate: coupon.start_date,
  endDate: coupon.end_date,
  isActive: coupon.is_active,
  createdAt: coupon.createdAt,
  updatedAt: coupon.updatedAt,
});

exports.listCoupons = async (req, res) => {
  try {
    const { search, status = 'all' } = req.query;

    const where = {};
    if (search) {
      where.code = { [Op.iLike]: `%${search}%` };
    }
    if (status === 'active') {
      where.is_active = true;
    } else if (status === 'inactive') {
      where.is_active = false;
    }

    const coupons = await Coupon.findAll({
      where,
      order: [['created_at', 'DESC']],
    });

    res.json({
      data: coupons.map(mapCoupon),
    });
  } catch (error) {
    console.error('[adminCouponController] listCoupons error:', error);
    res.status(500).json({ error: 'Failed to load coupons' });
  }
};

exports.createCoupon = async (req, res) => {
  try {
    const {
      code,
      type,
      value,
      minOrderValue,
      maxDiscount,
      usageLimit,
      userUsageLimit,
      startDate,
      endDate,
      isActive = true,
    } = req.body || {};

    if (!code || !type || value === undefined || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase().trim(),
      type,
      value: toDecimal(value),
      min_order_value: toDecimal(minOrderValue),
      max_discount: toDecimal(maxDiscount),
      usage_limit: usageLimit || null,
      user_usage_limit: userUsageLimit || null,
      start_date: startDate,
      end_date: endDate,
      is_active: Boolean(isActive),
    });

    res.status(201).json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] createCoupon error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    await coupon.update({
      ...(payload.code ? { code: payload.code.toUpperCase().trim() } : {}),
      ...(payload.type ? { type: payload.type } : {}),
      ...(payload.value !== undefined ? { value: toDecimal(payload.value) } : {}),
      ...(payload.minOrderValue !== undefined ? { min_order_value: toDecimal(payload.minOrderValue) } : {}),
      ...(payload.maxDiscount !== undefined ? { max_discount: toDecimal(payload.maxDiscount) } : {}),
      ...(payload.usageLimit !== undefined ? { usage_limit: payload.usageLimit || null } : {}),
      ...(payload.userUsageLimit !== undefined ? { user_usage_limit: payload.userUsageLimit || null } : {}),
      ...(payload.startDate ? { start_date: payload.startDate } : {}),
      ...(payload.endDate ? { end_date: payload.endDate } : {}),
    });

    res.json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] updateCoupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

exports.toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    const coupon = await Coupon.findByPk(id);
    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    await coupon.update({ is_active: Boolean(isActive) });

    res.json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] toggleCoupon error:', error);
    res.status(500).json({ error: 'Failed to update coupon status' });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Coupon.destroy({ where: { id } });
    if (!deleted) {
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error('[adminCouponController] deleteCoupon error:', error);
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};


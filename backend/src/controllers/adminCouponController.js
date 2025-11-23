/**
 * Admin Coupon Controller
 * [2025-11-15 15:15:00] Coupon CRUD for admin console
 * [2025-01-28 11:20:00] 迁移到 Prisma
 */
const prisma = require('../lib/prisma');

const toDecimal = (value) => (value === undefined || value === null ? null : Number(value));

// [2025-01-28 11:20:00] Map Prisma coupon to API format
const mapCoupon = (coupon) => ({
  id: coupon.id,
  code: coupon.code,
  type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed', // Map enum to string for API compatibility
  value: Number(coupon.value),
  minOrderValue: coupon.minOrderValue ? Number(coupon.minOrderValue) : null,
  maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
  usageLimit: coupon.usageLimit,
  userUsageLimit: coupon.userUsageLimit,
  usedCount: coupon.usedCount,
  startDate: coupon.startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
  endDate: coupon.endDate.toISOString().split('T')[0],
  isActive: coupon.isActive,
  createdAt: coupon.createdAt.toISOString(),
  updatedAt: coupon.updatedAt.toISOString(),
});

exports.listCoupons = async (req, res) => {
  try {
    const { search, status = 'all' } = req.query;

    // [2025-01-28 11:20:00] Build Prisma where clause
    const where = {};
    if (search) {
      where.code = { contains: search, mode: 'insensitive' };
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
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

    // [2025-01-28 11:20:00] Map type string to enum
    const couponType = type.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';

    // [2025-01-28 11:20:00] Parse dates (expecting YYYY-MM-DD format)
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type: couponType,
        value: toDecimal(value),
        minOrderValue: toDecimal(minOrderValue),
        maxDiscount: toDecimal(maxDiscount),
        usageLimit: usageLimit || null,
        userUsageLimit: userUsageLimit || null,
        startDate: startDateObj,
        endDate: endDateObj,
        isActive: Boolean(isActive),
      },
    });

    res.status(201).json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] createCoupon error:', error);
    // [2025-01-28 11:20:00] Prisma unique constraint error code is P2002
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Coupon code already exists' });
    }
    res.status(500).json({ error: 'Failed to create coupon' });
  }
};

exports.updateCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    // [2025-01-28 11:20:00] Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
    if (!existingCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

    // [2025-01-28 11:20:00] Build update data
    const updateData = {};
    if (payload.code) {
      updateData.code = payload.code.toUpperCase().trim();
    }
    if (payload.type) {
      updateData.type = payload.type.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    }
    if (payload.value !== undefined) {
      updateData.value = toDecimal(payload.value);
    }
    if (payload.minOrderValue !== undefined) {
      updateData.minOrderValue = toDecimal(payload.minOrderValue);
    }
    if (payload.maxDiscount !== undefined) {
      updateData.maxDiscount = toDecimal(payload.maxDiscount);
    }
    if (payload.usageLimit !== undefined) {
      updateData.usageLimit = payload.usageLimit || null;
    }
    if (payload.userUsageLimit !== undefined) {
      updateData.userUsageLimit = payload.userUsageLimit || null;
    }
    if (payload.startDate) {
      updateData.startDate = new Date(payload.startDate);
    }
    if (payload.endDate) {
      updateData.endDate = new Date(payload.endDate);
    }

    const coupon = await prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    res.json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] updateCoupon error:', error);
    if (error.code === 'P2025') {
      // Prisma record not found error
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(500).json({ error: 'Failed to update coupon' });
  }
};

exports.toggleCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    const coupon = await prisma.coupon.update({
      where: { id },
      data: { isActive: Boolean(isActive) },
    });

    res.json({ data: mapCoupon(coupon) });
  } catch (error) {
    console.error('[adminCouponController] toggleCoupon error:', error);
    if (error.code === 'P2025') {
      // Prisma record not found error
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(500).json({ error: 'Failed to update coupon status' });
  }
};

exports.deleteCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.coupon.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    console.error('[adminCouponController] deleteCoupon error:', error);
    if (error.code === 'P2025') {
      // Prisma record not found error
      return res.status(404).json({ error: 'Coupon not found' });
    }
    res.status(500).json({ error: 'Failed to delete coupon' });
  }
};


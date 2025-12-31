/**
 * Admin Coupon Controller
* Coupon CRUD for admin console
* 迁移到 Prisma
 */
const prisma = require('../lib/prisma');

const toDecimal = (value) => (value === undefined || value === null ? null : Number(value));

// Map Prisma coupon to API format
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

// Build Prisma where clause
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

// Map type string to enum
    const couponType = type.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';

// Parse dates (expecting YYYY-MM-DD format)
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
// Prisma unique constraint error code is P2002
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

// Check if coupon exists
    const existingCoupon = await prisma.coupon.findUnique({ where: { id } });
    if (!existingCoupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

// Build update data
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

/**
 * Get coupon statistics
* Coupon statistics for Issue #138
 */
exports.getCouponStatistics = async (req, res) => {
  try {
    const { couponId, startDate, endDate } = req.query;
    const timestamp = new Date().toISOString();

// Build date filter
    const dateFilter = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.lte = new Date(endDate);
    }

// Build coupon filter
    const couponFilter = {};
    if (couponId) {
      couponFilter.couponId = couponId;
    }

// Get overall statistics
    const totalCoupons = await prisma.coupon.count();
    const activeCoupons = await prisma.coupon.count({ where: { isActive: true } });
    const totalUsage = await prisma.orderCoupon.count({
      where: {
        ...couponFilter,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
    });

// Calculate total discount amount
    const orderCoupons = await prisma.orderCoupon.findMany({
      where: {
        ...couponFilter,
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      select: {
        discountAmount: true,
      },
    });

    const totalDiscountAmount = orderCoupons.reduce((sum, oc) => sum + Number(oc.discountAmount), 0);

// Get top used coupons
    const topCoupons = await prisma.orderCoupon.groupBy({
      by: ['couponId'],
      where: {
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      _count: {
        id: true,
      },
      _sum: {
        discountAmount: true,
      },
      orderBy: {
        _count: {
          id: 'desc',
        },
      },
      take: 10,
    });

// Get coupon details for top coupons
    const topCouponDetails = await Promise.all(
      topCoupons.map(async (tc) => {
        const coupon = await prisma.coupon.findUnique({
          where: { id: tc.couponId },
          select: {
            id: true,
            code: true,
            type: true,
            value: true,
            isActive: true,
          },
        });
        return {
          coupon: coupon
            ? {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed',
                value: Number(coupon.value),
                isActive: coupon.isActive,
              }
            : null,
          usageCount: tc._count.id,
          totalDiscount: Number(tc._sum.discountAmount || 0),
        };
      })
    );

// Get usage by date (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const usageByDate = await prisma.orderCoupon.groupBy({
      by: ['createdAt'],
      where: {
        ...couponFilter,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      _count: {
        id: true,
      },
      _sum: {
        discountAmount: true,
      },
    });

// Format usage by date
    const formattedUsageByDate = usageByDate.map((ubd) => ({
      date: ubd.createdAt.toISOString().split('T')[0],
      usageCount: ubd._count.id,
      totalDiscount: Number(ubd._sum.discountAmount || 0),
    }));

    res.json({
      data: {
        overview: {
          totalCoupons,
          activeCoupons,
          inactiveCoupons: totalCoupons - activeCoupons,
          totalUsage,
          totalDiscountAmount: Number(totalDiscountAmount.toFixed(2)),
        },
        topCoupons: topCouponDetails,
        usageByDate: formattedUsageByDate,
      },
    });
  } catch (error) {
    console.error('[adminCouponController] getCouponStatistics error:', error);
    res.status(500).json({ error: 'Failed to load coupon statistics' });
  }
};

/**
 * Get coupon detail statistics
* Get detailed statistics for a specific coupon
 */
exports.getCouponDetailStatistics = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate } = req.query;

// Check if coupon exists
    const coupon = await prisma.coupon.findUnique({
      where: { id },
      include: {
        orderCoupons: {
          where: {
            ...(startDate && endDate
              ? {
                  createdAt: {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                  },
                }
              : {}),
          },
          include: {
            order: {
              select: {
                id: true,
                orderNumber: true,
                total: true,
                createdAt: true,
              },
            },
          },
        },
      },
    });

    if (!coupon) {
      return res.status(404).json({ error: 'Coupon not found' });
    }

// Calculate statistics
    const usageCount = coupon.orderCoupons.length;
    const totalDiscount = coupon.orderCoupons.reduce((sum, oc) => sum + Number(oc.discountAmount), 0);
    const averageDiscount = usageCount > 0 ? totalDiscount / usageCount : 0;

// Get unique users count
    const uniqueUsers = new Set(coupon.orderCoupons.map((oc) => oc.userId).filter(Boolean)).size;

// Get usage by date
    const usageByDate = coupon.orderCoupons.reduce((acc, oc) => {
      const date = oc.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { usageCount: 0, totalDiscount: 0 };
      }
      acc[date].usageCount += 1;
      acc[date].totalDiscount += Number(oc.discountAmount);
      return acc;
    }, {});

    res.json({
      data: {
        coupon: mapCoupon(coupon),
        statistics: {
          usageCount,
          totalDiscount: Number(totalDiscount.toFixed(2)),
          averageDiscount: Number(averageDiscount.toFixed(2)),
          uniqueUsers,
          usageByDate: Object.entries(usageByDate).map(([date, stats]) => ({
            date,
            usageCount: stats.usageCount,
            totalDiscount: Number(stats.totalDiscount.toFixed(2)),
          })),
        },
        recentUsage: coupon.orderCoupons
          .slice(-10)
          .reverse()
          .map((oc) => ({
            orderNumber: oc.order.orderNumber,
            discountAmount: Number(oc.discountAmount),
            orderTotal: Number(oc.order.total),
            usedAt: oc.createdAt.toISOString(),
          })),
      },
    });
  } catch (error) {
    console.error('[adminCouponController] getCouponDetailStatistics error:', error);
    res.status(500).json({ error: 'Failed to load coupon detail statistics' });
  }
};


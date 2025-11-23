/**
 * Admin Promotion Controller
 * [2025-11-15 15:20:00] Manage promotional campaigns
 * [2025-01-28 12:10:00] 迁移到 Prisma
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// [2025-01-28 12:10:00] Map Prisma promotion to API format
const mapPromotion = (promotion) => ({
  id: promotion.id,
  title: promotion.title,
  description: promotion.description,
  bannerImageUrl: promotion.bannerImageUrl,
  linkUrl: promotion.linkUrl,
  // [2025-01-28 12:10:00] 新增折扣相关字段
  discountType: promotion.discountType === 'PERCENTAGE' ? 'percentage' : 'fixed', // Map enum to string
  discountValue: Number(promotion.discountValue),
  minOrderValue: promotion.minOrderValue ? Number(promotion.minOrderValue) : null,
  maxDiscount: promotion.maxDiscount ? Number(promotion.maxDiscount) : null,
  startDate: promotion.startDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
  endDate: promotion.endDate.toISOString().split('T')[0],
  isActive: promotion.isActive,
  sortOrder: promotion.sortOrder,
  createdAt: promotion.createdAt.toISOString(),
  updatedAt: promotion.updatedAt.toISOString(),
  // [2025-01-28 12:10:00] 关联数据
  products: promotion.products?.map((pp) => ({
    id: pp.product.id,
    name: pp.product.name,
    slug: pp.product.slug,
  })) || [],
  categories: promotion.categories?.map((pc) => ({
    id: pc.category.id,
    name: pc.category.name,
    slug: pc.category.slug,
  })) || [],
  coupon: promotion.coupon
    ? {
        id: promotion.coupon.coupon.id,
        code: promotion.coupon.coupon.code,
        type: promotion.coupon.coupon.type === 'PERCENTAGE' ? 'percentage' : 'fixed',
      }
    : null,
});

exports.listPromotions = async (req, res) => {
  try {
    const { search, status = 'all' } = req.query;

    // [2025-01-28 12:10:00] Build Prisma where clause
    const where = {};
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    const promotions = await prisma.promotion.findMany({
      where,
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
      orderBy: [
        { isActive: 'desc' },
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ data: promotions.map(mapPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] listPromotions error:', error);
    res.status(500).json({ error: 'Failed to load promotions' });
  }
};

exports.createPromotion = async (req, res) => {
  try {
    const payload = req.body || {};
    if (!payload.title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // [2025-01-28 12:10:00] 验证必需字段
    if (!payload.discountType || !payload.discountValue || !payload.startDate || !payload.endDate) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: {
          discountType: !payload.discountType ? 'Discount type is required' : undefined,
          discountValue: !payload.discountValue ? 'Discount value is required' : undefined,
          startDate: !payload.startDate ? 'Start date is required' : undefined,
          endDate: !payload.endDate ? 'End date is required' : undefined,
        },
      });
    }

    // [2025-01-28 12:10:00] Map discount type string to enum
    const discountType = payload.discountType.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';

    // [2025-01-28 12:10:00] Parse dates
    const startDate = new Date(payload.startDate);
    const endDate = new Date(payload.endDate);

    const promotion = await prisma.promotion.create({
      data: {
        title: payload.title,
        description: payload.description || null,
        bannerImageUrl: payload.bannerImageUrl || null,
        linkUrl: payload.linkUrl || null,
        discountType: discountType,
        discountValue: Number(payload.discountValue),
        minOrderValue: payload.minOrderValue ? Number(payload.minOrderValue) : null,
        maxDiscount: payload.maxDiscount ? Number(payload.maxDiscount) : null,
        startDate: startDate,
        endDate: endDate,
        isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : true,
        sortOrder: payload.sortOrder ?? 0,
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    res.status(201).json({ data: mapPromotion(promotion) });
  } catch (error) {
    logger.error('[adminPromotionController] createPromotion error:', error);
    res.status(500).json({ error: 'Failed to create promotion' });
  }
};

exports.updatePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = req.body || {};

    // [2025-01-28 12:10:00] Check if promotion exists
    const existingPromotion = await prisma.promotion.findUnique({ where: { id } });
    if (!existingPromotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    // [2025-01-28 12:10:00] Build update data
    const updateData = {};
    if (payload.title !== undefined) {
      updateData.title = payload.title;
    }
    if (payload.description !== undefined) {
      updateData.description = payload.description || null;
    }
    if (payload.bannerImageUrl !== undefined) {
      updateData.bannerImageUrl = payload.bannerImageUrl || null;
    }
    if (payload.linkUrl !== undefined) {
      updateData.linkUrl = payload.linkUrl || null;
    }
    if (payload.discountType !== undefined) {
      updateData.discountType = payload.discountType.toUpperCase() === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED';
    }
    if (payload.discountValue !== undefined) {
      updateData.discountValue = Number(payload.discountValue);
    }
    if (payload.minOrderValue !== undefined) {
      updateData.minOrderValue = payload.minOrderValue ? Number(payload.minOrderValue) : null;
    }
    if (payload.maxDiscount !== undefined) {
      updateData.maxDiscount = payload.maxDiscount ? Number(payload.maxDiscount) : null;
    }
    if (payload.startDate !== undefined) {
      updateData.startDate = new Date(payload.startDate);
    }
    if (payload.endDate !== undefined) {
      updateData.endDate = new Date(payload.endDate);
    }
    if (payload.isActive !== undefined) {
      updateData.isActive = Boolean(payload.isActive);
    }
    if (payload.sortOrder !== undefined) {
      updateData.sortOrder = payload.sortOrder;
    }

    const promotion = await prisma.promotion.update({
      where: { id },
      data: updateData,
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    res.json({ data: mapPromotion(promotion) });
  } catch (error) {
    logger.error('[adminPromotionController] updatePromotion error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.status(500).json({ error: 'Failed to update promotion' });
  }
};

exports.deletePromotion = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.promotion.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    logger.error('[adminPromotionController] deletePromotion error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Promotion not found' });
    }
    res.status(500).json({ error: 'Failed to delete promotion' });
  }
};

// [2025-01-28 12:10:00] 添加商品到促销活动
exports.addProductsToPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body || {};

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ error: 'productIds array is required' });
    }

    // [2025-01-28 12:10:00] Check if promotion exists
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    // [2025-01-28 12:10:00] Create promotion-product associations
    await prisma.promotionProduct.createMany({
      data: productIds.map((productId) => ({
        promotionId: id,
        productId: productId,
      })),
      skipDuplicates: true, // Skip if already exists
    });

    // [2025-01-28 12:10:00] Return updated promotion
    const updatedPromotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    res.json({ data: mapPromotion(updatedPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] addProductsToPromotion error:', error);
    res.status(500).json({ error: 'Failed to add products to promotion' });
  }
};

// [2025-01-28 12:10:00] 从促销活动移除商品
exports.removeProductFromPromotion = async (req, res) => {
  try {
    const { id, productId } = req.params;

    await prisma.promotionProduct.deleteMany({
      where: {
        promotionId: id,
        productId: productId,
      },
    });

    // [2025-01-28 12:10:00] Return updated promotion
    const updatedPromotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    if (!updatedPromotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ data: mapPromotion(updatedPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] removeProductFromPromotion error:', error);
    res.status(500).json({ error: 'Failed to remove product from promotion' });
  }
};

// [2025-01-28 12:10:00] 添加类目到促销活动
exports.addCategoriesToPromotion = async (req, res) => {
  try {
    const { id } = req.params;
    const { categoryIds } = req.body || {};

    if (!categoryIds || !Array.isArray(categoryIds) || categoryIds.length === 0) {
      return res.status(400).json({ error: 'categoryIds array is required' });
    }

    // [2025-01-28 12:10:00] Check if promotion exists
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    // [2025-01-28 12:10:00] Create promotion-category associations
    await prisma.promotionCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        promotionId: id,
        categoryId: categoryId,
      })),
      skipDuplicates: true, // Skip if already exists
    });

    // [2025-01-28 12:10:00] Return updated promotion
    const updatedPromotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    res.json({ data: mapPromotion(updatedPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] addCategoriesToPromotion error:', error);
    res.status(500).json({ error: 'Failed to add categories to promotion' });
  }
};

// [2025-01-28 12:10:00] 从促销活动移除类目
exports.removeCategoryFromPromotion = async (req, res) => {
  try {
    const { id, categoryId } = req.params;

    await prisma.promotionCategory.deleteMany({
      where: {
        promotionId: id,
        categoryId: categoryId,
      },
    });

    // [2025-01-28 12:10:00] Return updated promotion
    const updatedPromotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    if (!updatedPromotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    res.json({ data: mapPromotion(updatedPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] removeCategoryFromPromotion error:', error);
    res.status(500).json({ error: 'Failed to remove category from promotion' });
  }
};

// [2025-01-28 12:10:00] 设置促销活动关联的优惠券
exports.setPromotionCoupon = async (req, res) => {
  try {
    const { id } = req.params;
    const { couponId } = req.body || {};

    // [2025-01-28 12:10:00] Check if promotion exists
    const promotion = await prisma.promotion.findUnique({ where: { id } });
    if (!promotion) {
      return res.status(404).json({ error: 'Promotion not found' });
    }

    // [2025-01-28 12:10:00] If couponId is null, remove the association
    if (!couponId) {
      await prisma.promotionCoupon.deleteMany({
        where: { promotionId: id },
      });
    } else {
      // [2025-01-28 12:10:00] Check if coupon exists
      const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
      if (!coupon) {
        return res.status(404).json({ error: 'Coupon not found' });
      }

      // [2025-01-28 12:10:00] Upsert promotion-coupon association
      await prisma.promotionCoupon.upsert({
        where: { promotionId: id },
        update: { couponId: couponId },
        create: {
          promotionId: id,
          couponId: couponId,
        },
      });
    }

    // [2025-01-28 12:10:00] Return updated promotion
    const updatedPromotion = await prisma.promotion.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: true,
          },
        },
        categories: {
          include: {
            category: true,
          },
        },
        coupon: {
          include: {
            coupon: true,
          },
        },
      },
    });

    res.json({ data: mapPromotion(updatedPromotion) });
  } catch (error) {
    logger.error('[adminPromotionController] setPromotionCoupon error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Coupon is already associated with another promotion' });
    }
    res.status(500).json({ error: 'Failed to set promotion coupon' });
  }
};


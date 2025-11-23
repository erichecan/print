/**
 * Promotion Controller
 * [2025-01-28 12:15:00] 促销活动公共 API（供前端使用）
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// [2025-01-28 12:15:00] Map Prisma promotion to API format
const mapPromotion = (promotion) => ({
  id: promotion.id,
  title: promotion.title,
  description: promotion.description,
  bannerImageUrl: promotion.bannerImageUrl,
  linkUrl: promotion.linkUrl,
  discountType: promotion.discountType === 'PERCENTAGE' ? 'percentage' : 'fixed',
  discountValue: Number(promotion.discountValue),
  minOrderValue: promotion.minOrderValue ? Number(promotion.minOrderValue) : null,
  maxDiscount: promotion.maxDiscount ? Number(promotion.maxDiscount) : null,
  startDate: promotion.startDate.toISOString().split('T')[0],
  endDate: promotion.endDate.toISOString().split('T')[0],
  isActive: promotion.isActive,
  sortOrder: promotion.sortOrder,
});

/**
 * Get all active promotions
 * GET /api/promotions
 * [2025-01-28 12:15:00] 获取所有活跃的促销活动
 */
exports.getActivePromotions = async (req, res) => {
  try {
    const now = new Date();
    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ promotions: promotions.map(mapPromotion) });
  } catch (error) {
    logger.error('[promotionController] getActivePromotions error:', error);
    res.status(500).json({ error: 'Failed to fetch promotions' });
  }
};

/**
 * Get promotions for a specific product
 * GET /api/promotions/product/:productId
 * [2025-01-28 12:15:00] 获取指定商品的促销活动
 */
exports.getPromotionsForProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const now = new Date();

    // [2025-01-28 12:15:00] Find promotions that include this product directly
    const productPromotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        products: {
          some: {
            productId: productId,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // [2025-01-28 12:15:00] Find promotions that include this product's category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    });

    let categoryPromotions = [];
    if (product?.categoryId) {
      categoryPromotions = await prisma.promotion.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          categories: {
            some: {
              categoryId: product.categoryId,
            },
          },
        },
        orderBy: [
          { sortOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      });
    }

    // [2025-01-28 12:15:00] Merge and deduplicate promotions (prefer product-specific over category)
    const allPromotions = [...productPromotions];
    const productPromotionIds = new Set(productPromotions.map((p) => p.id));
    categoryPromotions.forEach((promo) => {
      if (!productPromotionIds.has(promo.id)) {
        allPromotions.push(promo);
      }
    });

    // [2025-01-28 12:15:00] Sort by discount value (highest first) to get the best promotion
    allPromotions.sort((a, b) => {
      const aValue = a.discountType === 'PERCENTAGE' ? a.discountValue : a.discountValue;
      const bValue = b.discountType === 'PERCENTAGE' ? b.discountValue : b.discountValue;
      return bValue - aValue;
    });

    res.json({ promotions: allPromotions.map(mapPromotion) });
  } catch (error) {
    logger.error('[promotionController] getPromotionsForProduct error:', error);
    res.status(500).json({ error: 'Failed to fetch promotions for product' });
  }
};

/**
 * Get promotions for a specific category
 * GET /api/promotions/category/:categoryId
 * [2025-01-28 12:15:00] 获取指定类目的促销活动
 */
exports.getPromotionsForCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const now = new Date();

    const promotions = await prisma.promotion.findMany({
      where: {
        isActive: true,
        startDate: { lte: now },
        endDate: { gte: now },
        categories: {
          some: {
            categoryId: categoryId,
          },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    res.json({ promotions: promotions.map(mapPromotion) });
  } catch (error) {
    logger.error('[promotionController] getPromotionsForCategory error:', error);
    res.status(500).json({ error: 'Failed to fetch promotions for category' });
  }
};

/**
 * Calculate promotion discount for cart items
 * POST /api/promotions/calculate
 * [2025-01-28 12:15:00] 计算促销活动折扣（供结算使用）
 */
exports.calculatePromotionDiscount = async (req, res) => {
  try {
    const { items, subtotal } = req.body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.json({ discount: 0, promotions: [] });
    }

    const now = new Date();
    let totalDiscount = 0;
    const appliedPromotions = [];

    // [2025-01-28 12:15:00] For each cart item, find the best promotion
    for (const item of items) {
      const { productId, quantity, unitPrice } = item;

      // [2025-01-28 12:15:00] Get promotions for this product
      const productPromotions = await prisma.promotion.findMany({
        where: {
          isActive: true,
          startDate: { lte: now },
          endDate: { gte: now },
          OR: [
            {
              products: {
                some: {
                  productId: productId,
                },
              },
            },
            {
              categories: {
                some: {
                  category: {
                    products: {
                      some: {
                        id: productId,
                      },
                    },
                  },
                },
              },
            },
          ],
        },
        include: {
          products: {
            where: { productId: productId },
          },
          categories: {
            include: {
              category: {
                include: {
                  products: {
                    where: { id: productId },
                  },
                },
              },
            },
          },
        },
      });

      if (productPromotions.length === 0) {
        continue;
      }

      // [2025-01-28 12:15:00] Select the promotion with the highest discount
      let bestPromotion = null;
      let bestDiscount = 0;

      for (const promotion of productPromotions) {
        // [2025-01-28 12:15:00] Check minimum order value
        if (promotion.minOrderValue && subtotal < Number(promotion.minOrderValue)) {
          continue;
        }

        // [2025-01-28 12:15:00] Calculate discount for this item
        let itemDiscount = 0;
        const itemSubtotal = Number(unitPrice) * quantity;

        if (promotion.discountType === 'PERCENTAGE') {
          itemDiscount = (itemSubtotal * Number(promotion.discountValue)) / 100;
          // Apply max discount limit
          if (promotion.maxDiscount && itemDiscount > Number(promotion.maxDiscount)) {
            itemDiscount = Number(promotion.maxDiscount);
          }
        } else {
          // Fixed discount per item
          itemDiscount = Number(promotion.discountValue) * quantity;
          // Don't exceed item subtotal
          if (itemDiscount > itemSubtotal) {
            itemDiscount = itemSubtotal;
          }
        }

        if (itemDiscount > bestDiscount) {
          bestDiscount = itemDiscount;
          bestPromotion = promotion;
        }
      }

      if (bestPromotion && bestDiscount > 0) {
        totalDiscount += bestDiscount;
        appliedPromotions.push({
          promotionId: bestPromotion.id,
          promotionTitle: bestPromotion.title,
          productId: productId,
          discountAmount: Math.round(bestDiscount * 100) / 100,
        });
      }
    }

    res.json({
      discount: Math.round(totalDiscount * 100) / 100,
      promotions: appliedPromotions,
    });
  } catch (error) {
    logger.error('[promotionController] calculatePromotionDiscount error:', error);
    res.status(500).json({ error: 'Failed to calculate promotion discount' });
  }
};


/**
 * Promotion Controller
 * [2025-01-28 12:15:00] 促销活动公共 API（供前端使用）
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// [2025-01-28 12:15:00] Map Prisma promotion to API format
// [2025-11-29 20:10:00] 添加安全检查，处理可能的 null/undefined 值
const mapPromotion = (promotion) => {
  if (!promotion) {
    return null;
  }
  return {
    id: promotion.id,
    title: promotion.title || '',
    description: promotion.description || null,
    bannerImageUrl: promotion.bannerImageUrl || null,
    linkUrl: promotion.linkUrl || null,
    discountType: promotion.discountType === 'PERCENTAGE' ? 'percentage' : 'fixed',
    discountValue: promotion.discountValue ? Number(promotion.discountValue) : 0,
    minOrderValue: promotion.minOrderValue ? Number(promotion.minOrderValue) : null,
    maxDiscount: promotion.maxDiscount ? Number(promotion.maxDiscount) : null,
    startDate: promotion.startDate && promotion.startDate.toISOString ? promotion.startDate.toISOString().split('T')[0] : null,
    endDate: promotion.endDate && promotion.endDate.toISOString ? promotion.endDate.toISOString().split('T')[0] : null,
    isActive: promotion.isActive ?? true,
    sortOrder: promotion.sortOrder ?? 0,
  };
};

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
    
    if (!productId) {
      return res.status(400).json({ error: 'Product ID is required' });
    }

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
    }).catch((err) => {
      logger.error('[promotionController] Error fetching product promotions:', err);
      return [];
    });

    // [2025-01-28 12:15:00] Find promotions that include this product's category
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { category: true },
    }).catch((err) => {
      logger.error('[promotionController] Error fetching product:', err);
      return null;
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
      }).catch((err) => {
        logger.error('[promotionController] Error fetching category promotions:', err);
        return [];
      });
    }

    // [2025-01-28 12:15:00] Merge and deduplicate promotions (prefer product-specific over category)
    const allPromotions = [...(productPromotions || [])];
    const productPromotionIds = new Set((productPromotions || []).map((p) => p.id));
    (categoryPromotions || []).forEach((promo) => {
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

    // [2025-11-29 20:10:00] 安全地映射促销活动，处理可能的 null/undefined
    const mappedPromotions = allPromotions
      .filter((p) => p != null) // 过滤掉 null/undefined
      .map((p) => {
        try {
          return mapPromotion(p);
        } catch (mapError) {
          logger.warn('[promotionController] Error mapping promotion:', {
            promotionId: p?.id,
            error: mapError.message,
          });
          return null;
        }
      })
      .filter((p) => p != null); // 过滤掉映射失败的项目

    res.json({ promotions: mappedPromotions });
  } catch (error) {
    logger.error('[promotionController] getPromotionsForProduct error:', {
      error: error.message,
      stack: error.stack,
      productId: req.params?.productId,
    });
    // [2025-11-29 20:10:00] 即使出错也返回空数组而不是 500，避免影响前端功能
    res.json({ promotions: [] });
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


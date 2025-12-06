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
    let promotions = [];
    try {
      promotions = await prisma.promotion.findMany({
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
    } catch (err) {
      logger.error('[promotionController] Error fetching active promotions:', {
        error: err.message,
        stack: err.stack,
      });
      promotions = [];
    }

    // [2025-11-29 20:20:00] 安全地映射促销活动
    const mappedPromotions = promotions
      .filter((p) => p != null)
      .map((p) => {
        try {
          return mapPromotion(p);
        } catch (mapError) {
          logger.warn('[promotionController] Error mapping promotion in getActivePromotions:', {
            promotionId: p?.id,
            error: mapError.message,
          });
          return null;
        }
      })
      .filter((p) => p != null);

    return res.json({ promotions: mappedPromotions });
  } catch (error) {
    logger.error('[promotionController] getActivePromotions error:', {
      error: error.message,
      stack: error.stack,
    });
    // [2025-11-29 20:20:00] 即使出错也返回空数组而不是 500
    return res.json({ promotions: [] });
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

    logger.info('[promotionController] getPromotionsForProduct called', { productId });

    const now = new Date();

    // [2025-01-28 12:15:00] Find promotions that include this product directly
    // [2025-11-29 20:15:00] 修复 Prisma 查询语法，使用正确的嵌套关系查询
    let productPromotions = [];
    try {
      productPromotions = await prisma.promotion.findMany({
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
      logger.info('[promotionController] Product promotions fetched', { 
        productId, 
        count: productPromotions?.length || 0 
      });
    } catch (err) {
      logger.error('[promotionController] Error fetching product promotions:', {
        error: err.message,
        stack: err.stack,
        productId,
      });
      productPromotions = [];
    }

    // [2025-01-28 12:15:00] Find promotions that include this product's category
    let product = null;
    try {
      product = await prisma.product.findUnique({
        where: { id: productId },
        include: { category: true },
      });
      logger.info('[promotionController] Product fetched', { 
        productId, 
        hasProduct: !!product,
        categoryId: product?.categoryId || null,
      });
    } catch (err) {
      logger.error('[promotionController] Error fetching product:', {
        error: err.message,
        stack: err.stack,
        productId,
      });
      product = null;
    }

    let categoryPromotions = [];
    if (product?.categoryId) {
      try {
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
        logger.info('[promotionController] Category promotions fetched', { 
          categoryId: product.categoryId, 
          count: categoryPromotions?.length || 0 
        });
      } catch (err) {
        logger.error('[promotionController] Error fetching category promotions:', {
          error: err.message,
          stack: err.stack,
          categoryId: product.categoryId,
        });
        categoryPromotions = [];
      }
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
    let mappedPromotions = [];
    try {
      mappedPromotions = allPromotions
        .filter((p) => p != null) // 过滤掉 null/undefined
        .map((p) => {
          try {
            return mapPromotion(p);
          } catch (mapError) {
            logger.warn('[promotionController] Error mapping promotion:', {
              promotionId: p?.id,
              error: mapError.message,
              stack: mapError.stack,
            });
            return null;
          }
        })
        .filter((p) => p != null); // 过滤掉映射失败的项目
      
      logger.info('[promotionController] Promotions mapped successfully', { 
        productId, 
        count: mappedPromotions.length 
      });
    } catch (mapError) {
      logger.error('[promotionController] Error mapping all promotions:', {
        error: mapError.message,
        stack: mapError.stack,
        productId,
      });
      mappedPromotions = [];
    }

    return res.json({ promotions: mappedPromotions });
  } catch (error) {
    logger.error('[promotionController] getPromotionsForProduct error:', {
      error: error.message,
      stack: error.stack,
      productId: req.params?.productId,
    });
    // [2025-11-29 20:10:00] 即使出错也返回空数组而不是 500，避免影响前端功能
    return res.json({ promotions: [] });
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

    let promotions = [];
    try {
      promotions = await prisma.promotion.findMany({
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
    } catch (err) {
      logger.error('[promotionController] Error fetching category promotions:', {
        error: err.message,
        stack: err.stack,
        categoryId,
      });
      promotions = [];
    }

    // [2025-11-29 20:20:00] 安全地映射促销活动
    const mappedPromotions = promotions
      .filter((p) => p != null)
      .map((p) => {
        try {
          return mapPromotion(p);
        } catch (mapError) {
          logger.warn('[promotionController] Error mapping promotion in getPromotionsForCategory:', {
            promotionId: p?.id,
            error: mapError.message,
          });
          return null;
        }
      })
      .filter((p) => p != null);

    return res.json({ promotions: mappedPromotions });
  } catch (error) {
    logger.error('[promotionController] getPromotionsForCategory error:', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params?.categoryId,
    });
    // [2025-11-29 20:20:00] 即使出错也返回空数组而不是 500
    return res.json({ promotions: [] });
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
      // [2025-11-29 20:25:00] 简化查询逻辑，与 getPromotionsForProduct 保持一致
      // 首先获取产品的 categoryId
      let categoryId = null;
      try {
        const product = await prisma.product.findUnique({
          where: { id: productId },
          select: { categoryId: true },
        });
        categoryId = product?.categoryId || null;
      } catch (err) {
        logger.warn('[promotionController] Error fetching product for category:', {
          error: err.message,
          productId,
        });
      }

      // 查询促销活动：产品直接关联或通过类目关联
      let productPromotions = [];
      try {
        const orConditions = [
          {
            products: {
              some: {
                productId: productId,
              },
            },
          },
        ];

        // 如果产品有类目，也查询类目关联的促销
        if (categoryId) {
          orConditions.push({
            categories: {
              some: {
                categoryId: categoryId,
              },
            },
          });
        }

        productPromotions = await prisma.promotion.findMany({
          where: {
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now },
            OR: orConditions,
          },
        });
      } catch (err) {
        logger.error('[promotionController] Error fetching promotions in calculatePromotionDiscount:', {
          error: err.message,
          stack: err.stack,
          productId,
          categoryId,
        });
        continue; // 跳过这个产品，继续处理下一个
      }

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
        // [2025-12-06 18:00:00] Support buy-get-free promotions for Issue #139
        let itemDiscount = 0;
        const itemSubtotal = Number(unitPrice) * quantity;

        if (promotion.discountType === 'PERCENTAGE') {
          itemDiscount = (itemSubtotal * Number(promotion.discountValue)) / 100;
          // Apply max discount limit
          if (promotion.maxDiscount && itemDiscount > Number(promotion.maxDiscount)) {
            itemDiscount = Number(promotion.maxDiscount);
          }
        } else if (promotion.discountType === 'BUY_GET_FREE') {
          // [2025-12-06 18:00:00] Buy X Get Y Free: Calculate free items discount
          const buyQty = promotion.buyQuantity || 1;
          const getQty = promotion.getQuantity || 1;
          
          // Calculate how many "buy-get-free" sets can be applied
          const sets = Math.floor(quantity / (buyQty + getQty));
          const freeItems = sets * getQty;
          
          // Discount is the value of free items
          itemDiscount = freeItems * Number(unitPrice);
          
          // Don't exceed item subtotal
          if (itemDiscount > itemSubtotal) {
            itemDiscount = itemSubtotal;
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
          // [2025-12-06 18:00:00] Include buy-get-free promotion details for Issue #139
          promotionType: bestPromotion.discountType,
          buyQuantity: bestPromotion.buyQuantity,
          getQuantity: bestPromotion.getQuantity,
          giftProductId: bestPromotion.giftProductId,
          giftVariantId: bestPromotion.giftVariantId,
        });
      }
    }

    return res.json({
      discount: Math.round(totalDiscount * 100) / 100,
      promotions: appliedPromotions,
    });
  } catch (error) {
    logger.error('[promotionController] calculatePromotionDiscount error:', {
      error: error.message,
      stack: error.stack,
    });
    // [2025-11-29 20:25:00] 即使出错也返回空折扣，避免影响结账流程
    return res.json({ discount: 0, promotions: [] });
  }
};


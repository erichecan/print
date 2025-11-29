/**
 * Inventory Service
 * [2025-01-27 13:30:00] Inventory management service
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError } = require('../utils/errors');

/**
 * Low stock threshold (configurable via env)
 * [2025-01-27 13:30:00]
 */
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 10;

/**
 * Decrease inventory for order items
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function decreaseInventory(orderItems) {
  try {
    const results = await prisma.$transaction(
      orderItems.map((item) =>
        prisma.variant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              decrement: item.quantity,
            },
          },
          select: {
            id: true,
            sku: true,
            stockQuantity: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        })
      )
    );

    // Check for negative inventory (shouldn't happen if validation is correct)
    const negativeStock = results.filter((variant) => variant.stockQuantity < 0);
    if (negativeStock.length > 0) {
      logger.warn('Negative inventory detected after decrease', {
        variants: negativeStock.map((v) => ({
          sku: v.sku,
          stockQuantity: v.stockQuantity,
        })),
      });
    }

    logger.info('Inventory decreased', {
      itemsProcessed: results.length,
      variants: results.map((v) => ({
        sku: v.sku,
        newStock: v.stockQuantity,
      })),
    });

    return results;
  } catch (error) {
    logger.error('Error decreasing inventory:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Increase inventory (restore stock)
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function increaseInventory(orderItems) {
  try {
    const results = await prisma.$transaction(
      orderItems.map((item) =>
        prisma.variant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
          select: {
            id: true,
            sku: true,
            stockQuantity: true,
            product: {
              select: {
                name: true,
              },
            },
          },
        })
      )
    );

    logger.info('Inventory increased (restored)', {
      itemsProcessed: results.length,
      variants: results.map((v) => ({
        sku: v.sku,
        newStock: v.stockQuantity,
      })),
    });

    return results;
  } catch (error) {
    logger.error('Error increasing inventory:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Check if variant has sufficient stock
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function checkStockAvailability(variantId, requestedQuantity) {
  const variant = await prisma.variant.findUnique({
    where: { id: variantId },
    select: {
      id: true,
      sku: true,
      stockQuantity: true,
      product: {
        select: {
          name: true,
          isActive: true,
        },
      },
    },
  });

  if (!variant) {
    throw new BadRequestError('Product variant not found');
  }

  if (!variant.product.isActive) {
    throw new BadRequestError('Product is not active');
  }

  const available = variant.stockQuantity;
  const sufficient = available >= requestedQuantity;

  return {
    available,
    requested: requestedQuantity,
    sufficient,
    variant: {
      id: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
    },
  };
}

/**
 * Check stock availability for multiple items
 * [2025-01-27 13:30:00]
 */
async function checkMultipleStockAvailability(items) {
  const checks = await Promise.all(
    items.map((item) => checkStockAvailability(item.variantId, item.quantity))
  );

  const insufficient = checks.filter((check) => !check.sufficient);
  const allSufficient = insufficient.length === 0;

  return {
    allSufficient,
    checks,
    insufficient,
  };
}

/**
 * Get low stock products
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
  try {
    const lowStockVariants = await prisma.variant.findMany({
      where: {
        stockQuantity: {
          lte: threshold,
        },
        product: {
          isActive: true,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        stockQuantity: 'asc',
      },
    });

    logger.info('Low stock products retrieved', {
      threshold,
      count: lowStockVariants.length,
    });

    return lowStockVariants.map((variant) => ({
      variantId: variant.id,
      sku: variant.sku,
      productId: variant.productId,
      productName: variant.product.name,
      productSku: variant.product.sku,
      currentStock: variant.stockQuantity,
      threshold,
      isOutOfStock: variant.stockQuantity === 0,
    }));
  } catch (error) {
    logger.error('Error getting low stock products:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get out of stock products
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function getOutOfStockProducts() {
  try {
    const outOfStockVariants = await prisma.variant.findMany({
      where: {
        stockQuantity: {
          lte: 0,
        },
        product: {
          isActive: true,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isActive: true,
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });

    return outOfStockVariants.map((variant) => ({
      variantId: variant.id,
      sku: variant.sku,
      productId: variant.productId,
      productName: variant.product.name,
      productSku: variant.product.sku,
      currentStock: variant.stockQuantity,
    }));
  } catch (error) {
    logger.error('Error getting out of stock products:', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Update variant stock quantity
 * [2025-01-27 13:30:00]
 */
// [2025-01-28 23:40:00] 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function updateStockQuantity(variantId, newQuantity) {
  try {
    const variant = await prisma.variant.update({
      where: { id: variantId },
      data: {
        stockQuantity: Math.max(0, newQuantity), // Ensure non-negative
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info('Stock quantity updated', {
      variantId,
      sku: variant.sku,
      newQuantity: variant.stockQuantity,
      productName: variant.product.name,
    });

    return variant;
  } catch (error) {
    logger.error('Error updating stock quantity:', {
      error: error.message,
      variantId,
    });
    throw error;
  }
}

module.exports = {
  decreaseInventory,
  increaseInventory,
  checkStockAvailability,
  checkMultipleStockAvailability,
  getLowStockProducts,
  getOutOfStockProducts,
  updateStockQuantity,
  LOW_STOCK_THRESHOLD,
};



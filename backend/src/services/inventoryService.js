/**
 * Inventory Service
* Inventory management service
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError } = require('../utils/errors');

/**
 * Low stock threshold (configurable via env)
 */
const LOW_STOCK_THRESHOLD = parseInt(process.env.LOW_STOCK_THRESHOLD) || 10;

/**
 * Decrease inventory for order items
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
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

// Check for low stock alerts after inventory decrease
    try {
      await checkAndSendLowStockAlerts(results);
    } catch (alertError) {
      // Don't fail inventory decrease if alert check fails
      logger.warn('Failed to check low stock alerts', {
        error: alertError.message,
      });
    }

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
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
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
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
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
* Enhanced with per-variant threshold support
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
async function getLowStockProducts(threshold = LOW_STOCK_THRESHOLD) {
  try {
// Get all active variants and filter by threshold
    // Variants with custom threshold use that, others use global threshold
    const allVariants = await prisma.variant.findMany({
      where: {
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

// Filter variants that are below their threshold
    const lowStockVariants = allVariants.filter((variant) => {
      const variantThreshold = variant.lowStockThreshold ?? threshold;
      return variant.stockQuantity <= variantThreshold;
    });

    logger.info('Low stock products retrieved', {
      threshold,
      count: lowStockVariants.length,
    });

    return lowStockVariants.map((variant) => {
      const variantThreshold = variant.lowStockThreshold ?? threshold;
      return {
        variantId: variant.id,
        sku: variant.sku,
        productId: variant.productId,
        productName: variant.product.name,
        productSku: variant.product.sku,
        currentStock: variant.stockQuantity,
        threshold: variantThreshold,
        isOutOfStock: variant.stockQuantity === 0,
        hasCustomThreshold: variant.lowStockThreshold !== null,
      };
    });
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
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
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
 */
// 修复：使用正确的 Prisma 模型名 Variant（不是 productVariant）
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

/**
 * Check and send low stock alerts for variants
* Check if variants are below threshold and send alerts
 */
async function checkAndSendLowStockAlerts(variants) {
  const timestamp = new Date().toISOString();
  try {
    const { sendLowStockAlert } = require('./emailService');
    const alerts = [];

    for (const variant of variants) {
      // Get variant with threshold info
      const fullVariant = await prisma.variant.findUnique({
        where: { id: variant.id },
        include: {
          product: {
            select: {
              name: true,
              sku: true,
            },
          },
        },
      });

      if (!fullVariant) continue;

      const threshold = fullVariant.lowStockThreshold ?? LOW_STOCK_THRESHOLD;
      if (fullVariant.stockQuantity <= threshold) {
        alerts.push({
          variant: fullVariant,
          threshold,
        });
      }
    }

    if (alerts.length > 0) {
      // Send alerts (don't fail if email fails)
      for (const alert of alerts) {
        try {
          await sendLowStockAlert(alert.variant, alert.threshold);
        } catch (emailError) {
          logger.warn('Failed to send low stock alert email', {
            timestamp,
            variantId: alert.variant.id,
            sku: alert.variant.sku,
            error: emailError.message,
          });
        }
      }

      logger.info('Low stock alerts processed', {
        timestamp,
        alertsCount: alerts.length,
      });
    }
  } catch (error) {
    logger.error('Error checking low stock alerts', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    // Don't throw - alert checking shouldn't fail inventory operations
  }
}

/**
 * Update low stock threshold for a variant
* Set custom threshold for a variant
 */
async function updateLowStockThreshold(variantId, threshold) {
  const timestamp = new Date().toISOString();
  try {
    const variant = await prisma.variant.update({
      where: { id: variantId },
      data: {
        lowStockThreshold: threshold !== null && threshold !== undefined ? threshold : null,
      },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    logger.info('Low stock threshold updated', {
      timestamp,
      variantId,
      sku: variant.sku,
      threshold: variant.lowStockThreshold,
      productName: variant.product.name,
    });

    return variant;
  } catch (error) {
    logger.error('Error updating low stock threshold', {
      timestamp,
      variantId,
      error: error.message,
      stack: error.stack,
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
  updateLowStockThreshold,
  checkAndSendLowStockAlerts,
  LOW_STOCK_THRESHOLD,
};



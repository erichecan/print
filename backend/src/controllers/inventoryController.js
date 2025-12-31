/**
 * Inventory Controller
* Inventory management API endpoints
* Enhanced with low stock alerts and threshold management
 */
const {
  getLowStockProducts,
  getOutOfStockProducts,
  updateLowStockThreshold,
  LOW_STOCK_THRESHOLD,
} = require('../services/inventoryService');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');

/**
 * GET /api/admin/products/low-stock - Get low stock products
* Enhanced with unified error handling
 */
exports.getLowStockProducts = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : undefined;

    const lowStockProducts = await getLowStockProducts(threshold);

    res.json({
      products: lowStockProducts,
      count: lowStockProducts.length,
      threshold: threshold || LOW_STOCK_THRESHOLD,
    });
  } catch (error) {
    logger.error('Error getting low stock products', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('获取低库存产品列表失败，请稍后重试'));
  }
};

/**
 * GET /api/admin/products/out-of-stock - Get out of stock products
* Enhanced with unified error handling
 */
exports.getOutOfStockProducts = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const outOfStockProducts = await getOutOfStockProducts();

    res.json({
      products: outOfStockProducts,
      count: outOfStockProducts.length,
    });
  } catch (error) {
    logger.error('Error getting out of stock products', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('获取缺货产品列表失败，请稍后重试'));
  }
};

/**
 * PATCH /api/admin/products/variants/:id/low-stock-threshold - Update low stock threshold for a variant
* Set custom threshold for a variant
 */
exports.updateLowStockThreshold = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { threshold } = req.body;

    // Validate threshold if provided
    if (threshold !== null && threshold !== undefined) {
      if (typeof threshold !== 'number' || threshold < 0) {
        return next(new BadRequestError('预警阈值必须是非负整数', { threshold }));
      }
    }

    // Check if variant exists
    const variant = await prisma.variant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!variant) {
      return next(new NotFoundError('产品变体不存在'));
    }

    // Update threshold
    const updatedVariant = await updateLowStockThreshold(id, threshold);

    res.json({
      id: updatedVariant.id,
      sku: updatedVariant.sku,
      productName: updatedVariant.product.name,
      lowStockThreshold: updatedVariant.lowStockThreshold,
      currentStock: updatedVariant.stockQuantity,
    });
  } catch (error) {
    logger.error('Error updating low stock threshold', {
      timestamp,
      variantId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('更新预警阈值失败，请稍后重试'));
  }
};

/**
 * GET /api/admin/products/variants/:id/low-stock-threshold - Get low stock threshold for a variant
* Get threshold for a variant
 */
exports.getLowStockThreshold = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    const variant = await prisma.variant.findUnique({
      where: { id },
      include: {
        product: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!variant) {
      return next(new NotFoundError('产品变体不存在'));
    }

    res.json({
      variantId: variant.id,
      sku: variant.sku,
      productName: variant.product.name,
      lowStockThreshold: variant.lowStockThreshold,
      currentStock: variant.stockQuantity,
      effectiveThreshold: variant.lowStockThreshold ?? LOW_STOCK_THRESHOLD,
    });
  } catch (error) {
    logger.error('Error getting low stock threshold', {
      timestamp,
      variantId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('获取预警阈值失败，请稍后重试'));
  }
};

/**
 * GET /api/admin/inventory/alerts - Get inventory alerts summary
* Get summary of inventory alerts
 */
exports.getInventoryAlerts = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const threshold = req.query.threshold ? parseInt(req.query.threshold) : undefined;

    const [lowStockProducts, outOfStockProducts] = await Promise.all([
      getLowStockProducts(threshold),
      getOutOfStockProducts(),
    ]);

    res.json({
      summary: {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalAlerts: lowStockProducts.length,
        threshold: threshold || LOW_STOCK_THRESHOLD,
      },
      lowStock: lowStockProducts,
      outOfStock: outOfStockProducts,
    });
  } catch (error) {
    logger.error('Error getting inventory alerts', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('获取库存预警信息失败，请稍后重试'));
  }
};



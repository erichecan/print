/**
 * Inventory Controller
 * [2025-01-27 13:45:00] Inventory management API endpoints
 */
const { getLowStockProducts, getOutOfStockProducts } = require('../services/inventoryService');
const logger = require('../utils/logger');

/**
 * GET /api/admin/products/low-stock - Get low stock products
 * [2025-01-27 13:45:00]
 */
exports.getLowStockProducts = async (req, res) => {
  try {
    const threshold = req.query.threshold
      ? parseInt(req.query.threshold)
      : undefined;

    const lowStockProducts = await getLowStockProducts(threshold);

    res.json({
      products: lowStockProducts,
      count: lowStockProducts.length,
      threshold: threshold || parseInt(process.env.LOW_STOCK_THRESHOLD) || 10,
    });
  } catch (error) {
    logger.error('Error getting low stock products:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to get low stock products' });
  }
};

/**
 * GET /api/admin/products/out-of-stock - Get out of stock products
 * [2025-01-27 13:45:00]
 */
exports.getOutOfStockProducts = async (req, res) => {
  try {
    const outOfStockProducts = await getOutOfStockProducts();

    res.json({
      products: outOfStockProducts,
      count: outOfStockProducts.length,
    });
  } catch (error) {
    logger.error('Error getting out of stock products:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to get out of stock products' });
  }
};



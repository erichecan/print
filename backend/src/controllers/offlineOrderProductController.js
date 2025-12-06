/**
 * Offline Order Product Controller
 * [2025-12-06 17:50:00] PRD v2.0: 线下订单产品管理 API
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/admin/offline-order-products
 * 获取产品列表
 */
exports.listProducts = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const products = await prisma.offlineOrderProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info('[OfflineOrderProduct] List products', { timestamp, count: products.length });
    res.json({ data: products });
  } catch (error) {
    logger.error('[OfflineOrderProduct] List products error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to list products' });
  }
};

/**
 * POST /api/admin/offline-order-products
 * 创建产品
 */
exports.createProduct = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { name, imageUrl, isCustomerOwned } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const product = await prisma.offlineOrderProduct.create({
      data: {
        name: name.trim(),
        imageUrl: imageUrl?.trim() || null,
        isCustomerOwned: Boolean(isCustomerOwned),
      },
    });

    logger.info('[OfflineOrderProduct] Create product', { timestamp, productId: product.id });
    res.status(201).json({ data: product });
  } catch (error) {
    logger.error('[OfflineOrderProduct] Create product error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to create product' });
  }
};

/**
 * PATCH /api/admin/offline-order-products/:id
 * 更新产品
 */
exports.updateProduct = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { name, imageUrl, isCustomerOwned } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Product name cannot be empty' });
      }
      updateData.name = name.trim();
    }
    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl?.trim() || null;
    }
    if (isCustomerOwned !== undefined) {
      updateData.isCustomerOwned = Boolean(isCustomerOwned);
    }

    const product = await prisma.offlineOrderProduct.update({
      where: { id },
      data: updateData,
    });

    logger.info('[OfflineOrderProduct] Update product', { timestamp, productId: id });
    res.json({ data: product });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    logger.error('[OfflineOrderProduct] Update product error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to update product' });
  }
};

/**
 * DELETE /api/admin/offline-order-products/:id
 * 删除产品
 */
exports.deleteProduct = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    await prisma.offlineOrderProduct.delete({
      where: { id },
    });

    logger.info('[OfflineOrderProduct] Delete product', { timestamp, productId: id });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    logger.error('[OfflineOrderProduct] Delete product error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete product' });
  }
};


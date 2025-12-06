// [2025-12-06] PRD v2.0: 线下订单产品管理控制器
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');

/**
 * 获取产品列表
 * GET /api/admin/offline-order-products
 */
exports.listProducts = async (req, res, next) => {
  try {
    const products = await prisma.offlineOrderProduct.findMany({
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: products,
      count: products.length,
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error listing products:', error);
    next(new InternalServerError('Failed to list products'));
  }
};

/**
 * 创建产品
 * POST /api/admin/offline-order-products
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, imageUrl, isCustomerOwned } = req.body;

    if (!name || !name.trim()) {
      return next(new BadRequestError('Product name is required'));
    }

    const product = await prisma.offlineOrderProduct.create({
      data: {
        name: name.trim(),
        imageUrl: imageUrl?.trim() || null,
        isCustomerOwned: Boolean(isCustomerOwned),
      },
    });

    res.status(201).json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error creating product:', error);
    next(new InternalServerError('Failed to create product'));
  }
};

/**
 * 更新产品
 * PATCH /api/admin/offline-order-products/:id
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, isCustomerOwned } = req.body;

    const existing = await prisma.offlineOrderProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Product not found'));
    }

    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(new BadRequestError('Product name cannot be empty'));
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

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error updating product:', error);
    next(new InternalServerError('Failed to update product'));
  }
};

/**
 * 删除产品
 * DELETE /api/admin/offline-order-products/:id
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.offlineOrderProduct.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Product not found'));
    }

    await prisma.offlineOrderProduct.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error deleting product:', error);
    next(new InternalServerError('Failed to delete product'));
  }
};


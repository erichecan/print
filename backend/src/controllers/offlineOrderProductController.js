// [2025-12-06] PRD v2.0: 线下订单产品管理控制器
// [2025-01-27 10:00:00] 重构：使用snake_case模型和字段名，添加display_order和is_active支持
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

/**
 * 获取产品列表（公开接口，仅返回激活的产品）
 * GET /api/offline-orders/products
 */
exports.listProducts = async (req, res, next) => {
  try {
    const products = await prisma.offline_order_products.findMany({
      where: {
        is_active: true,
      },
      orderBy: [
        { display_order: 'asc' },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        image_url: true,
        is_customer_owned: true,
      },
    });

    res.json({
      success: true,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        isCustomerOwned: p.is_customer_owned,
      })),
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error listing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message,
    });
  }
};

/**
 * 获取产品列表（管理接口，包含所有产品）
 * GET /api/admin/offline-order-products
 */
exports.listAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.offline_order_products.findMany({
      orderBy: [
        { display_order: 'asc' },
        { name: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        isCustomerOwned: p.is_customer_owned,
        displayOrder: p.display_order,
        isActive: p.is_active,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })),
      count: products.length,
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error listing all products:', error);
    next(new InternalServerError('Failed to list products'));
  }
};

/**
 * 创建产品
 * POST /api/admin/offline-order-products
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, imageUrl, isCustomerOwned, displayOrder } = req.body;

    if (!name || !name.trim()) {
      return next(new BadRequestError('Product name is required'));
    }

    // 获取当前最大的 display_order
    const maxOrder = await prisma.offline_order_products.findFirst({
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    });

    const product = await prisma.offline_order_products.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        image_url: imageUrl?.trim() || null,
        is_customer_owned: Boolean(isCustomerOwned) || false,
        display_order: displayOrder !== undefined ? displayOrder : (maxOrder?.display_order || 0) + 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        imageUrl: product.image_url,
        isCustomerOwned: product.is_customer_owned,
        displayOrder: product.display_order,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
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
    const { name, imageUrl, isCustomerOwned, displayOrder, isActive } = req.body;

    const existing = await prisma.offline_order_products.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Product not found'));
    }

    const updateData = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(new BadRequestError('Product name cannot be empty'));
      }
      updateData.name = name.trim();
    }
    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl?.trim() || null;
    }
    if (isCustomerOwned !== undefined) {
      updateData.is_customer_owned = Boolean(isCustomerOwned);
    }
    if (displayOrder !== undefined) {
      updateData.display_order = displayOrder;
    }
    if (isActive !== undefined) {
      updateData.is_active = Boolean(isActive);
    }

    const product = await prisma.offline_order_products.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: product.id,
        name: product.name,
        imageUrl: product.image_url,
        isCustomerOwned: product.is_customer_owned,
        displayOrder: product.display_order,
        isActive: product.is_active,
        createdAt: product.created_at,
        updatedAt: product.updated_at,
      },
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
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

    const existing = await prisma.offline_order_products.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Product not found'));
    }

    await prisma.offline_order_products.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Product deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Product not found',
      });
    }
    logger.error('[offlineOrderProductController] Error deleting product:', error);
    next(new InternalServerError('Failed to delete product'));
  }
};


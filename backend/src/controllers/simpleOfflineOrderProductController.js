/**
 * Simple Offline Order Product Controller
 * [2025-12-07 08:00:00] 简化的产品管理控制器
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * GET /api/offline-orders/products
 * 获取产品列表（用于下拉菜单）
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
    logger.error('[SimpleOfflineOrderProduct] Error listing products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message,
    });
  }
};

/**
 * GET /api/admin/offline-orders/products
 * 获取产品列表（管理用，包含所有产品）
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
    });
  } catch (error) {
    logger.error('[SimpleOfflineOrderProduct] Error listing all products:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message,
    });
  }
};

/**
 * POST /api/admin/offline-orders/products
 * 添加产品
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, imageUrl, isCustomerOwned, displayOrder } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Product name is required',
      });
    }

    // 获取当前最大的 display_order
    const maxOrder = await prisma.offline_order_products.findFirst({
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    });

    const newProduct = await prisma.offline_order_products.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        image_url: imageUrl || null,
        is_customer_owned: isCustomerOwned || false,
        display_order: displayOrder !== undefined ? displayOrder : (maxOrder?.display_order || 0) + 1,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: newProduct.id,
        name: newProduct.name,
        imageUrl: newProduct.image_url,
        isCustomerOwned: newProduct.is_customer_owned,
        displayOrder: newProduct.display_order,
        isActive: newProduct.is_active,
        createdAt: newProduct.created_at,
        updatedAt: newProduct.updated_at,
      },
    });
  } catch (error) {
    logger.error('[SimpleOfflineOrderProduct] Error creating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error.message,
    });
  }
};

/**
 * PATCH /api/admin/offline-orders/products/:id
 * 更新产品
 */
exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, imageUrl, isCustomerOwned, displayOrder, isActive } = req.body;

    const updateData = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Product name cannot be empty',
        });
      }
      updateData.name = name.trim();
    }

    if (imageUrl !== undefined) {
      updateData.image_url = imageUrl || null;
    }

    if (isCustomerOwned !== undefined) {
      updateData.is_customer_owned = isCustomerOwned;
    }

    if (displayOrder !== undefined) {
      updateData.display_order = displayOrder;
    }

    if (isActive !== undefined) {
      updateData.is_active = isActive;
    }

    const updatedProduct = await prisma.offline_order_products.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: updatedProduct.id,
        name: updatedProduct.name,
        imageUrl: updatedProduct.image_url,
        isCustomerOwned: updatedProduct.is_customer_owned,
        displayOrder: updatedProduct.display_order,
        isActive: updatedProduct.is_active,
        createdAt: updatedProduct.created_at,
        updatedAt: updatedProduct.updated_at,
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
    logger.error('[SimpleOfflineOrderProduct] Error updating product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error.message,
    });
  }
};

/**
 * DELETE /api/admin/offline-orders/products/:id
 * 删除产品
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;

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
    logger.error('[SimpleOfflineOrderProduct] Error deleting product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete product',
      message: error.message,
    });
  }
};


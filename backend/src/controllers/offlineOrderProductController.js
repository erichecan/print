// PRD v2.0: 线下订单产品管理控制器
// 2026-03-06 09:45:00: 扩展分类/供应商绑定与主目录库存同步
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

const parseDecimal = (value) => {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

/**
 * 获取产品列表（公开接口，仅返回激活的产品）
 * GET /api/offline-orders/products
 */
exports.listProducts = async (req, res, next) => {
  try {
    logger.info('[offlineOrderProductController] listProducts called', {
      path: req.path,
      originalUrl: req.originalUrl,
      url: req.url,
    });

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
        unit_cost: true, // Optional: Include cost if needed for margin calc on frontend
      },
    });

    logger.info('[offlineOrderProductController] Found products', {
      count: products.length,
    });

    res.json({
      success: true,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        isCustomerOwned: p.is_customer_owned,
        unitCost: Number(p.unit_cost || 0),
      })),
    });
  } catch (error) {
    logger.error('[offlineOrderProductController] Error listing products:', error);
    next(error); // 使用 next 传递错误，而不是直接返回
  }
};

/**
 * 获取产品列表（管理接口，包含所有产品）
 * GET /api/admin/offline-order-products
 * 容错：若 DB 未同步 schema（缺 supplier_id 等）则返回 503 提示执行迁移，避免 500
 * 2026-03-10 根因修复：/api/admin/offline-order-products 500
 */
exports.listAllProducts = async (req, res, next) => {
  try {
    let products;
    const where = {
      // 管理列表默认只展示启用的产品；已“删除”的产品是 is_active=false
      is_active: true,
    };

    try {
      products = await prisma.offline_order_products.findMany({
        where,
        orderBy: [
          { display_order: 'asc' },
          { name: 'asc' },
        ],
        include: {
          offlineCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          supplier: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
    } catch (includeError) {
      logger.warn('[offlineOrderProductController] Prisma include failed, falling back to basic query:', includeError.message);
      try {
        products = await prisma.offline_order_products.findMany({
          where,
          orderBy: [
            { display_order: 'asc' },
            { name: 'asc' },
          ],
        });
      } catch (fallbackError) {
        const msg = (fallbackError && fallbackError.message) ? String(fallbackError.message) : '';
        const code = fallbackError && fallbackError.code;
        const isSchemaBehind =
          code === 'P2021' ||
          /column.*does not exist|table.*does not exist|relation.*does not exist/i.test(msg);
        if (isSchemaBehind) {
          logger.warn('[offlineOrderProductController] Schema behind (migration required).', { message: msg });
          return res.status(503).json({
            success: false,
            error: 'Database schema sync required',
            code: 'MIGRATION_REQUIRED',
            detail: 'Set AUTO_MIGRATE=true and redeploy once, or run: npx prisma db push --schema=../prisma/schema.prisma',
          });
        }
        throw fallbackError;
      }
    }

    res.json({
      success: true,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        isCustomerOwned: p.is_customer_owned,
        displayOrder: p.display_order,
        isActive: p.is_active,
        unitCost: Number(p.unit_cost || 0),
        categoryId: (p.offlineCategory && p.offlineCategory.id) || p.categoryId || null,
        categoryName: (p.offlineCategory && p.offlineCategory.name) || null,
        supplierId: (p.supplier && p.supplier.id) || p.supplierId || null,
        supplierName: (p.supplier && p.supplier.name) || null,
        sku: p.sku || null,
        stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : (p.stock_quantity ?? 0),
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
    const {
      name,
      imageUrl,
      isCustomerOwned,
      displayOrder,
      unitCost,
      categoryId,
      supplierId,
      sku,
      stockQuantity,
    } = req.body;

    if (!name || !name.trim()) {
      return next(new BadRequestError('Product name is required'));
    }

    if (!categoryId) {
      return next(new BadRequestError('Category is required for offline products'));
    }

    const category = await prisma.offlineCategory.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return next(new BadRequestError('Invalid categoryId'));
    }

    let resolvedSupplierId = null;
    if (supplierId) {
      try {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          select: { id: true },
        });
        if (!supplier) {
          return next(new BadRequestError('Invalid supplierId'));
        }
        resolvedSupplierId = supplierId;
      } catch (supplierErr) {
        const msg = (supplierErr && supplierErr.message) ? String(supplierErr.message) : '';
        if (/relation.*does not exist|table.*suppliers.*does not exist/i.test(msg)) {
          logger.warn('[offlineOrderProductController] Suppliers table missing, creating product without supplier.');
          resolvedSupplierId = null;
        } else {
          throw supplierErr;
        }
      }
    }

    // 获取当前最大的 display_order
    const maxOrder = await prisma.offline_order_products.findFirst({
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    });

    // 创建产品（Prisma 使用 schema 中的 camelCase 字段名）
    const product = await prisma.offline_order_products.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        image_url: imageUrl?.trim() || null,
        is_customer_owned: Boolean(isCustomerOwned) || false,
        display_order: displayOrder !== undefined ? displayOrder : (maxOrder?.display_order || 0) + 1,
        is_active: true,
        unit_cost: parseDecimal(unitCost) || 0,
        categoryId,
        supplierId: resolvedSupplierId,
        sku: sku?.trim() || null,
        stockQuantity: typeof stockQuantity === 'number' ? stockQuantity : 0,
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
        unitCost: Number(product.unit_cost || 0),
        categoryId: product.categoryId ?? product.category_id,
        supplierId: product.supplierId ?? product.supplier_id,
        sku: product.sku,
        stockQuantity: product.stock_quantity,
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
    const {
      name,
      imageUrl,
      isCustomerOwned,
      displayOrder,
      isActive,
      unitCost,
      categoryId,
      supplierId,
      sku,
      stockQuantity,
    } = req.body;

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
    if (unitCost !== undefined) {
      updateData.unit_cost = parseDecimal(unitCost);
    }
    if (categoryId !== undefined) {
      if (!categoryId) {
        return next(new BadRequestError('Category is required for offline products'));
      }
      const category = await prisma.offlineCategory.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return next(new BadRequestError('Invalid categoryId'));
      }
      updateData.categoryId = categoryId;
    }
    if (supplierId !== undefined) {
      if (supplierId) {
        try {
          const supplier = await prisma.supplier.findUnique({
            where: { id: supplierId },
            select: { id: true },
          });
          if (!supplier) {
            return next(new BadRequestError('Invalid supplierId'));
          }
          updateData.supplierId = supplierId;
        } catch (supplierErr) {
          const msg = (supplierErr && supplierErr.message) ? String(supplierErr.message) : '';
          if (/relation.*does not exist|table.*suppliers.*does not exist/i.test(msg)) {
            logger.warn('[offlineOrderProductController] Suppliers table missing, clearing supplier.');
            updateData.supplierId = null;
          } else {
            throw supplierErr;
          }
        }
      } else {
        updateData.supplierId = null;
      }
    }
    if (sku !== undefined) {
      updateData.sku = sku?.trim() || null;
    }
    if (stockQuantity !== undefined) {
      updateData.stockQuantity = typeof stockQuantity === 'number' ? stockQuantity : (existing.stockQuantity ?? existing.stock_quantity ?? 0);
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
        unitCost: Number(product.unit_cost || 0),
        categoryId: product.categoryId ?? product.category_id,
        supplierId: product.supplierId ?? product.supplier_id,
        sku: product.sku,
        stockQuantity: product.stockQuantity ?? product.stock_quantity ?? 0,
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

    await prisma.offline_order_products.update({
      where: { id },
      data: {
        is_active: false,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      message: 'Product archived successfully',
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


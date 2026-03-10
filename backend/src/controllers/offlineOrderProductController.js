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

function slugifyName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'product';
}

async function syncOfflineProductToCatalog({ name, categoryId, sku, unitCost, stockQuantity }) {
  if (!sku || !name) {
    return;
  }

  try {
    const existingVariant = await prisma.variant.findUnique({
      where: { sku },
      include: {
        product: true,
      },
    });

    if (existingVariant) {
      const productUpdates = {};
      if (categoryId && existingVariant.product.categoryId !== categoryId) {
        productUpdates.categoryId = categoryId;
      }
      if (unitCost !== undefined && unitCost !== null) {
        const currentUnitCost = Number(existingVariant.product.unitCost || 0);
        if (Number(unitCost) !== currentUnitCost) {
          productUpdates.unitCost = unitCost;
        }
      }
      if (Object.keys(productUpdates).length > 0) {
        await prisma.product.update({
          where: { id: existingVariant.productId },
          data: productUpdates,
        });
      }

      if (typeof stockQuantity === 'number' && stockQuantity >= 0) {
        await prisma.variant.update({
          where: { id: existingVariant.id },
          data: { stockQuantity },
        });
        const aggregate = await prisma.variant.aggregate({
          where: { productId: existingVariant.productId },
          _sum: { stockQuantity: true },
        });
        await prisma.product.update({
          where: { id: existingVariant.productId },
          data: { stockQuantity: aggregate._sum.stockQuantity || 0 },
        });
      }
      return;
    }

    const basePriceCents =
      unitCost !== undefined && unitCost !== null
        ? Math.max(0, Math.round(Number(unitCost) * 100 * 1.2))
        : 0;

    const baseSlug = slugifyName(name);
    let slug = baseSlug;
    let suffix = 1;

    // 保证 slug 唯一
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const product = await prisma.product.create({
          data: {
            name,
            slug,
            description: null,
            longDescription: null,
            basePrice: basePriceCents,
            unitCost: unitCost !== undefined && unitCost !== null ? unitCost : 0,
            salePrice: unitCost !== undefined && unitCost !== null ? unitCost : 0,
            grossProfit: 0,
            sku: `${slug}-MASTER`,
            isCustomizable: true,
            stockQuantity: typeof stockQuantity === 'number' ? stockQuantity : 0,
            weight: null,
            dimensions: null,
            printableAreas: null,
            isActive: true,
            isDraft: false,
            categoryId: categoryId || undefined,
            brandId: null,
            isSystem: false,
          },
        });

        await prisma.variant.create({
          data: {
            productId: product.id,
            color: 'Default',
            colorHex: null,
            colorDisplayName: 'Default',
            size: 'OS',
            sku,
            priceAdjustment: 0,
            stockQuantity: typeof stockQuantity === 'number' ? stockQuantity : 0,
            imageUrl: null,
          },
        });

        return;
      } catch (error) {
        if (error.code === 'P2002' && error.meta?.target?.includes('slug')) {
          slug = `${baseSlug}-${suffix++}`;
          continue;
        }
        logger.warn('[offlineOrderProductController] syncOfflineProductToCatalog error', {
          error: error.message,
        });
        return;
      }
    }
  } catch (error) {
    logger.warn('[offlineOrderProductController] syncOfflineProductToCatalog unexpected error', {
      error: error.message,
    });
  }
}

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
 */
exports.listAllProducts = async (req, res, next) => {
  try {
    const products = await prisma.offline_order_products.findMany({
      orderBy: [
        { display_order: 'asc' },
        { name: 'asc' },
      ],
      include: {
        category: {
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
        categoryId: p.category?.id || null,
        categoryName: p.category?.name || null,
        supplierId: p.supplier?.id || null,
        supplierName: p.supplier?.name || null,
        sku: p.sku || null,
        stockQuantity: typeof p.stockQuantity === 'number' ? p.stockQuantity : 0,
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

    const category = await prisma.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    });

    if (!category) {
      return next(new BadRequestError('Invalid categoryId'));
    }

    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({
        where: { id: supplierId },
        select: { id: true },
      });
      if (!supplier) {
        return next(new BadRequestError('Invalid supplierId'));
      }
    }

    // 获取当前最大的 display_order
    const maxOrder = await prisma.offline_order_products.findFirst({
      orderBy: { display_order: 'desc' },
      select: { display_order: true },
    });

    // 创建产品
    const product = await prisma.offline_order_products.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        image_url: imageUrl?.trim() || null,
        is_customer_owned: Boolean(isCustomerOwned) || false,
        display_order: displayOrder !== undefined ? displayOrder : (maxOrder?.display_order || 0) + 1,
        is_active: true,
        unit_cost: parseDecimal(unitCost) || 0,
        category_id: categoryId,
        supplier_id: supplierId || null,
        sku: sku?.trim() || null,
        stock_quantity: typeof stockQuantity === 'number' ? stockQuantity : 0,
      },
    });

    await syncOfflineProductToCatalog({
      name: product.name,
      categoryId,
      sku: product.sku,
      unitCost: product.unit_cost || 0,
      stockQuantity: product.stock_quantity,
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
        categoryId: product.category_id,
        supplierId: product.supplier_id,
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
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
      });
      if (!category) {
        return next(new BadRequestError('Invalid categoryId'));
      }
      updateData.category_id = categoryId;
    }
    if (supplierId !== undefined) {
      if (supplierId) {
        const supplier = await prisma.supplier.findUnique({
          where: { id: supplierId },
          select: { id: true },
        });
        if (!supplier) {
          return next(new BadRequestError('Invalid supplierId'));
        }
        updateData.supplier_id = supplierId;
      } else {
        updateData.supplier_id = null;
      }
    }
    if (sku !== undefined) {
      updateData.sku = sku?.trim() || null;
    }
    if (stockQuantity !== undefined) {
      updateData.stock_quantity = typeof stockQuantity === 'number' ? stockQuantity : existing.stock_quantity || 0;
    }

    const product = await prisma.offline_order_products.update({
      where: { id },
      data: updateData,
    });

    await syncOfflineProductToCatalog({
      name: product.name,
      categoryId: product.category_id,
      sku: product.sku,
      unitCost: product.unit_cost || 0,
      stockQuantity: product.stock_quantity,
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
        categoryId: product.category_id,
        supplierId: product.supplier_id,
        sku: product.sku,
        stockQuantity: product.stock_quantity,
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


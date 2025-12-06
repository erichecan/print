// [2025-12-06] PRD v2.0: 线下订单产品-颜色-尺码可用性配置控制器
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');

/**
 * 获取可用性配置
 * GET /api/admin/offline-order-product-color-sizes
 * 查询参数：productId, colorId
 */
exports.getAvailabilityConfigs = async (req, res, next) => {
  try {
    const { productId, colorId } = req.query;

    const where = {};
    if (productId) where.productId = productId;
    if (colorId) where.colorId = colorId;

    const configs = await prisma.offlineOrderProductColorSize.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true },
        },
        color: {
          select: { id: true, name: true },
        },
      },
      orderBy: [{ productId: 'asc' }, { colorId: 'asc' }, { size: 'asc' }],
    });

    res.json({
      success: true,
      data: configs.map((c) => ({
        id: c.id,
        productId: c.productId,
        productName: c.product.name,
        colorId: c.colorId,
        colorName: c.color.name,
        size: c.size,
        available: c.isAvailable,
      })),
      count: configs.length,
    });
  } catch (error) {
    logger.error('[offlineOrderProductColorSizeController] Error getting availability configs:', error);
    next(new InternalServerError('Failed to get availability configs'));
  }
};

/**
 * 创建可用性配置
 * POST /api/admin/offline-order-product-color-sizes
 */
exports.createAvailabilityConfig = async (req, res, next) => {
  try {
    const { productId, colorId, size, isAvailable } = req.body;

    if (!productId || !colorId || !size) {
      return next(new BadRequestError('productId, colorId, and size are required'));
    }

    // 验证产品存在
    const product = await prisma.offlineOrderProduct.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return next(new NotFoundError('Product not found'));
    }

    // 验证颜色存在
    const color = await prisma.offlineOrderColor.findUnique({
      where: { id: colorId },
    });
    if (!color) {
      return next(new NotFoundError('Color not found'));
    }

    const config = await prisma.offlineOrderProductColorSize.create({
      data: {
        productId,
        colorId,
        size: size.trim(),
        isAvailable: Boolean(isAvailable !== false), // 默认为 true
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
        color: {
          select: { id: true, name: true },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: config.id,
        productId: config.productId,
        productName: config.product.name,
        colorId: config.colorId,
        colorName: config.color.name,
        size: config.size,
        available: config.isAvailable,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('Availability config with this product-color-size combination already exists'));
    }
    logger.error('[offlineOrderProductColorSizeController] Error creating availability config:', error);
    next(new InternalServerError('Failed to create availability config'));
  }
};

/**
 * 更新可用性配置
 * PATCH /api/admin/offline-order-product-color-sizes/:id
 */
exports.updateAvailabilityConfig = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const existing = await prisma.offlineOrderProductColorSize.findUnique({
      where: { id },
      include: {
        product: {
          select: { id: true, name: true },
        },
        color: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existing) {
      return next(new NotFoundError('Availability config not found'));
    }

    const config = await prisma.offlineOrderProductColorSize.update({
      where: { id },
      data: {
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : existing.isAvailable,
      },
      include: {
        product: {
          select: { id: true, name: true },
        },
        color: {
          select: { id: true, name: true },
        },
      },
    });

    res.json({
      success: true,
      data: {
        id: config.id,
        productId: config.productId,
        productName: config.product.name,
        colorId: config.colorId,
        colorName: config.color.name,
        size: config.size,
        available: config.isAvailable,
      },
    });
  } catch (error) {
    logger.error('[offlineOrderProductColorSizeController] Error updating availability config:', error);
    next(new InternalServerError('Failed to update availability config'));
  }
};

/**
 * 删除可用性配置
 * DELETE /api/admin/offline-order-product-color-sizes/:id
 */
exports.deleteAvailabilityConfig = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.offlineOrderProductColorSize.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Availability config not found'));
    }

    await prisma.offlineOrderProductColorSize.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Availability config deleted successfully',
    });
  } catch (error) {
    logger.error('[offlineOrderProductColorSizeController] Error deleting availability config:', error);
    next(new InternalServerError('Failed to delete availability config'));
  }
};

/**
 * 批量更新可用性配置
 * POST /api/admin/offline-order-product-color-sizes/batch
 */
exports.batchUpdateAvailabilityConfigs = async (req, res, next) => {
  try {
    const { configs } = req.body;

    if (!Array.isArray(configs)) {
      return next(new BadRequestError('configs must be an array'));
    }

    // 验证所有配置
    for (const cfg of configs) {
      if (!cfg.productId || !cfg.colorId || !cfg.size) {
        return next(new BadRequestError('Each config must have productId, colorId, and size'));
      }
    }

    // 使用事务批量创建或更新
    const results = await prisma.$transaction(
      configs.map((cfg) =>
        prisma.offlineOrderProductColorSize.upsert({
          where: {
            productId_colorId_size: {
              productId: cfg.productId,
              colorId: cfg.colorId,
              size: cfg.size.trim(),
            },
          },
          update: {
            isAvailable: cfg.isAvailable !== undefined ? Boolean(cfg.isAvailable) : true,
          },
          create: {
            productId: cfg.productId,
            colorId: cfg.colorId,
            size: cfg.size.trim(),
            isAvailable: cfg.isAvailable !== undefined ? Boolean(cfg.isAvailable) : true,
          },
          include: {
            product: {
              select: { id: true, name: true },
            },
            color: {
              select: { id: true, name: true },
            },
          },
        })
      )
    );

    res.json({
      success: true,
      data: results.map((c) => ({
        id: c.id,
        productId: c.productId,
        productName: c.product.name,
        colorId: c.colorId,
        colorName: c.color.name,
        size: c.size,
        available: c.isAvailable,
      })),
    });
  } catch (error) {
    logger.error('[offlineOrderProductColorSizeController] Error batch updating availability configs:', error);
    next(new InternalServerError('Failed to batch update availability configs'));
  }
};


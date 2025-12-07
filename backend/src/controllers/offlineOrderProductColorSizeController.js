// [2025-12-06] PRD v2.0: 线下订单产品-颜色-尺码可用性配置控制器
// [2025-12-07 04:20:00] 创建控制器
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');

/**
 * 获取可用性配置列表
 * GET /api/admin/offline-order-product-color-sizes
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
        product: true,
        color: true,
      },
      orderBy: [
        { productId: 'asc' },
        { colorId: 'asc' },
        { size: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: configs,
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

    const config = await prisma.offlineOrderProductColorSize.create({
      data: {
        productId,
        colorId,
        size,
        isAvailable: Boolean(isAvailable),
      },
      include: {
        product: true,
        color: true,
      },
    });

    res.status(201).json({
      success: true,
      data: config,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new BadRequestError('This product-color-size combination already exists'));
    }
    logger.error('[offlineOrderProductColorSizeController] Error creating availability config:', error);
    next(new InternalServerError('Failed to create availability config'));
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

    const results = await prisma.$transaction(
      configs.map((config) =>
        prisma.offlineOrderProductColorSize.upsert({
          where: {
            productId_colorId_size: {
              productId: config.productId,
              colorId: config.colorId,
              size: config.size,
            },
          },
          update: {
            isAvailable: Boolean(config.isAvailable),
          },
          create: {
            productId: config.productId,
            colorId: config.colorId,
            size: config.size,
            isAvailable: Boolean(config.isAvailable),
          },
        })
      )
    );

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    logger.error('[offlineOrderProductColorSizeController] Error batch updating availability configs:', error);
    next(new InternalServerError('Failed to batch update availability configs'));
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
    });

    if (!existing) {
      return next(new NotFoundError('Availability config not found'));
    }

    const config = await prisma.offlineOrderProductColorSize.update({
      where: { id },
      data: {
        isAvailable: Boolean(isAvailable),
      },
      include: {
        product: true,
        color: true,
      },
    });

    res.json({
      success: true,
      data: config,
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


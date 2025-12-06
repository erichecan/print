/**
 * Offline Order Product Color Size Controller
 * [2025-12-06 17:50:00] PRD v2.0: 产品-颜色-尺码可用性配置 API
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/admin/offline-order-product-color-sizes
 * 获取可用性配置（支持筛选）
 */
exports.getAvailabilityConfigs = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { productId, colorId } = req.query;

    const where = {};
    if (productId) where.productId = productId;
    if (colorId) where.colorId = colorId;

    const configs = await prisma.offlineOrderProductColorSize.findMany({
      where,
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        color: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ productId: 'asc' }, { colorId: 'asc' }, { size: 'asc' }],
    });

    logger.info('[OfflineOrderProductColorSize] Get availability configs', {
      timestamp,
      count: configs.length,
      productId,
      colorId,
    });
    res.json({ data: configs });
  } catch (error) {
    logger.error('[OfflineOrderProductColorSize] Get availability configs error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to get availability configs' });
  }
};

/**
 * POST /api/admin/offline-order-product-color-sizes
 * 创建可用性配置
 */
exports.createAvailabilityConfig = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { productId, colorId, size, isAvailable } = req.body;

    if (!productId || !colorId || !size) {
      return res.status(400).json({ error: 'productId, colorId, and size are required' });
    }

    const config = await prisma.offlineOrderProductColorSize.create({
      data: {
        productId,
        colorId,
        size,
        isAvailable: Boolean(isAvailable !== false),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        color: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('[OfflineOrderProductColorSize] Create availability config', {
      timestamp,
      configId: config.id,
    });
    res.status(201).json({ data: config });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Availability config already exists' });
    }
    logger.error('[OfflineOrderProductColorSize] Create availability config error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to create availability config' });
  }
};

/**
 * PATCH /api/admin/offline-order-product-color-sizes/:id
 * 更新可用性配置
 */
exports.updateAvailabilityConfig = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { isAvailable } = req.body;

    const config = await prisma.offlineOrderProductColorSize.update({
      where: { id },
      data: {
        isAvailable: Boolean(isAvailable !== false),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        color: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logger.info('[OfflineOrderProductColorSize] Update availability config', {
      timestamp,
      configId: id,
    });
    res.json({ data: config });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Availability config not found' });
    }
    logger.error('[OfflineOrderProductColorSize] Update availability config error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to update availability config' });
  }
};

/**
 * DELETE /api/admin/offline-order-product-color-sizes/:id
 * 删除可用性配置
 */
exports.deleteAvailabilityConfig = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    await prisma.offlineOrderProductColorSize.delete({
      where: { id },
    });

    logger.info('[OfflineOrderProductColorSize] Delete availability config', {
      timestamp,
      configId: id,
    });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Availability config not found' });
    }
    logger.error('[OfflineOrderProductColorSize] Delete availability config error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to delete availability config' });
  }
};

/**
 * POST /api/admin/offline-order-product-color-sizes/batch
 * 批量配置可用性
 */
exports.batchUpdateAvailabilityConfigs = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { productId, colorId, configs } = req.body; // configs: [{ size: 'XL', isAvailable: true }, ...]

    if (!productId || !colorId || !Array.isArray(configs)) {
      return res.status(400).json({
        error: 'productId, colorId, and configs array are required',
      });
    }

    const results = [];

    for (const item of configs) {
      const { size, isAvailable } = item;

      const config = await prisma.offlineOrderProductColorSize.upsert({
        where: {
          productId_colorId_size: {
            productId,
            colorId,
            size,
          },
        },
        update: {
          isAvailable: Boolean(isAvailable !== false),
        },
        create: {
          productId,
          colorId,
          size,
          isAvailable: Boolean(isAvailable !== false),
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
            },
          },
          color: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      results.push(config);
    }

    logger.info('[OfflineOrderProductColorSize] Batch update availability configs', {
      timestamp,
      productId,
      colorId,
      count: results.length,
    });
    res.json({ data: results });
  } catch (error) {
    logger.error('[OfflineOrderProductColorSize] Batch update availability configs error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to batch update availability configs' });
  }
};


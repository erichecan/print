/**
 * Offline Order Color Controller
 * [2025-12-06 17:50:00] PRD v2.0: 线下订单颜色管理 API
 * [2025-12-06 12:00:00] Enhanced with unified error handling
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  BadRequestError,
  NotFoundError,
  ConflictError,
  InternalServerError,
} = require('../utils/errors');

/**
 * GET /api/admin/offline-order-colors
 * 获取颜色列表
 */
exports.listColors = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const colors = await prisma.offlineOrderColor.findMany({
      orderBy: { createdAt: 'desc' },
    });

    logger.info('[OfflineOrderColor] List colors', { timestamp, count: colors.length });
    res.json({ data: colors });
  } catch (error) {
    logger.error('[OfflineOrderColor] List colors error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('无法获取颜色列表，请稍后重试'));
  }
};

/**
 * POST /api/admin/offline-order-colors
 * 创建颜色
 */
exports.createColor = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { name, hexCode } = req.body;

    if (!name || !name.trim()) {
      return next(new BadRequestError('颜色名称为必填项', {
        field: 'name',
      }));
    }

    const color = await prisma.offlineOrderColor.create({
      data: {
        name: name.trim(),
        hexCode: hexCode?.trim() || null,
      },
    });

    logger.info('[OfflineOrderColor] Create color', { timestamp, colorId: color.id });
    res.status(201).json({ data: color });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('颜色名称已存在', {
        name: name.trim(),
      }));
    }
    logger.error('[OfflineOrderColor] Create color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('创建颜色失败，请稍后重试'));
  }
};

/**
 * PATCH /api/admin/offline-order-colors/:id
 * 更新颜色
 */
exports.updateColor = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { name, hexCode } = req.body;

    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(new BadRequestError('颜色名称不能为空', {
          field: 'name',
        }));
      }
      updateData.name = name.trim();
    }
    if (hexCode !== undefined) {
      updateData.hexCode = hexCode?.trim() || null;
    }

    const color = await prisma.offlineOrderColor.update({
      where: { id },
      data: updateData,
    });

    logger.info('[OfflineOrderColor] Update color', { timestamp, colorId: id });
    res.json({ data: color });
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new NotFoundError('颜色不存在', { colorId: id }));
    }
    if (error.code === 'P2002') {
      return next(new ConflictError('颜色名称已存在', {
        colorId: id,
        name: name?.trim(),
      }));
    }
    logger.error('[OfflineOrderColor] Update color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('更新颜色失败，请稍后重试'));
  }
};

/**
 * DELETE /api/admin/offline-order-colors/:id
 * 删除颜色
 */
exports.deleteColor = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    await prisma.offlineOrderColor.delete({
      where: { id },
    });

    logger.info('[OfflineOrderColor] Delete color', { timestamp, colorId: id });
    res.status(204).send();
  } catch (error) {
    if (error.code === 'P2025') {
      return next(new NotFoundError('颜色不存在', { colorId: id }));
    }
    logger.error('[OfflineOrderColor] Delete color error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('删除颜色失败，请稍后重试'));
  }
};


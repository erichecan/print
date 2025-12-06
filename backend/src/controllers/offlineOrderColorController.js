// [2025-12-06] PRD v2.0: 线下订单颜色管理控制器
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');

/**
 * 获取颜色列表
 * GET /api/admin/offline-order-colors
 */
exports.listColors = async (req, res, next) => {
  try {
    const colors = await prisma.offlineOrderColor.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: colors,
      count: colors.length,
    });
  } catch (error) {
    logger.error('[offlineOrderColorController] Error listing colors:', error);
    next(new InternalServerError('Failed to list colors'));
  }
};

/**
 * 创建颜色
 * POST /api/admin/offline-order-colors
 */
exports.createColor = async (req, res, next) => {
  try {
    const { name, hexCode } = req.body;

    if (!name || !name.trim()) {
      return next(new BadRequestError('Color name is required'));
    }

    // 检查是否已存在同名颜色
    const existing = await prisma.offlineOrderColor.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return next(new ConflictError('Color with this name already exists'));
    }

    const color = await prisma.offlineOrderColor.create({
      data: {
        name: name.trim(),
        hexCode: hexCode?.trim() || null,
      },
    });

    res.status(201).json({
      success: true,
      data: color,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('Color with this name already exists'));
    }
    logger.error('[offlineOrderColorController] Error creating color:', error);
    next(new InternalServerError('Failed to create color'));
  }
};

/**
 * 更新颜色
 * PATCH /api/admin/offline-order-colors/:id
 */
exports.updateColor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, hexCode } = req.body;

    const existing = await prisma.offlineOrderColor.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Color not found'));
    }

    const updateData = {};
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(new BadRequestError('Color name cannot be empty'));
      }
      // 如果名称改变，检查新名称是否已被占用
      if (name.trim() !== existing.name) {
        const nameExists = await prisma.offlineOrderColor.findUnique({
          where: { name: name.trim() },
        });
        if (nameExists) {
          return next(new ConflictError('Color with this name already exists'));
        }
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

    res.json({
      success: true,
      data: color,
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('Color with this name already exists'));
    }
    logger.error('[offlineOrderColorController] Error updating color:', error);
    next(new InternalServerError('Failed to update color'));
  }
};

/**
 * 删除颜色
 * DELETE /api/admin/offline-order-colors/:id
 */
exports.deleteColor = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await prisma.offlineOrderColor.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Color not found'));
    }

    await prisma.offlineOrderColor.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Color deleted successfully',
    });
  } catch (error) {
    logger.error('[offlineOrderColorController] Error deleting color:', error);
    next(new InternalServerError('Failed to delete color'));
  }
};


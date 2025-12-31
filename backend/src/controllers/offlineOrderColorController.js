// PRD v2.0: 线下订单颜色管理控制器
// 从备份文件恢复
// 重构：使用snake_case模型和字段名
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError, ConflictError, InternalServerError } = require('../utils/errors');
const { v4: uuidv4 } = require('uuid');

/**
 * 获取颜色列表
 * GET /api/admin/offline-order-colors
 */
exports.listColors = async (req, res, next) => {
  try {
    const colors = await prisma.offline_order_colors.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({
      success: true,
      data: colors.map(c => ({
        id: c.id,
        name: c.name,
        hexCode: c.hex_code,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      })),
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
    const existing = await prisma.offline_order_colors.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return next(new ConflictError('Color with this name already exists'));
    }

// 创建颜色 - created_at 由 @default(now()) 自动处理
    const color = await prisma.offline_order_colors.create({
      data: {
        id: uuidv4(),
        name: name.trim(),
        hex_code: hexCode?.trim() || null,
        // created_at 由 Prisma 自动处理（schema 中有 @default(now())）
        // updated_at 需要手动设置（schema 中没有 @updatedAt）
        updated_at: new Date(),
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: color.id,
        name: color.name,
        hexCode: color.hex_code,
        createdAt: color.created_at,
        updatedAt: color.updated_at,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('Color with this name already exists'));
    }
    logger.error('[offlineOrderColorController] Error creating color:', {
      error: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
      colorName: name,
    });
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

    const existing = await prisma.offline_order_colors.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Color not found'));
    }

    const updateData = {
      updated_at: new Date(),
    };

    if (name !== undefined) {
      if (!name || !name.trim()) {
        return next(new BadRequestError('Color name cannot be empty'));
      }
      // 如果名称改变，检查新名称是否已被占用
      if (name.trim() !== existing.name) {
        const nameExists = await prisma.offline_order_colors.findUnique({
          where: { name: name.trim() },
        });
        if (nameExists) {
          return next(new ConflictError('Color with this name already exists'));
        }
      }
      updateData.name = name.trim();
    }
    if (hexCode !== undefined) {
      updateData.hex_code = hexCode?.trim() || null;
    }

    const color = await prisma.offline_order_colors.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: color.id,
        name: color.name,
        hexCode: color.hex_code,
        createdAt: color.created_at,
        updatedAt: color.updated_at,
      },
    });
  } catch (error) {
    if (error.code === 'P2002') {
      return next(new ConflictError('Color with this name already exists'));
    }
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Color not found',
      });
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

    const existing = await prisma.offline_order_colors.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError('Color not found'));
    }

    await prisma.offline_order_colors.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Color deleted successfully',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Color not found',
      });
    }
    logger.error('[offlineOrderColorController] Error deleting color:', error);
    next(new InternalServerError('Failed to delete color'));
  }
};


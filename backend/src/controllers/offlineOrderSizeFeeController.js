// PRD v2.0: 线下订单尺码费用管理控制器
// 更新：支持完整的CRUD操作和所有尺码配置
// [2026-01-06 07:00:00] 重构：移除硬编码限制，支持所有尺码的增删改查
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');

/**
 * 获取尺码费用列表
 * GET /api/admin/offline-order-size-fees
 * 返回所有尺码配置，按 display_order 和 size 排序
 */
exports.getSizeFees = async (req, res, next) => {
  try {
    const sizeFees = await prisma.offline_order_size_fees.findMany({
      orderBy: [
        { display_order: 'asc' },
        { size: 'asc' },
      ],
    });

    res.json({
      success: true,
      data: sizeFees.map((sf) => ({
        id: sf.id,
        size: sf.size,
        sizeType: sf.size_type || 'Adult',
        additionalFee: Number(sf.additional_fee),
        displayOrder: sf.display_order || 0,
        isActive: sf.is_active !== false, // 默认为true
      })),
      count: sizeFees.length,
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error getting size fees:', error);
    next(new InternalServerError('Failed to get size fees'));
  }
};

/**
 * 批量更新尺码费用（保持向后兼容）
 * PATCH /api/admin/offline-order-size-fees
 */
exports.updateSizeFees = async (req, res, next) => {
  try {
    const { sizeFees } = req.body;

    if (!Array.isArray(sizeFees)) {
      return next(new BadRequestError('sizeFees must be an array'));
    }

    // 验证数据
    for (const sf of sizeFees) {
      if (!sf.size || typeof sf.size !== 'string') {
        return next(new BadRequestError(`Invalid size: size is required and must be a string`));
      }
      if (typeof sf.additionalFee !== 'number' || sf.additionalFee < 0) {
        return next(new BadRequestError(`Invalid additionalFee for size ${sf.size}: must be a non-negative number`));
      }
    }

    // 使用事务批量更新或创建
    const results = await prisma.$transaction(
      sizeFees.map((sf) =>
        prisma.offline_order_size_fees.upsert({
          where: { size: sf.size },
          update: {
            additional_fee: sf.additionalFee,
            size_type: sf.sizeType || undefined,
            display_order: sf.displayOrder !== undefined ? sf.displayOrder : undefined,
            is_active: sf.isActive !== undefined ? sf.isActive : undefined,
            updated_at: new Date(),
          },
          create: {
            id: uuidv4(),
            size: sf.size,
            additional_fee: sf.additionalFee,
            size_type: sf.sizeType || 'Adult',
            display_order: sf.displayOrder || 0,
            is_active: sf.isActive !== undefined ? sf.isActive : true,
            updated_at: new Date(),
          },
        })
      )
    );

    res.json({
      success: true,
      data: results.map((sf) => ({
        id: sf.id,
        size: sf.size,
        sizeType: sf.size_type || 'Adult',
        additionalFee: Number(sf.additional_fee),
        displayOrder: sf.display_order || 0,
        isActive: sf.is_active !== false,
      })),
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error updating size fees:', error);
    next(new InternalServerError('Failed to update size fees'));
  }
};

/**
 * 创建新尺码配置
 * POST /api/admin/offline-order-size-fees
 */
exports.createSizeFee = async (req, res, next) => {
  try {
    const { size, sizeType = 'Adult', additionalFee = 0, displayOrder = 0, isActive = true } = req.body;

    // 验证必填字段
    if (!size || typeof size !== 'string' || size.trim() === '') {
      return next(new BadRequestError('size is required and must be a non-empty string'));
    }

    // 验证费用
    if (typeof additionalFee !== 'number' || additionalFee < 0) {
      return next(new BadRequestError('additionalFee must be a non-negative number'));
    }

    // 验证类型
    const validTypes = ['Youth', 'Adult', 'Other'];
    if (sizeType && !validTypes.includes(sizeType)) {
      return next(new BadRequestError(`sizeType must be one of: ${validTypes.join(', ')}`));
    }

    // 检查尺码是否已存在
    const existing = await prisma.offline_order_size_fees.findUnique({
      where: { size: size.trim() },
    });

    if (existing) {
      return next(new BadRequestError(`Size ${size} already exists`));
    }

    // 创建新尺码
    const newSizeFee = await prisma.offline_order_size_fees.create({
      data: {
        id: uuidv4(),
        size: size.trim(),
        size_type: sizeType,
        additional_fee: additionalFee,
        display_order: displayOrder || 0,
        is_active: isActive,
        updated_at: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        id: newSizeFee.id,
        size: newSizeFee.size,
        sizeType: newSizeFee.size_type || 'Adult',
        additionalFee: Number(newSizeFee.additional_fee),
        displayOrder: newSizeFee.display_order || 0,
        isActive: newSizeFee.is_active !== false,
      },
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error creating size fee:', error);
    next(new InternalServerError('Failed to create size fee'));
  }
};

/**
 * 更新单个尺码配置
 * PATCH /api/admin/offline-order-size-fees/:id
 */
exports.updateSizeFee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { size, sizeType, additionalFee, displayOrder, isActive } = req.body;

    // 验证ID是否存在
    const existing = await prisma.offline_order_size_fees.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError(`Size fee with id ${id} not found`));
    }

    // 如果要修改尺码名称，检查新名称是否已被使用
    if (size && size !== existing.size) {
      const nameConflict = await prisma.offline_order_size_fees.findUnique({
        where: { size: size.trim() },
      });

      if (nameConflict && nameConflict.id !== id) {
        return next(new BadRequestError(`Size ${size} already exists`));
      }
    }

    // 验证费用
    if (additionalFee !== undefined && (typeof additionalFee !== 'number' || additionalFee < 0)) {
      return next(new BadRequestError('additionalFee must be a non-negative number'));
    }

    // 验证类型
    if (sizeType !== undefined) {
      const validTypes = ['Youth', 'Adult', 'Other'];
      if (!validTypes.includes(sizeType)) {
        return next(new BadRequestError(`sizeType must be one of: ${validTypes.join(', ')}`));
      }
    }

    // 构建更新数据
    const updateData = {
      updated_at: new Date(),
    };

    if (size !== undefined) updateData.size = size.trim();
    if (sizeType !== undefined) updateData.size_type = sizeType;
    if (additionalFee !== undefined) updateData.additional_fee = additionalFee;
    if (displayOrder !== undefined) updateData.display_order = displayOrder;
    if (isActive !== undefined) updateData.is_active = isActive;

    // 更新尺码配置
    const updated = await prisma.offline_order_size_fees.update({
      where: { id },
      data: updateData,
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        size: updated.size,
        sizeType: updated.size_type || 'Adult',
        additionalFee: Number(updated.additional_fee),
        displayOrder: updated.display_order || 0,
        isActive: updated.is_active !== false,
      },
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error updating size fee:', error);
    next(new InternalServerError('Failed to update size fee'));
  }
};

/**
 * 删除尺码配置
 * DELETE /api/admin/offline-order-size-fees/:id
 */
exports.deleteSizeFee = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查是否存在
    const existing = await prisma.offline_order_size_fees.findUnique({
      where: { id },
    });

    if (!existing) {
      return next(new NotFoundError(`Size fee with id ${id} not found`));
    }

    // TODO: 检查是否有订单正在使用该尺码
    // 这里可以添加检查逻辑，如果有订单使用，则不允许删除或只标记为禁用

    // 删除尺码配置
    await prisma.offline_order_size_fees.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: `Size fee ${existing.size} deleted successfully`,
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error deleting size fee:', error);
    next(new InternalServerError('Failed to delete size fee'));
  }
};


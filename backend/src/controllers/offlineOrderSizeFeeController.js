// PRD v2.0: 线下订单尺码费用管理控制器
// 从备份文件恢复
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');

const ALLOWED_SIZES = ['2XL', '3XL', '4XL', '5XL'];

/**
 * 获取尺码费用列表
 * GET /api/admin/offline-order-size-fees
 */
exports.getSizeFees = async (req, res, next) => {
  try {
    const sizeFees = await prisma.offline_order_size_fees.findMany({
      orderBy: { size: 'asc' },
    });

    res.json({
      success: true,
      data: sizeFees.map((sf) => ({
        id: sf.id,
        size: sf.size,
        additionalFee: Number(sf.additional_fee),
      })),
      count: sizeFees.length,
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error getting size fees:', error);
    next(new InternalServerError('Failed to get size fees'));
  }
};

/**
 * 批量更新尺码费用
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
      if (!sf.size || !ALLOWED_SIZES.includes(sf.size)) {
        return next(new BadRequestError(`Invalid size: ${sf.size}. Allowed sizes: ${ALLOWED_SIZES.join(', ')}`));
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
            updated_at: new Date(),
          },
          create: {
            id: uuidv4(),
            size: sf.size,
            additional_fee: sf.additionalFee,
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
        additionalFee: Number(sf.additional_fee),
      })),
    });
  } catch (error) {
    logger.error('[offlineOrderSizeFeeController] Error updating size fees:', error);
    next(new InternalServerError('Failed to update size fees'));
  }
};


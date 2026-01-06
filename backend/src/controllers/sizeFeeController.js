/**
 * 公共尺码费用控制器（供Design Lab使用）
 * GET /api/size-fees - 返回所有启用的尺码配置
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { InternalServerError } = require('../utils/errors');

/**
 * 获取所有启用的尺码配置
 * GET /api/size-fees
 * 只返回 is_active=true 的尺码，按 display_order 和 size 排序
 */
exports.getSizeFees = async (req, res, next) => {
  try {
    const sizeFees = await prisma.offline_order_size_fees.findMany({
      where: {
        is_active: true,
      },
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
      })),
      count: sizeFees.length,
    });
  } catch (error) {
    logger.error('[sizeFeeController] Error getting size fees:', error);
    next(new InternalServerError('Failed to get size fees'));
  }
};


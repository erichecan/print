/**
 * Offline Order Size Fee Controller
 * [2025-12-06 17:50:00] PRD v2.0: 尺码额外费用配置 API
 * [2025-12-06 12:00:00] Enhanced with unified error handling
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  BadRequestError,
  InternalServerError,
} = require('../utils/errors');

/**
 * GET /api/admin/offline-order-size-fees
 * 获取所有尺码费用配置
 */
exports.getSizeFees = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const sizeFees = await prisma.offlineOrderSizeFee.findMany({
      orderBy: { size: 'asc' },
    });

    // [2025-12-06 17:50:00] 如果配置为空，返回默认值
    const defaultSizes = ['2XL', '3XL', '4XL', '5XL'];
    const defaultFees = {
      '2XL': 2.5,
      '3XL': 3.5,
      '4XL': 4.5,
      '5XL': 5.5,
    };

    const sizeFeeMap = {};
    sizeFees.forEach((sf) => {
      sizeFeeMap[sf.size] = parseFloat(sf.additionalFee);
    });

    // [2025-12-06 17:50:00] 合并默认值（如果配置中没有）
    const result = defaultSizes.map((size) => ({
      size,
      additionalFee: sizeFeeMap[size] || defaultFees[size],
    }));

    logger.info('[OfflineOrderSizeFee] Get size fees', { timestamp });
    res.json({ data: result });
  } catch (error) {
    logger.error('[OfflineOrderSizeFee] Get size fees error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('无法获取尺码费用配置，请稍后重试'));
  }
};

/**
 * PATCH /api/admin/offline-order-size-fees
 * 批量更新尺码费用配置
 */
exports.updateSizeFees = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { sizeFees } = req.body; // [{ size: '2XL', additionalFee: 2.5 }, ...]

    if (!Array.isArray(sizeFees)) {
      return next(new BadRequestError('尺码费用配置必须是一个数组', {
        received: typeof sizeFees,
      }));
    }

    const validSizes = ['2XL', '3XL', '4XL', '5XL'];
    const updates = [];

    for (const item of sizeFees) {
      if (!validSizes.includes(item.size)) {
        return next(new BadRequestError(`无效的尺码: ${item.size}`, {
          validSizes,
          received: item.size,
        }));
      }

      const fee = parseFloat(item.additionalFee);
      if (isNaN(fee) || fee < 0) {
        return next(new BadRequestError(`尺码 ${item.size} 的费用无效，必须为非负数`, {
          size: item.size,
          received: item.additionalFee,
        }));
      }

      updates.push(
        prisma.offlineOrderSizeFee.upsert({
          where: { size: item.size },
          update: { additionalFee: fee },
          create: {
            size: item.size,
            additionalFee: fee,
          },
        })
      );
    }

    const results = await Promise.all(updates);

    logger.info('[OfflineOrderSizeFee] Update size fees', { timestamp, count: results.length });
    res.json({ data: results });
  } catch (error) {
    logger.error('[OfflineOrderSizeFee] Update size fees error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('更新尺码费用配置失败，请稍后重试'));
  }
};


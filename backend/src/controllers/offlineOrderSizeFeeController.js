/**
 * Offline Order Size Fee Controller
 * [2025-12-06 17:50:00] PRD v2.0: 尺码额外费用配置 API
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

/**
 * GET /api/admin/offline-order-size-fees
 * 获取所有尺码费用配置
 */
exports.getSizeFees = async (req, res) => {
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
    res.status(500).json({ error: 'Failed to get size fees' });
  }
};

/**
 * PATCH /api/admin/offline-order-size-fees
 * 批量更新尺码费用配置
 */
exports.updateSizeFees = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { sizeFees } = req.body; // [{ size: '2XL', additionalFee: 2.5 }, ...]

    if (!Array.isArray(sizeFees)) {
      return res.status(400).json({ error: 'sizeFees must be an array' });
    }

    const validSizes = ['2XL', '3XL', '4XL', '5XL'];
    const updates = [];

    for (const item of sizeFees) {
      if (!validSizes.includes(item.size)) {
        return res.status(400).json({ error: `Invalid size: ${item.size}` });
      }

      const fee = parseFloat(item.additionalFee);
      if (isNaN(fee) || fee < 0) {
        return res.status(400).json({ error: `Invalid fee for size ${item.size}` });
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
    res.status(500).json({ error: 'Failed to update size fees' });
  }
};


// [2026-03-13 05:25:00] 批量回填线下订单成本快照 pricing.costTotal
// 用法：
//   node scripts/backfill_offline_order_cost_snapshot.js
//
// 注意：
// - 只更新 configuration 中缺少 pricing.costTotal 的订单（避免重复覆盖）
// - 成本定义：Σ(产品 unit_cost × 件数) + Σ(大码附加费 additional_fee × 件数)
// - 不包含 DST / Rush / 印刷费用

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const prisma = require('../backend/src/lib/prisma');
const { computeCostTotalFromConfig } = require('../backend/src/controllers/offlineOrderController');

async function main() {
  console.log('🧮 开始批量回填线下订单成本快照 pricing.costTotal ...');

  const batchSize = 200;
  let skip = 0;
  let processed = 0;
  let updated = 0;

  // 只选出 configuration 为 JSON 且缺少 pricing.costTotal 的订单
  // sqlite/postgres 的 jsonb 查询写在 JS 里做判断，避免兼容性问题
  while (true) {
    const orders = await prisma.offlineOrder.findMany({
      skip,
      take: batchSize,
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        orderCode: true,
        configuration: true,
      },
    });

    if (!orders || orders.length === 0) {
      break;
    }

    for (const order of orders) {
      processed += 1;

      const config = order.configuration;
      if (!config || typeof config !== 'object') {
        continue;
      }

      const existingCost =
        config.pricing && (config.pricing.costTotal !== undefined && config.pricing.costTotal !== null);

      // 已经有成本快照的订单跳过，避免覆盖
      if (existingCost) {
        continue;
      }

      try {
        const costTotal = await computeCostTotalFromConfig(config);

        // 没有产品项或者计算结果为 0 也允许写入 0（代表计算已执行）
        const newConfig = {
          ...config,
          pricing: {
            ...(config.pricing || {}),
            costTotal,
          },
        };

        await prisma.offlineOrder.update({
          where: { id: order.id },
          data: {
            configuration: newConfig,
          },
        });

        updated += 1;
        console.log(
          `✅ 回填完成：orderCode=${order.orderCode}, costTotal=${costTotal.toFixed(2)}`,
        );
      } catch (error) {
        console.warn(
          `⚠️ 订单回填失败，orderCode=${order.orderCode}, error=${error.message}`,
        );
      }
    }

    skip += batchSize;
  }

  console.log('🎯 批量回填完成：', { processed, updated });
}

main()
  .catch((err) => {
    console.error('❌ 脚本执行失败：', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


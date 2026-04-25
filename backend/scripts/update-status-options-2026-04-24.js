// 2026-04-24: 更新 offline_order_status_options
// 1. 重命名 "等 edwin" → "待印刷"
// 2. 新增 "需备货" 和 "待绣花"
// 3. 应用 stocking_status / purchase_status 列的 SQL 迁移

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Updating offline_order_status_options...');

  // 1. 应用新列（DDL）— 使用 $executeRawUnsafe 以支持 IF NOT EXISTS
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "stocking_status" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "offline_orders" ADD COLUMN IF NOT EXISTS "purchase_status" TEXT`);
    console.log('✅ DDL: stocking_status / purchase_status columns ensured');
  } catch (err) {
    console.warn('⚠️  DDL warning (may already exist):', err.message);
  }

  // 2. 重命名 "等 edwin" → "待印刷"
  const edwinOpt = await prisma.offlineOrderStatusOption.findFirst({
    where: { value: '等 edwin' }
  });
  if (edwinOpt) {
    await prisma.offlineOrderStatusOption.update({
      where: { id: edwinOpt.id },
      data: { value: '待印刷', label: '待印刷' }
    });
    // 同步更新已有订单的 status 字段
    await prisma.offlineOrder.updateMany({
      where: { status: '等 edwin' },
      data: { status: '待印刷' }
    });
    console.log('✅ Renamed "等 edwin" → "待印刷" (and updated existing orders)');
  } else {
    console.log('ℹ️  "等 edwin" not found, skipping rename');
  }

  // 3. 新增 "需备货"
  const existing1 = await prisma.offlineOrderStatusOption.findFirst({ where: { value: '需备货' } });
  if (!existing1) {
    // 找最大 sortOrder
    const maxOpt = await prisma.offlineOrderStatusOption.findFirst({ orderBy: { sortOrder: 'desc' } });
    const nextSort = (maxOpt?.sortOrder ?? 0) + 1;
    await prisma.offlineOrderStatusOption.create({
      data: { value: '需备货', label: '需备货', sortOrder: nextSort, isSystem: true }
    });
    console.log('✅ Added "需备货"');
  } else {
    console.log('ℹ️  "需备货" already exists');
  }

  // 4. 新增 "待绣花"
  const existing2 = await prisma.offlineOrderStatusOption.findFirst({ where: { value: '待绣花' } });
  if (!existing2) {
    const maxOpt = await prisma.offlineOrderStatusOption.findFirst({ orderBy: { sortOrder: 'desc' } });
    const nextSort = (maxOpt?.sortOrder ?? 0) + 1;
    await prisma.offlineOrderStatusOption.create({
      data: { value: '待绣花', label: '待绣花', sortOrder: nextSort, isSystem: true }
    });
    console.log('✅ Added "待绣花"');
  } else {
    console.log('ℹ️  "待绣花" already exists');
  }

  console.log('✅ Done');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

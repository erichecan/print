// [2025-01-11 14:50:00] 修复 products 表的 base_price 列问题
// 自动检查并修复 base_price 和 base_price_cents 列

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function fixBasePriceColumn() {
  try {
    console.log('🔍 检查 products 表结构...');

    // 检查 base_price_cents 列是否存在
    const checkBasePriceCents = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'base_price_cents'
    `;

    const hasBasePriceCents = Array.isArray(checkBasePriceCents) && checkBasePriceCents.length > 0;

    if (!hasBasePriceCents) {
      console.log('➕ 添加 base_price_cents 列...');
      await prisma.$executeRaw`
        ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "base_price_cents" INTEGER NOT NULL DEFAULT 0
      `;
      console.log('✅ base_price_cents 列已添加');
    } else {
      console.log('✅ base_price_cents 列已存在');
    }

    // 检查 base_price 列是否存在
    const checkBasePrice = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name = 'base_price'
    `;

    const hasBasePrice = Array.isArray(checkBasePrice) && checkBasePrice.length > 0;

    if (hasBasePrice) {
      console.log('🔄 从 base_price 迁移数据到 base_price_cents...');
      
      // 迁移数据
      await prisma.$executeRaw`
        UPDATE "products"
        SET "base_price_cents" = COALESCE(ROUND("base_price" * 100)::INTEGER, 0)
        WHERE "base_price_cents" = 0
      `;

      // 删除旧列
      console.log('🗑️  删除 base_price 列...');
      await prisma.$executeRaw`
        ALTER TABLE "products" DROP COLUMN IF EXISTS "base_price"
      `;
      
      console.log('✅ 数据迁移完成，旧列已删除');
    } else {
      console.log('ℹ️  base_price 列不存在，无需迁移');
    }

    // 移除默认值
    console.log('🔧 移除 base_price_cents 的默认值...');
    try {
      await prisma.$executeRaw`
        ALTER TABLE "products" ALTER COLUMN "base_price_cents" DROP DEFAULT
      `;
      console.log('✅ 默认值已移除');
    } catch (error) {
      // 如果默认值不存在，忽略错误
      if (!error.message.includes('does not exist')) {
        throw error;
      }
      console.log('ℹ️  默认值不存在，跳过');
    }

    // 验证修复结果
    console.log('\n📊 验证修复结果...');
    const finalCheck = await prisma.$queryRaw`
      SELECT 
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'products' 
      AND column_name IN ('base_price', 'base_price_cents')
      ORDER BY column_name
    `;

    console.log('\n当前 products 表的列：');
    console.table(finalCheck);

    // 检查产品数量
    const productCount = await prisma.product.count();
    console.log(`\n📦 数据库中产品数量: ${productCount}`);

    if (productCount > 0) {
      const sampleProduct = await prisma.product.findFirst({
        select: {
          id: true,
          name: true,
          basePrice: true,
        },
      });
      console.log('\n示例产品:');
      console.log(sampleProduct);
    }

    console.log('\n✅ 修复完成！');
  } catch (error) {
    console.error('\n❌ 修复失败:', error.message);
    console.error('错误详情:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行修复
fixBasePriceColumn()
  .then(() => {
    console.log('\n🎉 所有操作完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 执行失败:', error);
    process.exit(1);
  });


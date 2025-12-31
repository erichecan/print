/**
 * 禁用旧的 seed 数据商品脚本
* 禁用旧的 seed 数据商品，只保留新导入的 Custom Ink 商品
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 旧的 seed 数据商品列表（需要禁用的）
const OLD_SEED_PRODUCTS = [
  'Unstructured Dad Cap',
  'test',
  'Midweight Fleece Hoodie',
  'Classic Trucker Hat',
  'Gildan Softstyle Jersey T‑shirt', // 旧的版本
  'Classic Crew Tee',
  'Relaxed Fit Tee',
  'Classic 11oz Mug',
  'Color Rim Mug',
  'Structured Trucker Cap',
  '特思通'
];

// 旧的 seed 数据商品 slug 列表
const OLD_SEED_SLUGS = [
  'unstructured-dad-cap',
  'test',
  'midweight-fleece-hoodie',
  'classic-trucker-hat',
  'gildan-softstyle-jersey-tee', // 旧的版本（与新导入的 176100 不同）
  'classic-crew-tee',
  'relaxed-fit-tee',
  'classic-11oz-mug',
  'color-rim-mug',
  'structured-trucker-cap',
  't'
];

async function main() {
  console.log('🔧 开始禁用旧的 seed 数据商品...\n');
  
  try {
    // 通过名称禁用
    const byName = await prisma.product.updateMany({
      where: {
        name: {
          in: OLD_SEED_PRODUCTS
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`  ✅ 通过名称禁用了 ${byName.count} 个商品`);
    
    // 通过 slug 禁用
    const bySlug = await prisma.product.updateMany({
      where: {
        slug: {
          in: OLD_SEED_SLUGS
        },
        isActive: true
      },
      data: {
        isActive: false
      }
    });
    
    console.log(`  ✅ 通过 slug 禁用了 ${bySlug.count} 个商品`);
    
    // 统计结果
    const activeCount = await prisma.product.count({
      where: { isActive: true }
    });
    
    const inactiveCount = await prisma.product.count({
      where: { isActive: false }
    });
    
    console.log(`\n📊 统计结果：`);
    console.log(`  - 激活商品: ${activeCount} 个`);
    console.log(`  - 禁用商品: ${inactiveCount} 个`);
    
    // 显示激活的商品列表
    const activeProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        name: true,
        slug: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    });
    
    console.log(`\n✅ 当前激活的商品（前 20 个）：`);
    activeProducts.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.slug})`);
    });
    
    console.log('\n✨ 完成！');
    
  } catch (error) {
    console.error('❌ 错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ 执行失败:', error);
    process.exit(1);
  });
}

module.exports = { main };


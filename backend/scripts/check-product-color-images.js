/**
 * 检查 product_color_images 表中的实际数据
 * [2025-01-30 20:30:00] 检查数据库中是否有颜色图片映射数据
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductColorImages() {
  console.log('🔍 开始检查 product_color_images 表数据...\n');

  try {
    // 检查总数
    const totalCount = await prisma.productColorImage.count();
    console.log(`📊 总记录数: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  警告: product_color_images 表中没有数据！');
      console.log('💡 建议: 运行以下命令导入数据：');
      console.log('   node backend/scripts/import-color-mapping.js\n');
      return;
    }

    // 检查活跃记录数
    const activeCount = await prisma.productColorImage.count({
      where: { isActive: true }
    });
    console.log(`✅ 活跃记录数: ${activeCount}`);
    console.log(`❌ 非活跃记录数: ${totalCount - activeCount}\n`);

    // 检查已验证记录数
    const verifiedCount = await prisma.productColorImage.count({
      where: { isVerified: true }
    });
    console.log(`✓ 已验证记录数: ${verifiedCount}`);
    console.log(`✗ 未验证记录数: ${totalCount - verifiedCount}\n`);

    // 按产品分组统计
    console.log('📦 按产品分组统计:');
    const products = await prisma.productColorImage.groupBy({
      by: ['customInkProductId'],
      _count: {
        id: true
      }
    });

    for (const product of products) {
      console.log(`   - 产品 ID: ${product.customInkProductId}`);
      console.log(`     颜色数量: ${product._count.id}`);
    }
    console.log('');

    // 获取所有记录（限制前20条）
    console.log('📋 前20条记录详情:');
    const records = await prisma.productColorImage.findMany({
      take: 20,
      orderBy: [
        { customInkProductId: 'asc' },
        { colorName: 'asc' }
      ]
    });

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      console.log(`\n   ${i + 1}. ${record.colorName} (ID: ${record.customInkColorId})`);
      console.log(`      产品 ID: ${record.customInkProductId}`);
      console.log(`      颜色 Hex: ${record.colorHex || 'N/A'}`);
      console.log(`      状态: ${record.isActive ? '✅ 活跃' : '❌ 非活跃'} | ${record.isVerified ? '✓ 已验证' : '✗ 未验证'}`);
      
      // 检查图片 URL
      const imageUrls = record.imageUrls;
      if (imageUrls) {
        console.log(`      图片 URL:`);
        if (imageUrls.front) {
          console.log(`        - Front: ${imageUrls.front.substring(0, 80)}...`);
        }
        if (imageUrls.back) {
          console.log(`        - Back: ${imageUrls.back.substring(0, 80)}...`);
        }
        if (imageUrls.sleeve) {
          console.log(`        - Sleeve: ${imageUrls.sleeve.substring(0, 80)}...`);
        }
      } else {
        console.log(`      图片 URL: ❌ 无数据`);
      }
    }

    // 统计颜色分布
    console.log('\n🎨 颜色分布统计:');
    const colorStats = await prisma.productColorImage.groupBy({
      by: ['colorName'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    for (const stat of colorStats) {
      console.log(`   - ${stat.colorName}: ${stat._count.id} 条记录`);
    }

    // 检查 GCS URL 数量
    console.log('\n☁️  GCS URL 统计:');
    const allRecords = await prisma.productColorImage.findMany({
      where: { isActive: true }
    });

    let gcsUrlCount = 0;
    let customInkUrlCount = 0;
    let missingUrlCount = 0;

    for (const record of allRecords) {
      const imageUrls = record.imageUrls;
      if (imageUrls && imageUrls.front) {
        if (imageUrls.front.includes('storage.googleapis.com')) {
          gcsUrlCount++;
        } else if (imageUrls.front.includes('mms-images-prod.imgix.net')) {
          customInkUrlCount++;
        } else {
          missingUrlCount++;
        }
      } else {
        missingUrlCount++;
      }
    }

    console.log(`   - GCS URL: ${gcsUrlCount} 条`);
    console.log(`   - Custom Ink URL: ${customInkUrlCount} 条`);
    console.log(`   - 缺失 URL: ${missingUrlCount} 条`);

    // 检查特定产品的颜色映射
    const GILDAN_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';
    console.log(`\n🔍 检查 Gildan Softstyle 产品 (${GILDAN_PRODUCT_ID}):`);
    const gildanColors = await prisma.productColorImage.findMany({
      where: {
        customInkProductId: GILDAN_PRODUCT_ID,
        isActive: true
      },
      orderBy: { colorName: 'asc' }
    });

    console.log(`   找到 ${gildanColors.length} 种颜色:`);
    for (const color of gildanColors) {
      console.log(`   - ${color.colorName} (${color.customInkColorId})`);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
    if (error.message.includes('does not exist') || error.message.includes('not found')) {
      console.log('\n💡 提示: product_color_images 表可能不存在，需要运行数据库迁移：');
      console.log('   npx prisma migrate dev\n');
    }
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
if (require.main === module) {
  checkProductColorImages().catch(console.error);
}

module.exports = { checkProductColorImages };


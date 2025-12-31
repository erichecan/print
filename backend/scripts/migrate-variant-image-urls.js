/**
 * 迁移商品变体 imageUrl 数据
* 为所有商品变体填充 imageUrl 字段
 * 
 * 策略：
 * 1. 如果变体已有 imageUrl，跳过
 * 2. 如果商品有图片，使用第一张图片作为变体的 imageUrl
 * 3. 如果商品没有图片，使用默认图片
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// 默认图片 URL
const DEFAULT_IMAGE_URL = '/assets/hero/hero-card-tee.jpg';

/**
 * 获取商品的默认图片 URL
 */
async function getProductDefaultImage(productId) {
  // 1. 尝试获取商品的第一张图片
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
  });

  if (product && product.images && product.images.length > 0) {
    return product.images[0].url;
  }

  // 2. 如果没有图片，返回默认图片
  return DEFAULT_IMAGE_URL;
}

/**
 * 根据颜色生成图片 URL（如果商品有多个图片，可以根据颜色选择）
 */
function getImageUrlForColor(productImages, color) {
  if (!productImages || productImages.length === 0) {
    return null;
  }

  // 如果有多个图片，可以根据颜色选择
  // 这里简单返回第一张图片，后续可以根据实际需求优化
  return productImages[0].url;
}

/**
 * 迁移所有变体的 imageUrl
 */
async function migrateVariantImageUrls() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔧 开始迁移商品变体 imageUrl...\n`);

  try {
    // 1. 获取所有没有 imageUrl 的变体
    const variantsWithoutImage = await prisma.variant.findMany({
      where: {
        OR: [
          { imageUrl: null },
          { imageUrl: '' },
        ],
      },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    console.log(`📊 找到 ${variantsWithoutImage.length} 个需要更新 imageUrl 的变体\n`);

    if (variantsWithoutImage.length === 0) {
      console.log('✅ 所有变体都已包含 imageUrl');
      return;
    }

    // 2. 统计信息
    let updatedCount = 0;
    let skippedCount = 0;
    const updateStats = {
      fromProductImage: 0,
      fromDefault: 0,
    };

    // 3. 更新每个变体
    for (const variant of variantsWithoutImage) {
      let imageUrl = null;

      // 策略 1: 如果商品有图片，使用第一张图片
      if (variant.product && variant.product.images && variant.product.images.length > 0) {
        imageUrl = getImageUrlForColor(variant.product.images, variant.color);
        updateStats.fromProductImage++;
      } else {
        // 策略 2: 使用默认图片
        imageUrl = DEFAULT_IMAGE_URL;
        updateStats.fromDefault++;
      }

      // 更新变体
      await prisma.variant.update({
        where: { id: variant.id },
        data: {
          imageUrl: imageUrl,
        },
      });

      updatedCount++;

      if (updatedCount % 50 === 0) {
        console.log(`   已更新 ${updatedCount} 个变体...`);
      }
    }

    console.log(`\n✅ 迁移完成:`);
    console.log(`   - 更新: ${updatedCount} 个变体`);
    console.log(`   - 跳过: ${skippedCount} 个变体`);
    console.log(`   - 使用商品图片: ${updateStats.fromProductImage} 个`);
    console.log(`   - 使用默认图片: ${updateStats.fromDefault} 个`);

    // 4. 验证结果
    console.log(`\n🔍 验证结果...`);
    const remainingNull = await prisma.variant.count({
      where: {
        OR: [
          { imageUrl: null },
          { imageUrl: '' },
        ],
      },
    });

    if (remainingNull === 0) {
      console.log(`✅ 所有变体都已包含 imageUrl`);
    } else {
      console.warn(`⚠️  仍有 ${remainingNull} 个变体的 imageUrl 为空`);
    }

    // 5. 统计最终结果
    const totalVariants = await prisma.variant.count();
    const variantsWithImage = await prisma.variant.count({
      where: {
        imageUrl: { not: null },
      },
    });

    console.log(`\n📊 最终统计:`);
    console.log(`   - 总变体数: ${totalVariants}`);
    console.log(`   - 有 imageUrl: ${variantsWithImage}`);
    console.log(`   - 无 imageUrl: ${totalVariants - variantsWithImage}`);

  } catch (error) {
    console.error(`\n❌ 迁移过程中出错:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  migrateVariantImageUrls()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { migrateVariantImageUrls };


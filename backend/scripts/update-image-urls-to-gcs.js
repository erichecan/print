/**
 * 更新数据库中的图片 URL 为 GCP Cloud Storage URL
 * [2025-01-29 23:55:00] 将本地路径和 Custom Ink CDN URL 替换为 GCS URL
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// GCS 配置
const GCS_BUCKET = 'print-main-assets';
const GCS_BASE_URL = `https://storage.googleapis.com/${GCS_BUCKET}`;

// [2025-01-29 23:55:00] 将本地路径转换为 GCS URL
function localPathToGcsUrl(localPath) {
  if (!localPath) return null;
  
  // 如果已经是 GCS URL，直接返回
  if (localPath.startsWith('https://storage.googleapis.com/')) {
    return localPath;
  }
  
  // 如果是本地路径（如 /assets/products/...），转换为 GCS URL
  if (localPath.startsWith('/assets/')) {
    const gcsPath = localPath.replace('/assets/', '');
    return `${GCS_BASE_URL}/${gcsPath}`;
  }
  
  // 如果已经是相对路径（如 assets/products/...），直接拼接
  if (localPath.startsWith('assets/')) {
    return `${GCS_BASE_URL}/${localPath}`;
  }
  
  return null;
}

// [2025-01-29 23:55:00] 检查 URL 是否指向 Custom Ink CDN
function isCustomInkUrl(url) {
  if (!url) return false;
  return url.includes('customink.com') || 
         url.includes('mms-images') ||
         url.includes('customink.net');
}

// [2025-01-29 23:55:00] 更新商品图片 URL
async function updateProductImages() {
  console.log('📦 更新商品图片 URL...\n');
  
  try {
    // 获取所有商品图片
    const images = await prisma.productImage.findMany({
      include: {
        product: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    console.log(`找到 ${images.length} 张商品图片\n`);

    let updatedCount = 0;
    let deletedCount = 0;
    let skippedCount = 0;

    for (const image of images) {
      const oldUrl = image.url;
      
      // 如果是 Custom Ink CDN URL，删除记录
      if (isCustomInkUrl(oldUrl)) {
        await prisma.productImage.delete({
          where: { id: image.id },
        });
        console.log(`  🗑️  删除 Custom Ink 图片: ${oldUrl.substring(0, 60)}...`);
        deletedCount++;
        continue;
      }

      // 转换为 GCS URL
      const gcsUrl = localPathToGcsUrl(oldUrl);
      
      if (!gcsUrl) {
        console.log(`  ⚠️  无法转换 URL: ${oldUrl}`);
        skippedCount++;
        continue;
      }

      // 如果 URL 已更新，跳过
      if (oldUrl === gcsUrl) {
        skippedCount++;
        continue;
      }

      // 更新 URL
      await prisma.productImage.update({
        where: { id: image.id },
        data: { url: gcsUrl },
      });

      console.log(`  ✅ 更新: ${image.product.name}`);
      console.log(`     旧: ${oldUrl.substring(0, 60)}...`);
      console.log(`     新: ${gcsUrl}`);
      updatedCount++;
    }

    console.log(`\n✨ 商品图片更新完成！`);
    console.log(`   - 更新: ${updatedCount} 张`);
    console.log(`   - 删除: ${deletedCount} 张（Custom Ink CDN）`);
    console.log(`   - 跳过: ${skippedCount} 张\n`);

    return { updated: updatedCount, deleted: deletedCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ 更新商品图片失败:', error);
    throw error;
  }
}

// [2025-01-29 23:55:00] 更新品牌图片 URL
async function updateBrandImages() {
  console.log('🏷️  更新品牌图片 URL...\n');
  
  try {
    const brands = await prisma.brand.findMany({
      where: {
        logoUrl: {
          not: null,
        },
      },
    });

    console.log(`找到 ${brands.length} 个品牌有 logo\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const brand of brands) {
      if (!brand.logoUrl) continue;

      // 如果是 Custom Ink CDN URL，清空
      if (isCustomInkUrl(brand.logoUrl)) {
        await prisma.brand.update({
          where: { id: brand.id },
          data: { logoUrl: null },
        });
        console.log(`  🗑️  清空 Custom Ink logo: ${brand.name}`);
        continue;
      }

      // 转换为 GCS URL
      const gcsUrl = localPathToGcsUrl(brand.logoUrl);
      
      if (!gcsUrl) {
        skippedCount++;
        continue;
      }

      if (brand.logoUrl === gcsUrl) {
        skippedCount++;
        continue;
      }

      await prisma.brand.update({
        where: { id: brand.id },
        data: { logoUrl: gcsUrl },
      });

      console.log(`  ✅ 更新: ${brand.name}`);
      updatedCount++;
    }

    console.log(`\n✨ 品牌图片更新完成！`);
    console.log(`   - 更新: ${updatedCount} 个`);
    console.log(`   - 跳过: ${skippedCount} 个\n`);

    return { updated: updatedCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ 更新品牌图片失败:', error);
    throw error;
  }
}

// [2025-01-29 23:55:00] 更新分类图片 URL
async function updateCategoryImages() {
  console.log('📁 更新分类图片 URL...\n');
  
  try {
    const categories = await prisma.category.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
    });

    console.log(`找到 ${categories.length} 个分类有图片\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const category of categories) {
      if (!category.imageUrl) continue;

      // 如果是 Custom Ink CDN URL，清空
      if (isCustomInkUrl(category.imageUrl)) {
        await prisma.category.update({
          where: { id: category.id },
          data: { imageUrl: null },
        });
        console.log(`  🗑️  清空 Custom Ink 图片: ${category.name}`);
        continue;
      }

      // 转换为 GCS URL
      const gcsUrl = localPathToGcsUrl(category.imageUrl);
      
      if (!gcsUrl) {
        skippedCount++;
        continue;
      }

      if (category.imageUrl === gcsUrl) {
        skippedCount++;
        continue;
      }

      await prisma.category.update({
        where: { id: category.id },
        data: { imageUrl: gcsUrl },
      });

      console.log(`  ✅ 更新: ${category.name}`);
      updatedCount++;
    }

    console.log(`\n✨ 分类图片更新完成！`);
    console.log(`   - 更新: ${updatedCount} 个`);
    console.log(`   - 跳过: ${skippedCount} 个\n`);

    return { updated: updatedCount, skipped: skippedCount };
  } catch (error) {
    console.error('❌ 更新分类图片失败:', error);
    throw error;
  }
}

// [2025-01-29 23:55:00] 主函数
async function main() {
  console.log('🔧 开始更新数据库中的图片 URL 为 GCS URL...\n');
  console.log(`📦 GCS Bucket: ${GCS_BUCKET}`);
  console.log(`🌐 GCS Base URL: ${GCS_BASE_URL}\n`);

  try {
    // 更新商品图片
    const productResult = await updateProductImages();
    
    // 更新品牌图片
    const brandResult = await updateBrandImages();
    
    // 更新分类图片
    const categoryResult = await updateCategoryImages();

    console.log('\n🎉 所有图片 URL 更新完成！');
    console.log(`\n📊 统计:`);
    console.log(`   商品图片: 更新 ${productResult.updated}, 删除 ${productResult.deleted}, 跳过 ${productResult.skipped}`);
    console.log(`   品牌图片: 更新 ${brandResult.updated}, 跳过 ${brandResult.skipped}`);
    console.log(`   分类图片: 更新 ${categoryResult.updated}, 跳过 ${categoryResult.skipped}`);

  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { 
  updateProductImages, 
  updateBrandImages, 
  updateCategoryImages,
  localPathToGcsUrl,
  isCustomInkUrl,
};


/**
 * 更新商品图片 URL 为本地路径
 * [2025-01-28 22:35:00] 将数据库中的 Custom Ink CDN URL 替换为本地路径
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');
const prisma = new PrismaClient();

// [2025-01-28 22:35:00] 商品 slug 到本地图片路径的映射
const PRODUCT_IMAGE_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

async function updateImageUrls() {
  console.log('🔧 开始更新商品图片 URL 为本地路径...\n');
  
  try {
    // 获取所有激活的商品
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        images: {
          orderBy: { sortOrder: 'asc' }
        }
      }
    });
    
    console.log(`📦 找到 ${products.length} 个激活的商品\n`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      const productSlug = product.slug;
      const productImageDir = path.join(PRODUCT_IMAGE_DIR, productSlug);
      
      // 检查本地图片目录是否存在
      if (!fs.existsSync(productImageDir)) {
        console.log(`  ⚠️  商品 ${product.name} (${productSlug}) 没有本地图片目录，跳过`);
        skippedCount++;
        continue;
      }
      
      // 获取本地图片文件列表
      const localImages = fs.readdirSync(productImageDir)
        .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
        .sort((a, b) => {
          // 主图优先 (main.*)
          if (a.startsWith('main.') && !b.startsWith('main.')) return -1;
          if (!a.startsWith('main.') && b.startsWith('main.')) return 1;
          return a.localeCompare(b);
        });
      
      if (localImages.length === 0) {
        console.log(`  ⚠️  商品 ${product.name} (${productSlug}) 本地目录中没有图片文件，跳过`);
        skippedCount++;
        continue;
      }
      
      console.log(`  📦 ${product.name} (${productSlug})`);
      console.log(`     本地图片: ${localImages.length} 个`);
      
      // 更新或创建图片记录
      for (let i = 0; i < localImages.length; i++) {
        const filename = localImages[i];
        const localPath = `/assets/products/${productSlug}/${filename}`;
        
        // 检查数据库中是否已有这张图片（通过 URL 匹配）
        const existingImage = product.images.find(img => 
          img.url === localPath || 
          img.url?.includes(filename) ||
          (img.url?.includes('customink.com') && i === 0) // 第一个可能是主图
        );
        
        if (existingImage) {
          // 更新现有图片 URL
          if (existingImage.url !== localPath && existingImage.url?.includes('customink.com')) {
            await prisma.productImage.update({
              where: { id: existingImage.id },
              data: { url: localPath }
            });
            console.log(`     ✅ 更新图片 ${i + 1}: ${filename}`);
            updatedCount++;
          } else {
            console.log(`     ⏭️  图片 ${i + 1} 已经是本地路径: ${filename}`);
          }
        } else {
          // 创建新图片记录
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: localPath,
              alt: product.name,
              sortOrder: i
            }
          });
          console.log(`     ✅ 创建图片 ${i + 1}: ${filename}`);
          updatedCount++;
        }
      }
      
      // 删除数据库中指向 Custom Ink CDN 的图片记录
      const customInkImages = product.images.filter(img => 
        img.url?.includes('customink.com') || img.url?.includes('mms-images')
      );
      
      for (const oldImage of customInkImages) {
        // 检查是否已有对应的本地图片
        const hasLocal = localImages.some(filename => 
          product.images.some(img => img.url?.includes(filename))
        );
        
        if (!hasLocal) {
          await prisma.productImage.delete({
            where: { id: oldImage.id }
          });
          console.log(`     🗑️  删除旧的 CDN 图片: ${oldImage.url.substring(0, 60)}...`);
        }
      }
      
      console.log('');
    }
    
    console.log(`\n✨ 更新完成！`);
    console.log(`   - 更新/创建: ${updatedCount} 张图片`);
    console.log(`   - 跳过: ${skippedCount} 个商品`);
    console.log(`   - 错误: ${errorCount} 个商品`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  updateImageUrls()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { updateImageUrls };


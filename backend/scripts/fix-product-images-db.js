/**
 * [2025-01-29 19:35:00] 修复数据库中的商品图片记录
 * 
 * 这个脚本会：
 * 1. 检查数据库中的图片记录
 * 2. 为缺失图片的商品插入图片记录
 * 3. 更新图片 URL 为正确的前端服务 URL
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// 前端服务 URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://print-main-frontend-234065158862.us-central1.run.app';

// 本地图片目录
const PRODUCT_IMAGES_DIR = path.join(__dirname, '../../apps/web/public/assets/products');

/**
 * 检查本地图片文件
 */
function checkLocalImages(productSlug) {
  const productDir = path.join(PRODUCT_IMAGES_DIR, productSlug);
  
  if (!fs.existsSync(productDir)) {
    return [];
  }
  
  const files = fs.readdirSync(productDir).filter(file => {
    const ext = path.extname(file).toLowerCase();
    return ['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext);
  });
  
  // 排序：main.* 在前，然后按文件名排序
  files.sort((a, b) => {
    if (a.startsWith('main.')) return -1;
    if (b.startsWith('main.')) return 1;
    return a.localeCompare(b);
  });
  
  return files;
}

/**
 * 生成图片 URL
 */
function generateImageUrl(productSlug, filename) {
  return `${FRONTEND_URL}/assets/products/${productSlug}/${filename}`;
}

/**
 * 获取图片的 alt 文本
 */
function getImageAlt(productName, filename, index) {
  if (filename.startsWith('main.')) {
    return productName;
  }
  return `${productName} - Image ${index + 1}`;
}

/**
 * 主函数
 */
async function fixProductImages() {
  try {
    console.log('🔍 开始检查和修复商品图片记录...\n');
    
    // 1. 获取所有激活的商品
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { slug: 'asc' },
    });
    
    console.log(`📦 找到 ${products.length} 个激活商品\n`);
    
    let fixedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const product of products) {
      console.log(`\n处理商品: ${product.name} (${product.slug})`);
      
      // 检查本地图片文件
      const localImages = checkLocalImages(product.slug);
      
      if (localImages.length === 0) {
        console.log(`  ⚠️  没有找到本地图片文件`);
        skippedCount++;
        continue;
      }
      
      console.log(`  📸 找到 ${localImages.length} 张本地图片`);
      console.log(`  📊 数据库中已有 ${product.images.length} 张图片记录`);
      
      // 如果数据库中没有图片记录，或者图片数量不匹配，需要修复
      if (product.images.length === 0 || product.images.length !== localImages.length) {
        console.log(`  🔧 开始修复图片记录...`);
        
        try {
          // 删除现有的图片记录（如果有）
          if (product.images.length > 0) {
            await prisma.productImage.deleteMany({
              where: { productId: product.id },
            });
            console.log(`  🗑️  已删除 ${product.images.length} 条旧记录`);
          }
          
          // 创建新的图片记录
          const imageRecords = localImages.map((filename, index) => ({
            productId: product.id,
            url: generateImageUrl(product.slug, filename),
            alt: getImageAlt(product.name, filename, index),
            sortOrder: index,
          }));
          
          await prisma.productImage.createMany({
            data: imageRecords,
          });
          
          console.log(`  ✅ 已创建 ${imageRecords.length} 条图片记录`);
          fixedCount++;
        } catch (error) {
          console.error(`  ❌ 修复失败: ${error.message}`);
          errorCount++;
        }
      } else {
        // 检查 URL 是否需要更新
        let needsUpdate = false;
        const updatedRecords = [];
        
        for (let i = 0; i < localImages.length; i++) {
          const filename = localImages[i];
          const expectedUrl = generateImageUrl(product.slug, filename);
          const existingImage = product.images[i];
          
          if (!existingImage || existingImage.url !== expectedUrl) {
            needsUpdate = true;
            if (existingImage) {
              updatedRecords.push({
                id: existingImage.id,
                url: expectedUrl,
              });
            }
          }
        }
        
        if (needsUpdate && updatedRecords.length > 0) {
          console.log(`  🔄 更新 ${updatedRecords.length} 条图片 URL...`);
          
          for (const record of updatedRecords) {
            await prisma.productImage.update({
              where: { id: record.id },
              data: { url: record.url },
            });
          }
          
          console.log(`  ✅ URL 已更新`);
          fixedCount++;
        } else {
          console.log(`  ✅ 图片记录已是最新`);
          skippedCount++;
        }
      }
    }
    
    console.log(`\n\n📊 修复完成统计:`);
    console.log(`  ✅ 已修复: ${fixedCount} 个商品`);
    console.log(`  ⏭️  跳过: ${skippedCount} 个商品`);
    console.log(`  ❌ 错误: ${errorCount} 个商品`);
    
  } catch (error) {
    console.error('\n❌ 脚本执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  fixProductImages()
    .then(() => {
      console.log('\n✅ 脚本执行成功');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixProductImages };


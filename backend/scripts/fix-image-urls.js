// [2025-01-27 17:05:00] 批量修复数据库中的图片 URL
// 将 localhost:3001 替换为生产环境 URL，或将相对路径转换为完整 URL
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixImageUrls() {
  try {
    console.log('🔧 开始修复图片 URL...\n');

    const BACKEND_URL = process.env.BACKEND_URL || process.env.API_BASE_URL || 'https://print-mnmz.onrender.com';
    const LOCAL_URL = 'http://localhost:3001';

    // 获取所有图片
    const images = await prisma.$queryRaw`
      SELECT id, url, product_id
      FROM product_images
      WHERE url IS NOT NULL
    `;

    console.log(`📸 找到 ${images.length} 张图片需要检查\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const image of images) {
      let newUrl = image.url;
      let needsUpdate = false;

      // 如果包含 localhost:3001，替换为生产环境 URL
      if (image.url.includes('localhost:3001')) {
        newUrl = image.url.replace(/http:\/\/localhost:3001/g, BACKEND_URL);
        needsUpdate = true;
        console.log(`🔄 更新: ${image.url.substring(0, 60)}...`);
        console.log(`   → ${newUrl.substring(0, 60)}...`);
      }
      // 如果是相对路径（以 / 开头但不是完整 URL），转换为完整 URL
      else if (image.url.startsWith('/') && !image.url.startsWith('http')) {
        newUrl = `${BACKEND_URL}${image.url}`;
        needsUpdate = true;
        console.log(`🔄 更新相对路径: ${image.url}`);
        console.log(`   → ${newUrl}`);
      }
      // 如果已经是完整的外部 URL（http/https），保持不变
      else if (image.url.startsWith('http://') || image.url.startsWith('https://')) {
        if (!image.url.includes('localhost')) {
          skippedCount++;
          continue; // 跳过外部 URL
        }
      }

      if (needsUpdate) {
        await prisma.$executeRaw`
          UPDATE product_images
          SET url = ${newUrl}
          WHERE id = ${image.id}
        `;
        updatedCount++;
      } else {
        skippedCount++;
      }
    }

    console.log(`\n✅ 修复完成！`);
    console.log(`   更新: ${updatedCount} 张图片`);
    console.log(`   跳过: ${skippedCount} 张图片（已经是完整 URL）`);

  } catch (error) {
    console.error('❌ 修复图片 URL 时出错:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
    });
  } finally {
    await prisma.$disconnect();
  }
}

// 检查是否在生产环境
if (process.env.NODE_ENV === 'production' || process.env.FORCE_FIX === 'true') {
  fixImageUrls();
} else {
  console.log('⚠️  当前不是生产环境，如需强制修复请设置 FORCE_FIX=true');
  console.log('   或者设置 NODE_ENV=production');
  console.log('\n   示例: FORCE_FIX=true node scripts/fix-image-urls.js');
}


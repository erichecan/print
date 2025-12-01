/**
 * 从 GCS 图片文件创建数据库图片记录
 * [2025-01-29 23:55:00] 扫描 GCS 中的图片，为每个商品创建对应的图片记录
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const { Storage } = require('@google-cloud/storage');
const prisma = new PrismaClient();

// GCS 配置
const BUCKET_NAME = 'print-main-assets';
const PROJECT_ID = process.env.GCP_PROJECT_ID || 'moonlit-gamma-479502-r6';
const GCS_BASE_URL = `https://storage.googleapis.com/${BUCKET_NAME}`;

// 初始化 GCS
const storage = new Storage({ projectId: PROJECT_ID });
const bucket = storage.bucket(BUCKET_NAME);

// [2025-01-29 23:55:00] 从 GCS 获取所有商品图片文件
async function getGcsProductImages() {
  const [files] = await bucket.getFiles({ prefix: 'products/' });
  
  const productImages = {};
  
  for (const file of files) {
    const pathParts = file.name.split('/');
    if (pathParts.length >= 3) {
      const productSlug = pathParts[1]; // products/{slug}/filename
      const filename = pathParts[2];
      
      if (!productImages[productSlug]) {
        productImages[productSlug] = [];
      }
      
      productImages[productSlug].push({
        filename,
        gcsPath: file.name,
        url: `${GCS_BASE_URL}/${file.name}`,
      });
    }
  }
  
  return productImages;
}

// [2025-01-29 23:55:00] 为商品创建图片记录
async function createProductImages() {
  console.log('🔍 扫描 GCS 中的商品图片...\n');
  
  try {
    // 获取 GCS 中的所有商品图片
    const gcsImages = await getGcsProductImages();
    console.log(`📦 找到 ${Object.keys(gcsImages).length} 个商品的图片\n`);
    
    // 获取数据库中的所有商品
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
          },
        },
      },
    });
    
    console.log(`📦 数据库中有 ${products.length} 个激活的商品\n`);
    
    let createdCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const product of products) {
      const productSlug = product.slug;
      const gcsProductImages = gcsImages[productSlug] || [];
      
      if (gcsProductImages.length === 0) {
        console.log(`  ⚠️  ${product.name} (${productSlug}): GCS 中没有图片，跳过`);
        skippedCount++;
        continue;
      }
      
      // 按文件名排序（main.* 优先）
      gcsProductImages.sort((a, b) => {
        if (a.filename.startsWith('main.') && !b.filename.startsWith('main.')) return -1;
        if (!a.filename.startsWith('main.') && b.filename.startsWith('main.')) return 1;
        return a.filename.localeCompare(b.filename);
      });
      
      console.log(`  📦 ${product.name} (${productSlug}): ${gcsProductImages.length} 张图片`);
      
      // 检查数据库中是否已有图片记录
      const existingImages = product.images || [];
      const existingUrls = new Set(existingImages.map(img => img.url));
      
      for (let i = 0; i < gcsProductImages.length; i++) {
        const gcsImage = gcsProductImages[i];
        const gcsUrl = gcsImage.url;
        
        // 检查是否已存在（通过 URL 匹配）
        const existingImage = existingImages.find(img => 
          img.url === gcsUrl || 
          img.url?.includes(gcsImage.filename) ||
          img.url?.includes(`products/${productSlug}/${gcsImage.filename}`)
        );
        
        if (existingImage) {
          // 如果 URL 不同，更新它
          if (existingImage.url !== gcsUrl) {
            await prisma.productImage.update({
              where: { id: existingImage.id },
              data: { url: gcsUrl },
            });
            console.log(`     ✅ 更新: ${gcsImage.filename} -> ${gcsUrl}`);
            updatedCount++;
          } else {
            console.log(`     ⏭️  已存在: ${gcsImage.filename}`);
          }
        } else {
          // 创建新图片记录
          await prisma.productImage.create({
            data: {
              productId: product.id,
              url: gcsUrl,
              alt: product.name,
              sortOrder: i,
            },
          });
          console.log(`     ✅ 创建: ${gcsImage.filename} -> ${gcsUrl}`);
          createdCount++;
        }
      }
      
      // 删除数据库中指向前端服务或本地路径的旧图片记录
      const oldImages = existingImages.filter(img => 
        img.url?.includes('print-main-frontend') ||
        img.url?.includes('/assets/products/') ||
        img.url?.startsWith('/assets/')
      );
      
      for (const oldImage of oldImages) {
        // 检查 GCS 中是否有对应的图片
        const hasGcsEquivalent = gcsProductImages.some(gcsImg => 
          oldImage.url?.includes(gcsImg.filename)
        );
        
        if (!hasGcsEquivalent) {
          await prisma.productImage.delete({
            where: { id: oldImage.id },
          });
          console.log(`     🗑️  删除旧图片: ${oldImage.url}`);
        }
      }
      
      console.log('');
    }
    
    console.log('\n✨ 图片记录创建完成！');
    console.log(`   - 创建: ${createdCount} 张`);
    console.log(`   - 更新: ${updatedCount} 张`);
    console.log(`   - 跳过: ${skippedCount} 个商品`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  createProductImages()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { createProductImages };


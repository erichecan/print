/**
 * 从 GCS JSON 文件导入颜色图片映射到数据库
 * [2025-01-30 20:45:00] 基于 docs/customink-product-images-gcs.json 导入数据
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// GCS JSON 文件路径（优先使用新的完整颜色数据）
const ALL_COLORS_FILE = path.join(__dirname, '../../docs/customink-analysis/all-colors-with-names.json');
const GCS_JSON_FILE = path.join(__dirname, '../../docs/customink-product-images-gcs.json');

// Gildan Softstyle Jersey T-shirt 的产品 ID
const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';

/**
 * 从颜色名称提取颜色 ID（基于原始 URL）
 */
function extractColorIdFromUrl(originalUrl) {
  // URL 格式: https://mms-images-prod.imgix.net/mms/images/catalog/{productId}/colors/{colorId}/views/alt/...
  const match = originalUrl.match(/\/colors\/(\d+)\//);
  return match ? match[1] : null;
}

/**
 * 导入颜色图片映射数据
 */
async function importColorImagesFromGcsJson() {
  console.log('🚀 开始导入颜色图片映射数据...\n');
  
  try {
    let colorsData = null;
    
    // 优先使用新的完整颜色数据
    if (fs.existsSync(ALL_COLORS_FILE)) {
      console.log('📄 使用完整颜色数据文件...\n');
      const allColorsData = JSON.parse(fs.readFileSync(ALL_COLORS_FILE, 'utf8'));
      colorsData = {
        products: [{
          productId: allColorsData.productId,
          productName: allColorsData.productName,
          images: allColorsData.colors.flatMap(color => [
            {
              colorName: color.colorName || `Color-${color.colorId}`,
              view: 'front',
              originalUrl: color.imageUrls.front,
              gcsUrl: color.imageUrls.front?.replace('mms-images-prod.imgix.net', 'storage.googleapis.com/print-main-product-images') || null
            },
            {
              colorName: color.colorName || `Color-${color.colorId}`,
              view: 'back',
              originalUrl: color.imageUrls.back,
              gcsUrl: color.imageUrls.back?.replace('mms-images-prod.imgix.net', 'storage.googleapis.com/print-main-product-images') || null
            },
            {
              colorName: color.colorName || `Color-${color.colorId}`,
              view: 'sleeve',
              originalUrl: color.imageUrls.sleeve,
              gcsUrl: color.imageUrls.sleeve?.replace('mms-images-prod.imgix.net', 'storage.googleapis.com/print-main-product-images') || null
            }
          ])
        }]
      };
    } else if (fs.existsSync(GCS_JSON_FILE)) {
      console.log('📄 使用 GCS JSON 文件...\n');
      colorsData = JSON.parse(fs.readFileSync(GCS_JSON_FILE, 'utf8'));
    } else {
      console.log('⚠️  颜色数据文件不存在:');
      console.log(`   ${ALL_COLORS_FILE}`);
      console.log(`   ${GCS_JSON_FILE}\n`);
      return;
    }
    
    const products = colorsData.products || [];
    
    console.log(`📋 找到 ${products.length} 个产品\n`);
    
    if (products.length === 0) {
      console.log('⚠️  没有找到产品数据\n');
      return;
    }
    
    // 准备批量导入数据
    const importData = [];
    
    for (const product of products) {
      const productId = product.productId || GILDAN_SOFTSTYLE_PRODUCT_ID;
      const images = product.images || [];
      
      // 按颜色分组
      const colorGroups = {};
      
      // 如果是 all-colors-with-names.json 格式
      if (products[0].images && products[0].images[0] && products[0].images[0].colorId) {
        // 新格式：直接从 colors 数组处理
        for (const color of products[0].images) {
          const colorName = color.colorName || `Color-${color.colorId}`;
          if (!colorGroups[colorName]) {
            colorGroups[colorName] = {
              colorName: colorName,
              front: null,
              back: null,
              sleeve: null,
              colorId: color.colorId
            };
          }
          
          // 从 imageUrls 中提取
          if (color.imageUrls) {
            colorGroups[colorName].front = color.imageUrls.front || null;
            colorGroups[colorName].back = color.imageUrls.back || null;
            colorGroups[colorName].sleeve = color.imageUrls.sleeve || null;
          }
        }
      } else {
        // 旧格式：从 images 数组处理
        for (const image of images) {
          const colorName = image.colorName;
          if (!colorName) continue;
          
          if (!colorGroups[colorName]) {
            colorGroups[colorName] = {
              colorName: colorName,
              front: null,
              back: null,
              sleeve: null,
              colorId: null
            };
          }
          
          // 提取颜色 ID（从第一个图片的 URL）
          if (!colorGroups[colorName].colorId && image.originalUrl) {
            colorGroups[colorName].colorId = extractColorIdFromUrl(image.originalUrl);
          }
          
          // 设置图片 URL（优先使用 GCS URL）
          const imageUrl = image.gcsUrl || image.originalUrl;
          if (image.view === 'front') {
            colorGroups[colorName].front = imageUrl;
          } else if (image.view === 'back') {
            colorGroups[colorName].back = imageUrl;
          } else if (image.view === 'sleeve') {
            colorGroups[colorName].sleeve = imageUrl;
          }
        }
      }
      
      // 转换为导入数据格式
      for (const [colorName, colorData] of Object.entries(colorGroups)) {
        if (!colorData.colorId) {
          console.log(`⚠️  跳过 ${colorName}：无法提取颜色 ID`);
          continue;
        }
        
        importData.push({
          productId: null, // productId 可以为 null，我们使用 customInkProductId 来标识
          customInkProductId: productId,
          customInkColorId: colorData.colorId,
          colorName: colorName,
          colorHex: null, // GCS JSON 中没有 hex 值
          imageUrls: {
            front: colorData.front,
            back: colorData.back,
            sleeve: colorData.sleeve
          },
          isVerified: true, // GCS 中的图片都是已验证的
          isActive: true
        });
      }
    }
    
    console.log(`📦 准备导入 ${importData.length} 个颜色映射\n`);
    
    // 批量创建或更新
    let created = 0;
    let updated = 0;
    let failed = 0;
    
    for (const data of importData) {
      try {
        const existing = await prisma.productColorImage.findUnique({
          where: {
            customInkProductId_customInkColorId: {
              customInkProductId: data.customInkProductId,
              customInkColorId: data.customInkColorId
            }
          }
        });
        
        if (existing) {
          await prisma.productColorImage.update({
            where: { id: existing.id },
            data: {
              colorName: data.colorName,
              colorHex: data.colorHex,
              imageUrls: data.imageUrls,
              isVerified: data.isVerified,
              isActive: true
            }
          });
          updated++;
          console.log(`   ✅ 更新: ${data.colorName} (${data.customInkColorId})`);
        } else {
          // 先修改表结构，让 product_id 可以为 null（如果还没有修改）
          try {
            await prisma.$executeRawUnsafe(`
              ALTER TABLE product_color_images 
              ALTER COLUMN product_id DROP NOT NULL;
            `);
            console.log('   ℹ️  已修改表结构，允许 product_id 为 null');
          } catch (alterError) {
            // 如果已经修改过或出错，忽略
            if (!alterError.message.includes('does not exist') && !alterError.message.includes('already')) {
              // console.log('   ⚠️  修改表结构时出错（可能已经修改）:', alterError.message);
            }
          }
          
          // 使用原始 SQL 插入
          await prisma.$executeRawUnsafe(`
            INSERT INTO product_color_images (
              id, product_id, customink_product_id, customink_color_id, 
              color_name, color_hex, image_urls, is_verified, is_active, 
              created_at, updated_at
            ) VALUES (
              gen_random_uuid(), 
              NULL, 
              $1, 
              $2, 
              $3, 
              $4, 
              $5::jsonb, 
              $6, 
              $7, 
              NOW(), 
              NOW()
            )
          `, 
            data.customInkProductId,
            data.customInkColorId,
            data.colorName,
            data.colorHex,
            JSON.stringify(data.imageUrls),
            data.isVerified,
            data.isActive
          );
          created++;
          console.log(`   ✅ 创建: ${data.colorName} (${data.customInkColorId})`);
        }
      } catch (error) {
        failed++;
        console.error(`   ❌ 失败: ${data.colorName} (${data.customInkColorId}) - ${error.message}`);
      }
    }
    
    console.log('\n✅ 导入完成！');
    console.log(`   - 创建: ${created} 个`);
    console.log(`   - 更新: ${updated} 个`);
    if (failed > 0) {
      console.log(`   - 失败: ${failed} 个\n`);
    } else {
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
if (require.main === module) {
  importColorImagesFromGcsJson().catch(console.error);
}

module.exports = { importColorImagesFromGcsJson };


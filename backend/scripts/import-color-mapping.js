/**
 * 导入颜色映射数据到数据库
 * [2025-01-30 23:55:00] 从爬取脚本的输出文件导入颜色映射到数据库
 */
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// 颜色映射文件路径
const COLOR_MAPPING_FILE = path.join(__dirname, '../../docs/customink-analysis/color-mapping.json');

// Gildan Softstyle Jersey T-shirt 的产品 ID
const GILDAN_SOFTSTYLE_PRODUCT_ID = '6a62c76ef0978853a20391b6c32da4fe';

/**
 * 导入颜色映射数据
 */
async function importColorMapping() {
  console.log('🚀 开始导入颜色映射数据...\n');
  
  try {
    // 读取颜色映射文件
    if (!fs.existsSync(COLOR_MAPPING_FILE)) {
      console.log('⚠️  颜色映射文件不存在，请先运行爬取脚本:');
      console.log('   node scripts/scrape-customink-colors.js\n');
      return;
    }
    
    const colorData = JSON.parse(fs.readFileSync(COLOR_MAPPING_FILE, 'utf8'));
    const colorImages = colorData.colorData || {};
    
    console.log(`📋 找到 ${Object.keys(colorImages).length} 个颜色\n`);
    
    // 准备批量导入数据
    const importData = [];
    for (const [colorId, colorInfo] of Object.entries(colorImages)) {
      if (colorInfo.verified && colorInfo.name) {
        importData.push({
          customInkProductId: GILDAN_SOFTSTYLE_PRODUCT_ID,
          customInkColorId: colorId,
          colorName: colorInfo.name,
          colorHex: colorInfo.hex || null,
          imageUrls: colorInfo.imageUrls || {
            front: null,
            back: null,
            sleeve: null
          },
          isVerified: colorInfo.verified || false,
          isActive: true
        });
      }
    }
    
    console.log(`📦 准备导入 ${importData.length} 个颜色映射\n`);
    
    // 批量创建或更新
    let created = 0;
    let updated = 0;
    
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
          await prisma.productColorImage.create({
            data: data
          });
          created++;
          console.log(`   ✅ 创建: ${data.colorName} (${data.customInkColorId})`);
        }
      } catch (error) {
        console.error(`   ❌ 失败: ${data.colorName} (${data.customInkColorId}) - ${error.message}`);
      }
    }
    
    console.log('\n✅ 导入完成！');
    console.log(`   - 创建: ${created} 个`);
    console.log(`   - 更新: ${updated} 个\n`);
    
  } catch (error) {
    console.error('❌ 导入失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行
if (require.main === module) {
  importColorMapping().catch(console.error);
}

module.exports = { importColorMapping };


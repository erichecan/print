/**
 * [2025-01-29 23:00:00] 修复商品颜色属性脚本
 * 将所有商品的颜色属性统一为"黑"或"白"，并更新对应的 colorHex 值
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// [2025-01-29 23:35:00] 确保 Prisma Client 正确初始化
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

// 颜色映射规则：将现有颜色值映射到"黑"或"白"
const COLOR_MAPPING = {
  // 黑色系
  'black': '黑',
  'Black': '黑',
  'BLACK': '黑',
  'dark': '黑',
  'Dark': '黑',
  'DARK': '黑',
  'navy': '黑',
  'Navy': '黑',
  'NAVY': '黑',
  'charcoal': '黑',
  'Charcoal': '黑',
  'CHARCOAL': '黑',
  'gray': '黑',
  'Gray': '黑',
  'GRAY': '黑',
  'grey': '黑',
  'Grey': '黑',
  'GREY': '黑',
  'graphite': '黑',
  'Graphite': '黑',
  'GRAPHITE': '黑',
  
  // 白色系
  'white': '白',
  'White': '白',
  'WHITE': '白',
  'light': '白',
  'Light': '白',
  'LIGHT': '白',
  'cream': '白',
  'Cream': '白',
  'CREAM': '白',
  'ivory': '白',
  'Ivory': '白',
  'IVORY': '白',
  'natural': '白',
  'Natural': '白',
  'NATURAL': '白',
};

// 颜色对应的 hex 值
const COLOR_HEX = {
  '黑': '#000000',
  '白': '#FFFFFF',
};

/**
 * 根据颜色名称判断应该映射到"黑"还是"白"
 */
function mapColorToBlackOrWhite(colorName) {
  if (!colorName || colorName.trim() === '') {
    return null;
  }
  
  const trimmed = colorName.trim();
  
  // 如果已经是"黑"或"白"，直接返回
  if (trimmed === '黑' || trimmed === '白') {
    return trimmed;
  }
  
  // 检查映射表
  if (COLOR_MAPPING[trimmed]) {
    return COLOR_MAPPING[trimmed];
  }
  
  // 模糊匹配：检查是否包含黑色或白色关键词
  const lowerColor = trimmed.toLowerCase();
  
  // 黑色关键词
  const blackKeywords = ['black', 'dark', 'navy', 'charcoal', 'gray', 'grey', 'graphite', 'ebony', 'midnight'];
  if (blackKeywords.some(keyword => lowerColor.includes(keyword))) {
    return '黑';
  }
  
  // 白色关键词
  const whiteKeywords = ['white', 'light', 'cream', 'ivory', 'natural', 'beige', 'off-white'];
  if (whiteKeywords.some(keyword => lowerColor.includes(keyword))) {
    return '白';
  }
  
  // 默认：如果无法判断，根据颜色名称长度和常见模式判断
  // 较短的名称通常是基础颜色，较长的可能是复合颜色
  // 这里默认返回"黑"，但实际应该根据业务需求调整
  console.warn(`⚠️  无法确定颜色 "${colorName}" 的映射，默认设为"黑"`);
  return '黑';
}

async function fixProductColors() {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] 🔧 开始修复商品颜色属性...\n`);
  
  try {
    // 1. 获取所有变体
    const variants = await prisma.variant.findMany({
      select: {
        id: true,
        productId: true,
        color: true,
        colorHex: true,
        sku: true,
      },
    });
    
    console.log(`📊 找到 ${variants.length} 个变体需要检查\n`);
    
    if (variants.length === 0) {
      console.log('✅ 没有变体需要修复');
      return;
    }
    
    // 2. 统计当前颜色分布
    const colorStats = {};
    variants.forEach(v => {
      const color = v.color || 'NULL';
      colorStats[color] = (colorStats[color] || 0) + 1;
    });
    
    console.log('📈 当前颜色分布:');
    Object.entries(colorStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([color, count]) => {
        console.log(`   ${color}: ${count} 个变体`);
      });
    console.log('');
    
    // 3. 更新变体颜色
    let updatedCount = 0;
    let skippedCount = 0;
    const updateResults = {
      '黑': 0,
      '白': 0,
    };
    
    for (const variant of variants) {
      const originalColor = variant.color;
      const mappedColor = mapColorToBlackOrWhite(originalColor);
      
      if (!mappedColor) {
        console.warn(`⚠️  跳过变体 ${variant.sku}：无法映射颜色 "${originalColor}"`);
        skippedCount++;
        continue;
      }
      
      // 如果颜色已经是目标颜色且 hex 值正确，跳过
      if (originalColor === mappedColor && variant.colorHex === COLOR_HEX[mappedColor]) {
        skippedCount++;
        continue;
      }
      
      // 更新变体
      await prisma.variant.update({
        where: { id: variant.id },
        data: {
          color: mappedColor,
          colorHex: COLOR_HEX[mappedColor],
        },
      });
      
      updateResults[mappedColor]++;
      updatedCount++;
      
      if (updatedCount % 100 === 0) {
        console.log(`   已更新 ${updatedCount} 个变体...`);
      }
    }
    
    console.log(`\n✅ 颜色修复完成:`);
    console.log(`   - 更新: ${updatedCount} 个变体`);
    console.log(`   - 跳过: ${skippedCount} 个变体`);
    console.log(`   - 黑色: ${updateResults['黑']} 个`);
    console.log(`   - 白色: ${updateResults['白']} 个`);
    
    // 4. 确保每个商品至少有两个变体（黑色和白色）
    console.log(`\n🔍 检查每个商品是否都有黑白两种颜色的变体...`);
    
    const products = await prisma.product.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        variants: {
          select: {
            id: true,
            color: true,
            size: true,
            sku: true,
          },
        },
      },
    });
    
    let createdCount = 0;
    const { randomUUID } = require('crypto');
    
    for (const product of products) {
      const variantColors = new Set(product.variants.map(v => v.color));
      const hasBlack = variantColors.has('黑');
      const hasWhite = variantColors.has('白');
      
      // 获取第一个变体的 size 作为默认 size
      const defaultSize = product.variants[0]?.size || 'ONE';
      
      // 如果没有黑色变体，创建一个
      if (!hasBlack) {
        const blackSku = `${product.slug}-BLACK-${defaultSize}`;
        await prisma.variant.create({
          data: {
            id: randomUUID(),
            productId: product.id,
            color: '黑',
            colorHex: '#000000',
            size: defaultSize,
            sku: blackSku,
            priceAdjustment: 0,
            stockQuantity: 0,
          },
        });
        createdCount++;
        console.log(`   ✅ 为商品 "${product.name}" 创建黑色变体`);
      }
      
      // 如果没有白色变体，创建一个
      if (!hasWhite) {
        const whiteSku = `${product.slug}-WHITE-${defaultSize}`;
        await prisma.variant.create({
          data: {
            id: randomUUID(),
            productId: product.id,
            color: '白',
            colorHex: '#FFFFFF',
            size: defaultSize,
            sku: whiteSku,
            priceAdjustment: 0,
            stockQuantity: 0,
          },
        });
        createdCount++;
        console.log(`   ✅ 为商品 "${product.name}" 创建白色变体`);
      }
    }
    
    if (createdCount > 0) {
      console.log(`\n✅ 创建了 ${createdCount} 个缺失的变体`);
    } else {
      console.log(`\n✅ 所有商品都已具备黑白两种颜色的变体`);
    }
    
    // 5. 最终验证
    console.log(`\n🔍 最终验证...`);
    const finalStats = await prisma.variant.groupBy({
      by: ['color'],
      _count: true,
    });
    
    console.log('📊 最终颜色分布:');
    finalStats.forEach(stat => {
      console.log(`   ${stat.color || 'NULL'}: ${stat._count} 个变体`);
    });
    
    const nonBlackWhite = finalStats.filter(s => s.color !== '黑' && s.color !== '白');
    if (nonBlackWhite.length > 0) {
      console.warn(`\n⚠️  警告：仍有 ${nonBlackWhite.length} 种非黑白颜色`);
    } else {
      console.log(`\n✅ 所有变体颜色已统一为"黑"或"白"`);
    }
    
  } catch (error) {
    console.error(`\n❌ 修复过程中出错:`, error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  fixProductColors()
    .then(() => {
      console.log('\n✅ 脚本执行完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { fixProductColors, mapColorToBlackOrWhite };


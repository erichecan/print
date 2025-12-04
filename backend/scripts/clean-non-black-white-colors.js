#!/usr/bin/env node
/**
 * 清理数据库中除黑白之外的所有颜色变体
 * [2025-12-04 22:15:00] 删除所有颜色不是 Black/White/黑/白 的产品变体
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 允许的颜色值（不区分大小写）
const ALLOWED_COLORS = ['black', 'white', '黑', '白'];

function isAllowedColor(color) {
  if (!color || typeof color !== 'string') {
    return false;
  }
  const normalized = color.trim().toLowerCase();
  return ALLOWED_COLORS.some(allowed => 
    normalized === allowed.toLowerCase() || 
    normalized === allowed
  );
}

async function cleanNonBlackWhiteColors() {
  console.log('🔍 开始清理非黑白颜色的变体...\n');
  
  try {
    // 1. 统计当前变体情况
    const allVariants = await prisma.variant.findMany({
      select: {
        id: true,
        color: true,
        productId: true,
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });
    
    console.log(`📊 当前数据库变体总数: ${allVariants.length}`);
    
    // 统计颜色分布
    const colorStats = {};
    allVariants.forEach(v => {
      const color = v.color || 'NULL';
      colorStats[color] = (colorStats[color] || 0) + 1;
    });
    
    console.log('\n📈 颜色分布统计:');
    const sortedColors = Object.entries(colorStats).sort((a, b) => b[1] - a[1]);
    sortedColors.forEach(([color, count]) => {
      const isAllowed = isAllowedColor(color);
      const marker = isAllowed ? '✅' : '❌';
      console.log(`   ${marker} ${color}: ${count} 个变体`);
    });
    
    // 2. 找出需要删除的变体
    const variantsToDelete = allVariants.filter(v => !isAllowedColor(v.color));
    
    console.log(`\n🗑️  需要删除的变体数: ${variantsToDelete.length}`);
    
    if (variantsToDelete.length === 0) {
      console.log('✅ 数据库已经是干净状态，没有需要删除的变体！');
      return;
    }
    
    // 按产品分组显示
    const byProduct = {};
    variantsToDelete.forEach(v => {
      const productName = v.product?.name || 'Unknown';
      if (!byProduct[productName]) {
        byProduct[productName] = [];
      }
      byProduct[productName].push(v.color);
    });
    
    console.log('\n📋 需要删除的变体详情（按产品分组）:');
    Object.entries(byProduct).slice(0, 10).forEach(([productName, colors]) => {
      const uniqueColors = [...new Set(colors)];
      console.log(`   - ${productName}: ${uniqueColors.join(', ')}`);
    });
    if (Object.keys(byProduct).length > 10) {
      console.log(`   ... 还有 ${Object.keys(byProduct).length - 10} 个产品`);
    }
    
    // 3. 确认删除
    console.log('\n⚠️  准备删除以下变体:');
    console.log(`   - 总变体数: ${variantsToDelete.length}`);
    console.log(`   - 涉及产品数: ${Object.keys(byProduct).length}`);
    
    // 4. 先删除关联数据（cart_items, order_items 等）
    console.log('\n🗑️  开始删除关联数据...');
    
    // 获取要删除的变体 ID
    const variantIdsToDelete = variantsToDelete.map(v => v.id);
    
    // 删除购物车项
    const deletedCartItems = await prisma.cartItem.deleteMany({
      where: {
        variantId: {
          in: variantIdsToDelete,
        },
      },
    });
    console.log(`   - 删除购物车项: ${deletedCartItems.count} 个`);
    
    // 删除订单项（注意：订单项通常不应该删除，但这里是为了清理变体）
    // 实际上，我们应该保留订单项，只更新变体引用
    // 但为了简化，我们先检查是否有订单项引用这些变体
    const orderItemsCount = await prisma.orderItem.count({
      where: {
        variantId: {
          in: variantIdsToDelete,
        },
      },
    });
    if (orderItemsCount > 0) {
      console.log(`   ⚠️  警告: 有 ${orderItemsCount} 个订单项引用了这些变体，将保留订单项但变体可能无法访问`);
    }
    
    // 删除设计关联（如果有）
    const deletedDesigns = await prisma.design.deleteMany({
      where: {
        variantId: {
          in: variantIdsToDelete,
        },
      },
    });
    if (deletedDesigns.count > 0) {
      console.log(`   - 删除设计关联: ${deletedDesigns.count} 个`);
    }
    
    // 5. 执行删除变体
    console.log('\n🗑️  开始删除变体...');
    
    const deleteResult = await prisma.variant.deleteMany({
      where: {
        id: {
          in: variantIdsToDelete,
        },
      },
    });
    
    console.log(`✅ 成功删除 ${deleteResult.count} 个变体`);
    
    // 5. 验证清理结果
    console.log('\n🔍 验证清理结果...');
    const remainingVariants = await prisma.variant.findMany({
      select: {
        color: true,
      },
    });
    
    const remainingColorStats = {};
    remainingVariants.forEach(v => {
      const color = v.color || 'NULL';
      remainingColorStats[color] = (remainingColorStats[color] || 0) + 1;
    });
    
    console.log('\n📊 清理后的颜色分布:');
    Object.entries(remainingColorStats).sort((a, b) => b[1] - a[1]).forEach(([color, count]) => {
      const isAllowed = isAllowedColor(color);
      const marker = isAllowed ? '✅' : '⚠️';
      console.log(`   ${marker} ${color}: ${count} 个变体`);
    });
    
    // 检查是否还有非黑白颜色
    const remainingNonAllowed = remainingVariants.filter(v => !isAllowedColor(v.color));
    if (remainingNonAllowed.length > 0) {
      console.log(`\n⚠️  警告: 仍有 ${remainingNonAllowed.length} 个非黑白颜色的变体未删除`);
      const uniqueRemainingColors = [...new Set(remainingNonAllowed.map(v => v.color))];
      console.log(`   颜色: ${uniqueRemainingColors.join(', ')}`);
    } else {
      console.log('\n✅ 清理完成！所有变体现在只有黑白两种颜色。');
    }
    
    // 6. 检查是否有产品没有变体了
    const productsWithoutVariants = await prisma.product.findMany({
      where: {
        variants: {
          none: {},
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });
    
    if (productsWithoutVariants.length > 0) {
      console.log(`\n⚠️  警告: 有 ${productsWithoutVariants.length} 个产品现在没有变体了:`);
      productsWithoutVariants.slice(0, 10).forEach(p => {
        console.log(`   - ${p.name} (${p.slug})`);
      });
      if (productsWithoutVariants.length > 10) {
        console.log(`   ... 还有 ${productsWithoutVariants.length - 10} 个产品`);
      }
    }
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行清理
if (require.main === module) {
  cleanNonBlackWhiteColors()
    .then(() => {
      console.log('\n✨ 脚本执行完成！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ 脚本执行失败:', error);
      process.exit(1);
    });
}

module.exports = { cleanNonBlackWhiteColors };


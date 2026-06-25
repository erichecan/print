#!/usr/bin/env node
/**
 * 简单检查数据库中的产品和颜色数据
* 直接查询数据库
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log('🔍 检查数据库数据...\n');

  try {
    // 检查产品数据
    console.log('📦 产品数据 (offline_order_products):');
    try {
      const products = await prisma.offline_order_products.findMany({
        orderBy: [
          { display_order: 'asc' },
          { name: 'asc' },
        ],
      });
      console.log(`   总数: ${products.length}`);
      const active = products.filter(p => p.is_active);
      console.log(`   激活: ${active.length}`);
      console.log(`   未激活: ${products.length - active.length}`);
      if (products.length > 0) {
        console.log('\n   产品列表:');
        products.slice(0, 10).forEach((p, i) => {
          console.log(`   ${i + 1}. ${p.name} ${p.is_active ? '✅' : '❌'}`);
        });
        if (products.length > 10) {
          console.log(`   ... 还有 ${products.length - 10} 个产品`);
        }
      } else {
        console.log('   ⚠️  没有产品数据！');
      }
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }

    console.log('\n🎨 颜色数据 (offline_order_colors):');
    try {
      const colors = await prisma.offline_order_colors.findMany({
        orderBy: { name: 'asc' },
      });
      console.log(`   总数: ${colors.length}`);
      if (colors.length > 0) {
        console.log('\n   颜色列表:');
        colors.slice(0, 10).forEach((c, i) => {
          console.log(`   ${i + 1}. ${c.name}${c.hex_code ? ` (${c.hex_code})` : ''}`);
        });
        if (colors.length > 10) {
          console.log(`   ... 还有 ${colors.length - 10} 个颜色`);
        }
      } else {
        console.log('   ⚠️  没有颜色数据！');
      }
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
    }

    console.log('\n📊 总结:');
    console.log('   - 产品下拉菜单需要至少 1 个激活的产品');
    console.log('   - 颜色下拉菜单需要至少 1 个颜色');
    console.log('   - 如果数据为空，请运行 seed 脚本\n');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkData()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('❌ 失败:', error);
    process.exit(1);
  });


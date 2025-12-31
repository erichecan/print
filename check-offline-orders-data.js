#!/usr/bin/env node
/**
 * 检查线下订单产品和颜色数据
* 检查数据库中的产品和颜色下拉菜单数据
 */

// 使用项目中的 Prisma 客户端
const path = require('path');
const prisma = require(path.join(__dirname, 'backend/src/lib/prisma'));

async function checkData() {
  console.log('🔍 开始检查数据库数据...\n');

  try {
    // 检查产品数据
    console.log('📦 检查产品数据 (offline_order_products)...');
    try {
      const products = await prisma.offline_order_products.findMany({
        orderBy: [
          { display_order: 'asc' },
          { name: 'asc' },
        ],
      });

      console.log(`   找到 ${products.length} 个产品:`);
      if (products.length === 0) {
        console.log('   ⚠️  警告: 产品表为空！');
      } else {
        products.forEach((p, index) => {
          console.log(`   ${index + 1}. ${p.name} (ID: ${p.id})`);
          console.log(`      激活状态: ${p.is_active ? '✅ 激活' : '❌ 未激活'}`);
          console.log(`      客户自带: ${p.is_customer_owned ? '是' : '否'}`);
          console.log(`      显示顺序: ${p.display_order || 0}`);
          if (p.image_url) {
            console.log(`      图片: ${p.image_url}`);
          }
          console.log('');
        });
      }

      // 统计激活的产品
      const activeProducts = products.filter(p => p.is_active);
      console.log(`   ✅ 激活的产品: ${activeProducts.length} 个`);
      console.log(`   ❌ 未激活的产品: ${products.length - activeProducts.length} 个\n`);
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('   ⚠️  表 offline_order_products 不存在，需要运行数据库迁移！\n');
      }
    }

    // 检查颜色数据
    console.log('🎨 检查颜色数据 (offline_order_colors)...');
    try {
      const colors = await prisma.offline_order_colors.findMany({
        orderBy: { name: 'asc' },
      });

      console.log(`   找到 ${colors.length} 个颜色:`);
      if (colors.length === 0) {
        console.log('   ⚠️  警告: 颜色表为空！');
      } else {
        colors.forEach((c, index) => {
          console.log(`   ${index + 1}. ${c.name} (ID: ${c.id})`);
          if (c.hex_code) {
            console.log(`      颜色代码: ${c.hex_code}`);
          }
          console.log('');
        });
      }
      console.log(`   ✅ 总颜色数: ${colors.length} 个\n`);
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('   ⚠️  表 offline_order_colors 不存在，需要运行数据库迁移！\n');
      }
    }

    // 检查尺码费用配置
    console.log('💰 检查尺码费用配置 (offline_order_size_fees)...');
    try {
      const sizeFees = await prisma.offline_order_size_fees.findMany({
        orderBy: { size: 'asc' },
      });

      console.log(`   找到 ${sizeFees.length} 个尺码费用配置:`);
      if (sizeFees.length === 0) {
        console.log('   ⚠️  警告: 尺码费用表为空，将使用默认值！');
        console.log('   默认值:');
        console.log('     2XL: $2.50');
        console.log('     3XL: $3.50');
        console.log('     4XL: $4.50');
        console.log('     5XL: $5.50');
      } else {
        sizeFees.forEach((sf) => {
          console.log(`   ${sf.size}: $${sf.additional_fee}`);
        });
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('   ⚠️  表 offline_order_size_fees 不存在，将使用默认值！\n');
      }
    }

    // 检查可用性配置
    console.log('📋 检查产品-颜色-尺码可用性配置 (offline_order_product_color_sizes)...');
    try {
      const availability = await prisma.offline_order_product_color_sizes.findMany({
        where: { is_available: true },
      });

      console.log(`   找到 ${availability.length} 个可用性配置:`);
      if (availability.length === 0) {
        console.log('   ℹ️  没有可用性配置，所有尺码默认可用');
      } else {
        // 按产品分组显示
        const grouped = {};
        availability.forEach((a) => {
          const key = `${a.product_id}-${a.color_id}`;
          if (!grouped[key]) {
            grouped[key] = [];
          }
          grouped[key].push(a.size);
        });
        
        Object.keys(grouped).slice(0, 10).forEach((key) => {
          const [productId, colorId] = key.split('-');
          console.log(`   产品 ${productId} - 颜色 ${colorId}: ${grouped[key].join(', ')}`);
        });
        if (Object.keys(grouped).length > 10) {
          console.log(`   ... 还有 ${Object.keys(grouped).length - 10} 个配置`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ❌ 错误: ${error.message}`);
      if (error.message.includes('does not exist') || error.message.includes('not found')) {
        console.log('   ⚠️  表 offline_order_product_color_sizes 不存在，所有尺码默认可用！\n');
      }
    }

    // 总结
    console.log('📊 数据检查总结:');
    console.log('   - 产品下拉菜单: 需要至少 1 个激活的产品');
    console.log('   - 颜色下拉菜单: 需要至少 1 个颜色');
    console.log('   - 如果数据为空，请运行 seed 脚本或通过管理后台添加数据\n');

  } catch (error) {
    console.error('❌ 检查过程中发生错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行检查
checkData()
  .then(() => {
    console.log('✅ 检查完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });


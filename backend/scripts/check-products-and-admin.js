#!/usr/bin/env node
/**
 * [2025-11-28 17:20:00] 检查数据库中的商品和 Admin 用户数据
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkProductsAndAdmin() {
  try {
    console.log('=== 数据库数据检查 ===\n');
    
    // 1. 检查 Admin 用户
    console.log('1. 检查 Admin 用户...');
    const adminEmail = 'admin@suvernireplus.com';
    const adminUser = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    if (adminUser) {
      console.log(`✅ Admin 用户存在:`);
      console.log(`   邮箱: ${adminUser.email}`);
      console.log(`   角色: ${adminUser.role}`);
      console.log(`   已验证: ${adminUser.emailVerified ? '是' : '否'}\n`);
    } else {
      console.log(`❌ Admin 用户不存在！\n`);
      console.log('   建议：运行以下命令创建 admin 用户：');
      console.log('   node scripts/create-admin-user.js\n');
    }
    
    // 2. 检查商品数据
    console.log('2. 检查商品数据...');
    const productCount = await prisma.product.count();
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });
    
    console.log(`   商品总数: ${productCount}`);
    console.log(`   活跃商品数: ${activeProductCount}\n`);
    
    if (productCount === 0) {
      console.log('   ⚠️  数据库中没有商品数据！');
      console.log('   可能的原因：');
      console.log('   1. 数据库迁移未执行');
      console.log('   2. Seed 数据未运行');
      console.log('   3. 商品数据被删除\n');
      
      // 检查 products 表是否存在
      try {
        const tableExists = await prisma.$queryRaw`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'products'
          );
        `;
        console.log(`   products 表是否存在: ${tableExists[0].exists ? '是' : '否'}\n`);
      } catch (error) {
        console.log(`   ⚠️  无法检查表结构: ${error.message}\n`);
      }
    } else {
      // 显示前3个商品
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });
      
      console.log('   前3个商品:');
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (${product.slug}) - ${product.isActive ? '活跃' : '未激活'}`);
      });
    }
    
    // 3. 检查分类数据
    const categoryCount = await prisma.category.count();
    console.log(`\n3. 分类总数: ${categoryCount}`);
    
    // 4. 检查迁移状态
    console.log('\n4. 检查迁移状态...');
    try {
      const migrations = await prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC 
        LIMIT 5;
      `;
      
      if (migrations && migrations.length > 0) {
        console.log('   最近的迁移:');
        migrations.forEach((migration, index) => {
          console.log(`   ${index + 1}. ${migration.migration_name} - ${migration.finished_at || '未完成'}`);
        });
      } else {
        console.log('   ⚠️  未找到迁移记录');
      }
    } catch (error) {
      console.log(`   ⚠️  无法检查迁移状态: ${error.message}`);
    }
    
    console.log('\n=== 检查完成 ===\n');
    
  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkProductsAndAdmin();
}

module.exports = { checkProductsAndAdmin };


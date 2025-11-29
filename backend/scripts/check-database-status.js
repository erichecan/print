#!/usr/bin/env node
/**
 * [2025-11-28 17:10:00] 检查数据库状态 - Admin 用户和商品数据
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@suvernireplus.com';

async function checkDatabaseStatus() {
  try {
    console.log('=== 数据库状态检查 ===\n');
    
    // 1. 检查 Admin 用户
    console.log('1. 检查 Admin 用户...');
    const adminUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    
    if (adminUser) {
      console.log('✅ Admin 用户存在:');
      console.log(`   邮箱: ${adminUser.email}`);
      console.log(`   角色: ${adminUser.role}`);
      console.log(`   已验证: ${adminUser.emailVerified ? '是' : '否'}`);
      console.log(`   创建时间: ${adminUser.createdAt}`);
      console.log(`   更新时间: ${adminUser.updatedAt}\n`);
      
      // 验证密码（尝试登录）
      const testPassword = 'admin123';
      const testUser = await prisma.user.findUnique({
        where: { email: ADMIN_EMAIL },
      });
      
      if (testUser && testUser.passwordHash) {
        const isValidPassword = await bcrypt.compare(testPassword, testUser.passwordHash);
        console.log(`   密码验证: ${isValidPassword ? '✅ 正确' : '❌ 不正确'}\n`);
      } else {
        console.log(`   ⚠️  用户没有密码哈希\n`);
      }
    } else {
      console.log('❌ Admin 用户不存在\n');
    }
    
    // 2. 检查所有用户
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        emailVerified: true,
      },
      take: 10,
    });
    console.log(`2. 数据库中的用户总数: ${await prisma.user.count()}`);
    console.log('   前10个用户:');
    allUsers.forEach((user, index) => {
      console.log(`   ${index + 1}. ${user.email} (${user.role}) - ${user.emailVerified ? '已验证' : '未验证'}`);
    });
    console.log('');
    
    // 3. 检查商品数据
    console.log('3. 检查商品数据...');
    const productCount = await prisma.product.count();
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });
    
    console.log(`   商品总数: ${productCount}`);
    console.log(`   活跃商品数: ${activeProductCount}\n`);
    
    if (productCount === 0) {
      console.log('   ⚠️  数据库中没有商品数据！');
      console.log('   可能的原因：');
      console.log('   - 数据库迁移未执行');
      console.log('   - Seed 数据未运行');
      console.log('   - 商品数据被删除\n');
    } else {
      // 显示前5个商品
      const products = await prisma.product.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          isActive: true,
          basePrice: true,
          stockQuantity: true,
          category: {
            select: {
              name: true,
            },
          },
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
      });
      
      console.log('   前5个商品:');
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (${product.slug})`);
        console.log(`      状态: ${product.isActive ? '活跃' : '未激活'}`);
        console.log(`      价格: $${product.basePrice || 0}`);
        console.log(`      库存: ${product.stockQuantity || 0}`);
        console.log(`      分类: ${product.category?.name || '无'}\n`);
      });
    }
    
    // 4. 检查商品变体
    const variantCount = await prisma.productVariant.count();
    console.log(`4. 商品变体总数: ${variantCount}\n`);
    
    // 5. 检查分类
    const categoryCount = await prisma.category.count();
    const categories = await prisma.category.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
      },
      take: 10,
    });
    console.log(`5. 分类总数: ${categoryCount}`);
    if (categories.length > 0) {
      console.log('   前10个分类:');
      categories.forEach((cat, index) => {
        console.log(`   ${index + 1}. ${cat.name} (${cat.slug})`);
      });
    }
    console.log('');
    
    // 6. 检查数据库表是否存在
    console.log('6. 检查数据库表结构...');
    try {
      const tables = await prisma.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `;
      console.log(`   数据库表数量: ${tables.length}`);
      console.log('   表名列表:');
      tables.forEach((table, index) => {
        console.log(`   ${index + 1}. ${table.table_name}`);
      });
    } catch (error: any) {
      console.log(`   ⚠️  无法查询表结构: ${error.message}`);
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
  checkDatabaseStatus();
}

module.exports = { checkDatabaseStatus };


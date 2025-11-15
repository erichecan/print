#!/usr/bin/env node
/**
 * 修复管理员账户脚本
 * [2025-11-15 12:00:00] 创建或更新管理员账户，确保邮箱和密码正确
 * 
 * 使用方法:
 *   node scripts/fix-admin-user.js [DATABASE_URL]
 * 
 * 环境变量:
 *   DATABASE_URL - PostgreSQL 连接字符串（可选，也可以通过参数传入）
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 管理员账户配置
const ADMIN_EMAIL = 'admin@souvenirplus.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

async function fixAdminUser() {
  try {
    console.log('🔍 检查管理员账户...\n');

    // 检查是否已存在管理员账户
    const existingAdmin = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    if (existingAdmin) {
      console.log(`✅ 找到现有管理员账户: ${ADMIN_EMAIL}`);
      
      // 更新密码以确保正确
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          passwordHash: hashedPassword,
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      console.log('✅ 管理员账户密码已更新');
      console.log(`   邮箱: ${ADMIN_EMAIL}`);
      console.log(`   密码: ${ADMIN_PASSWORD}`);
      console.log(`   角色: ADMIN\n`);
    } else {
      console.log(`⚠️  未找到管理员账户，正在创建...\n`);
      
      // 创建新的管理员账户
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      const admin = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          firstName: ADMIN_FIRST_NAME,
          lastName: ADMIN_LAST_NAME,
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      console.log('✅ 管理员账户已创建');
      console.log(`   邮箱: ${ADMIN_EMAIL}`);
      console.log(`   密码: ${ADMIN_PASSWORD}`);
      console.log(`   角色: ADMIN`);
      console.log(`   ID: ${admin.id}\n`);
    }

    // 同时检查并更新旧的邮箱（如果存在）
    const oldAdmin = await prisma.user.findUnique({
      where: { email: 'admin@suvernireplus.com' },
    });

    if (oldAdmin) {
      console.log('⚠️  发现旧的管理员邮箱 (admin@suvernireplus.com)');
      console.log('   建议：可以删除或更新旧账户\n');
      
      // 可选：更新旧邮箱为新邮箱（如果新邮箱不存在）
      if (!existingAdmin) {
        await prisma.user.update({
          where: { email: 'admin@suvernireplus.com' },
          data: {
            email: ADMIN_EMAIL,
            passwordHash: await bcrypt.hash(ADMIN_PASSWORD, 10),
          },
        });
        console.log('✅ 已更新旧邮箱为新邮箱\n');
      }
    }

    console.log('✅ 管理员账户修复完成！\n');
    console.log('📝 登录信息:');
    console.log(`   邮箱: ${ADMIN_EMAIL}`);
    console.log(`   密码: ${ADMIN_PASSWORD}`);
    console.log(`   登录页面: https://souvenirplus.netlify.app/login\n`);

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
  const dbUrl = process.argv[2] || process.env.DATABASE_URL;
  
  if (!dbUrl) {
    console.error('❌ 错误: 未提供 DATABASE_URL');
    console.log('\n使用方法:');
    console.log('  node scripts/fix-admin-user.js [DATABASE_URL]');
    console.log('\n或者设置环境变量:');
    console.log('  export DATABASE_URL="postgresql://..."');
    console.log('  node scripts/fix-admin-user.js');
    process.exit(1);
  }

  // 设置 Prisma 的 DATABASE_URL
  process.env.DATABASE_URL = dbUrl;

  await fixAdminUser();
}

main();


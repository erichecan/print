#!/usr/bin/env node
/**
 * 修复管理员账户脚本
* 创建或更新管理员账户，确保邮箱和密码正确
 * 
 * 使用方法:
 *   node scripts/fix-admin-user.js [DATABASE_URL]
 * 
 * 环境变量:
 *   DATABASE_URL - PostgreSQL 连接字符串（可选，也可以通过参数传入）
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// 尝试从backend/.env文件读取DATABASE_URL
try {
  const envPath = path.join(__dirname, '../backend/.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
    console.log('📁 从 backend/.env 读取配置\n');
  } else {
    // 如果没有backend/.env，尝试从项目根目录的.env读取
    const rootEnvPath = path.join(__dirname, '../.env');
    if (fs.existsSync(rootEnvPath)) {
      require('dotenv').config({ path: rootEnvPath });
      console.log('📁 从项目根目录 .env 读取配置\n');
    }
  }
} catch (error) {
  // 忽略dotenv错误，继续使用环境变量或参数
}

const prisma = new PrismaClient();

// 管理员账户配置 - 支持多种邮箱拼写
const ADMIN_EMAILS = [
  'admin@souvenirplus.com',      // 标准邮箱
  'admin@suvernireplus.com',     // 旧邮箱（seeder中的拼写）
  'admin@suvernirplus.com',      // 用户可能输入的拼写（少了一个i）
];
const ADMIN_EMAIL = ADMIN_EMAILS[0]; // 主要使用的邮箱
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

async function fixAdminUser() {
  try {
    console.log('🔍 检查管理员账户...\n');

// 检查所有可能的管理员邮箱
    let primaryAdmin = null;
    const foundAdmins = [];
    
    for (const email of ADMIN_EMAILS) {
      const admin = await prisma.user.findUnique({
        where: { email },
      });
      if (admin) {
        foundAdmins.push({ email, admin });
        if (email === ADMIN_EMAIL) {
          primaryAdmin = admin;
        }
      }
    }

// 如果找到了主要邮箱，更新其密码
    if (primaryAdmin) {
      console.log(`✅ 找到现有管理员账户: ${ADMIN_EMAIL}`);
      
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
    } else if (foundAdmins.length > 0) {
// 如果找到了其他变体，更新为主要邮箱
      const firstFound = foundAdmins[0];
      console.log(`⚠️  找到旧的管理员邮箱: ${firstFound.email}`);
      console.log(`   正在更新为主要邮箱: ${ADMIN_EMAIL}\n`);
      
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      
      // 更新邮箱和密码
      await prisma.user.update({
        where: { email: firstFound.email },
        data: {
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      console.log('✅ 管理员账户已更新');
      console.log(`   邮箱: ${ADMIN_EMAIL}`);
      console.log(`   密码: ${ADMIN_PASSWORD}`);
      console.log(`   角色: ADMIN\n`);
      
      primaryAdmin = { email: ADMIN_EMAIL };
      
// 删除其他变体邮箱（避免重复）
      for (let i = 1; i < foundAdmins.length; i++) {
        const duplicate = foundAdmins[i];
        if (duplicate.email !== firstFound.email) {
          await prisma.user.delete({
            where: { email: duplicate.email },
          });
          console.log(`✅ 已删除重复的管理员账户: ${duplicate.email}\n`);
        }
      }
    } else {
// 如果都不存在，创建新的管理员账户
      console.log(`⚠️  未找到管理员账户，正在创建...\n`);
      
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

// 主函数 - 支持从.env文件、环境变量或参数读取DATABASE_URL
async function main() {
  let dbUrl = process.argv[2] || process.env.DATABASE_URL;
  
// 如果还没有DATABASE_URL，尝试从环境变量构建（本地开发场景）
  if (!dbUrl) {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const dbName = process.env.DB_NAME || 'suvernireplus';
    
    dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    console.log(`⚠️  未找到 DATABASE_URL，使用默认本地配置: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);
    console.log('💡 提示: 如果要连接线上数据库，请提供 DATABASE_URL\n');
  }

  if (!dbUrl) {
    console.error('❌ 错误: 未提供 DATABASE_URL');
    console.log('\n使用方法:');
    console.log('  方式1: 直接提供 Neon 数据库连接字符串');
    console.log('    node scripts/fix-admin-user.js "postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"');
    console.log('\n  方式2: 设置环境变量');
    console.log('    export DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"');
    console.log('    node scripts/fix-admin-user.js');
    console.log('\n  方式3: 在 backend/.env 文件中设置 DATABASE_URL');
    console.log('    然后运行: node scripts/fix-admin-user.js');
    console.log('\n📝 获取 Neon 数据库连接字符串:');
    console.log('  1. 登录 Neon Console: https://console.neon.tech');
    console.log('  2. 选择你的项目');
    console.log('  3. 在 "Connection Details" 中复制连接字符串');
    process.exit(1);
  }

// 检查是否是 Neon 数据库（通过 URL 判断）
  const isNeon = dbUrl.includes('neon.tech') || dbUrl.includes('neon');
  if (isNeon) {
    console.log('🌐 检测到 Neon 数据库，连接到线上数据库...\n');
  }

  // 设置 Prisma 的 DATABASE_URL
  process.env.DATABASE_URL = dbUrl;

  await fixAdminUser();
}

main();


#!/usr/bin/env node
/**
 * 检查管理员账户脚本
 * [2025-01-27 15:35:00] 检查数据库中是否存在管理员账户，并显示详细信息
 * 
 * 使用方法:
 *   node scripts/check-admin-user.js [DATABASE_URL]
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// [2025-01-27 15:40:00] 尝试从backend/.env文件读取DATABASE_URL
try {
  const envPath = path.join(__dirname, '../backend/.env');
  if (fs.existsSync(envPath)) {
    require('dotenv').config({ path: envPath });
  } else {
    // 如果没有backend/.env，尝试从项目根目录的.env读取
    const rootEnvPath = path.join(__dirname, '../.env');
    if (fs.existsSync(rootEnvPath)) {
      require('dotenv').config({ path: rootEnvPath });
    }
  }
} catch (error) {
  // 忽略dotenv错误，继续使用环境变量或参数
}

const prisma = new PrismaClient();

async function checkAdminUser() {
  try {
    console.log('🔍 检查数据库连接和管理员账户...\n');

    // [2025-01-27 15:35:00] 测试数据库连接
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');

    // [2025-01-27 15:35:00] 查找所有管理员账户
    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        createdAt: true,
      }
    });

    console.log(`📊 找到 ${adminUsers.length} 个管理员账户:\n`);

    if (adminUsers.length === 0) {
      console.log('⚠️  没有找到任何管理员账户！');
      console.log('   建议运行: node scripts/fix-admin-user.js\n');
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   姓名: ${user.firstName || ''} ${user.lastName || ''}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   邮箱已验证: ${user.emailVerified ? '是' : '否'}`);
        console.log(`   创建时间: ${user.createdAt}`);
        console.log('');
      });
    }

    // [2025-01-27 15:35:00] 检查特定邮箱
    const targetEmails = [
      'admin@souvenirplus.com',
      'admin@suvernireplus.com',
      'admin@suvernirplus.com',
    ];

    console.log('🔎 检查特定邮箱是否存在:\n');
    for (const email of targetEmails) {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
        select: {
          id: true,
          email: true,
          role: true,
          emailVerified: true,
        }
      });

      if (user) {
        console.log(`✅ ${email} - 存在 (${user.role})`);
        
        // [2025-01-27 15:35:00] 测试密码验证
        const testPassword = 'admin123';
        const userWithHash = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          select: { passwordHash: true }
        });
        
        if (userWithHash) {
          const isValid = await bcrypt.compare(testPassword, userWithHash.passwordHash);
          console.log(`  密码验证 (admin123): ${isValid ? '✅ 正确' : '❌ 错误'}`);
        }
      } else {
        console.log(`❌ ${email} - 不存在`);
      }
      console.log('');
    }

    // [2025-01-27 15:35:00] 检查所有用户数量
    const totalUsers = await prisma.user.count();
    console.log(`📈 数据库中共有 ${totalUsers} 个用户\n`);

    console.log('💡 如果需要修复管理员账户，运行:');
    console.log('   node scripts/fix-admin-user.js\n');

  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    } else if (error.code === 'P1000') {
      console.error('   数据库认证失败。请检查数据库用户名和密码。');
    } else {
      console.error('   完整错误信息:', error);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// [2025-01-27 15:40:00] 主函数 - 支持从.env文件或参数读取DATABASE_URL
async function main() {
  let dbUrl = process.argv[2] || process.env.DATABASE_URL;
  
  // [2025-01-27 15:40:00] 如果还没有DATABASE_URL，尝试从环境变量构建
  if (!dbUrl) {
    const dbHost = process.env.DB_HOST || 'localhost';
    const dbPort = process.env.DB_PORT || 5432;
    const dbUser = process.env.DB_USER || 'postgres';
    const dbPassword = process.env.DB_PASSWORD || 'postgres';
    const dbName = process.env.DB_NAME || 'suvernireplus';
    
    dbUrl = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;
    console.log(`⚠️  未找到 DATABASE_URL，使用默认配置: ${dbUrl.replace(/:[^:@]+@/, ':****@')}\n`);
  }

  if (!dbUrl) {
    console.error('❌ 错误: 未提供 DATABASE_URL');
    console.log('\n使用方法:');
    console.log('  1. 创建 backend/.env 文件（参考 backend/env.example）');
    console.log('  2. 运行: node scripts/check-admin-user.js');
    console.log('  3. 或直接提供: node scripts/check-admin-user.js "postgresql://user:pass@host:port/db"');
    process.exit(1);
  }

  // 设置 Prisma 的 DATABASE_URL
  process.env.DATABASE_URL = dbUrl;

  await checkAdminUser();
}

main();


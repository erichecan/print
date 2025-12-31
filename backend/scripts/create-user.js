// 在 Neon 数据库中创建用户账户的脚本
// 用于持久化保存用户账户（非 seed 数据）
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 要创建的用户信息
const USER_EMAIL = 'erichecan@gmail.com';
const USER_PASSWORD = '511511';
const USER_FIRST_NAME = 'Eric';
const USER_LAST_NAME = 'He';

/**
* 创建用户账户
 * 如果用户已存在，则更新密码
 */
async function createUser() {
  try {
    console.log('🔍 检查用户账户...\n');
    console.log(`📧 邮箱: ${USER_EMAIL}`);
    console.log(`🔑 密码: ${USER_PASSWORD}\n`);
    
// 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: USER_EMAIL.toLowerCase() },
    });
    
    if (existingUser) {
      console.log(`⚠️  用户账户已存在: ${USER_EMAIL}`);
      
// 更新密码和角色确保正确
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      const updatedUser = await prisma.user.update({
        where: { email: USER_EMAIL.toLowerCase() },
        data: {
          passwordHash: hashedPassword,
role: 'ADMIN', // 设置为 ADMIN 角色
          emailVerified: true,
        },
      });
      
      console.log('✅ 用户账户密码已更新');
      console.log(`   邮箱: ${updatedUser.email}`);
      console.log(`   密码: ${USER_PASSWORD}`);
      console.log(`   角色: ${updatedUser.role}`);
      console.log(`   ID: ${updatedUser.id}\n`);
    } else {
      console.log(`📝 未找到用户账户，正在创建...\n`);
      
// 创建新用户
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      const user = await prisma.user.create({
        data: {
          email: USER_EMAIL.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: USER_FIRST_NAME,
          lastName: USER_LAST_NAME,
role: 'ADMIN', // 设置为 ADMIN 角色
          emailVerified: true,
        },
      });
      
      console.log('✅ 用户账户已创建');
      console.log(`   邮箱: ${user.email}`);
      console.log(`   密码: ${USER_PASSWORD}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   ID: ${user.id}\n`);
    }
    
    console.log('✅ 用户账户设置完成！\n');
    console.log('📝 登录信息:');
    console.log(`   邮箱: ${USER_EMAIL}`);
    console.log(`   密码: ${USER_PASSWORD}\n`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
      console.error('   确保 DATABASE_URL 指向 Neon 数据库。');
    } else if (error.code === 'P2002') {
      console.error('   唯一约束冲突：该邮箱已被使用。');
    }
    console.error('   错误详情:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 主函数
async function main() {
// 检查 DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    console.log('\n使用方法:');
    console.log('  方式1: 在 backend/.env 文件中设置 DATABASE_URL');
    console.log('    DATABASE_URL=postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require');
    console.log('    然后运行: node backend/scripts/create-user.js');
    console.log('\n  方式2: 设置环境变量');
    console.log('    export DATABASE_URL="postgresql://user:password@ep-xxx.region.neon.tech/dbname?sslmode=require"');
    console.log('    node backend/scripts/create-user.js');
    console.log('\n📝 获取 Neon 数据库连接字符串:');
    console.log('  1. 登录 Neon Console: https://console.neon.tech');
    console.log('  2. 选择你的项目');
    console.log('  3. 在 "Connection Details" 中复制连接字符串');
    process.exit(1);
  }
  
// 检查是否是 Neon 数据库
  const isNeon = process.env.DATABASE_URL.includes('neon.tech') || process.env.DATABASE_URL.includes('neon');
  if (isNeon) {
    console.log('🌐 检测到 Neon 数据库，连接到线上数据库...\n');
  } else {
    console.log('⚠️  警告: 未检测到 Neon 数据库连接字符串');
    console.log('   当前 DATABASE_URL 可能指向本地数据库或其他数据库\n');
  }
  
  await createUser();
}

main();


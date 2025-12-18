// [2025-01-30 20:00:00] 在数据库中创建普通 CUSTOMER 用户账户的脚本
// 用于创建普通用户（非 ADMIN）
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// [2025-01-30 20:00:00] 要创建的用户信息
const USER_EMAIL = 'erichecan@gmail.com';
const USER_PASSWORD = 'your-password-here'; // 请修改为你的密码
const USER_FIRST_NAME = 'Eric';
const USER_LAST_NAME = 'He';

/**
 * [2025-01-30 20:00:00] 创建普通 CUSTOMER 用户账户
 * 如果用户已存在，则更新密码和角色为 CUSTOMER
 */
async function createCustomerUser() {
  try {
    console.log('🔍 检查用户账户...\n');
    console.log(`📧 邮箱: ${USER_EMAIL}`);
    console.log(`🔑 密码: ${USER_PASSWORD}\n`);
    
    // [2025-01-30 20:00:00] 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: USER_EMAIL.toLowerCase() },
    });
    
    if (existingUser) {
      console.log(`⚠️  用户账户已存在: ${USER_EMAIL}`);
      console.log(`   当前角色: ${existingUser.role}\n`);
      
      // [2025-01-30 20:00:00] 更新密码和角色为 CUSTOMER
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      const updatedUser = await prisma.user.update({
        where: { email: USER_EMAIL.toLowerCase() },
        data: {
          passwordHash: hashedPassword,
          role: 'CUSTOMER', // [2025-01-30 20:00:00] 设置为 CUSTOMER 角色
          emailVerified: true,
        },
      });
      
      console.log('✅ 用户账户已更新为 CUSTOMER 角色');
      console.log(`   邮箱: ${updatedUser.email}`);
      console.log(`   密码: ${USER_PASSWORD}`);
      console.log(`   角色: ${updatedUser.role}`);
      console.log(`   ID: ${updatedUser.id}\n`);
    } else {
      console.log(`📝 未找到用户账户，正在创建 CUSTOMER 用户...\n`);
      
      // [2025-01-30 20:00:00] 创建新 CUSTOMER 用户
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      const user = await prisma.user.create({
        data: {
          email: USER_EMAIL.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: USER_FIRST_NAME,
          lastName: USER_LAST_NAME,
          role: 'CUSTOMER', // [2025-01-30 20:00:00] 设置为 CUSTOMER 角色
          emailVerified: true,
        },
      });
      
      console.log('✅ 普通用户账户已创建');
      console.log(`   邮箱: ${user.email}`);
      console.log(`   密码: ${USER_PASSWORD}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   ID: ${user.id}\n`);
    }
    
    console.log('✅ 用户账户设置完成！\n');
    console.log('📝 登录信息:');
    console.log(`   邮箱: ${USER_EMAIL}`);
    console.log(`   密码: ${USER_PASSWORD}`);
    console.log(`   角色: CUSTOMER (普通用户)\n`);
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
      console.error('   确保 DATABASE_URL 指向正确的数据库。');
    } else if (error.code === 'P2002') {
      console.error('   唯一约束冲突：该邮箱已被使用。');
    }
    console.error('   错误详情:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// [2025-01-30 20:00:00] 主函数
async function main() {
  // [2025-01-30 20:00:00] 检查 DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: 未设置 DATABASE_URL 环境变量');
    console.log('\n使用方法:');
    console.log('  方式1: 在 backend/.env 文件中设置 DATABASE_URL');
    console.log('    DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require');
    console.log('    然后运行: node backend/scripts/create-customer-user.js');
    console.log('\n  方式2: 设置环境变量');
    console.log('    export DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"');
    console.log('    node backend/scripts/create-customer-user.js');
    process.exit(1);
  }
  
  // [2025-01-30 20:00:00] 检查密码是否已修改
  if (USER_PASSWORD === 'your-password-here') {
    console.error('❌ 错误: 请先修改脚本中的 USER_PASSWORD 变量');
    console.log('   在脚本顶部修改: const USER_PASSWORD = "your-password-here";');
    console.log('   改为: const USER_PASSWORD = "你的密码";');
    process.exit(1);
  }
  
  await createCustomerUser();
}

main();


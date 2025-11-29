// [2025-11-28 12:40:00] 直接在 GCP 上创建 admin 用户的脚本
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@suvernireplus.com';
const ADMIN_PASSWORD = 'admin123';
const ADMIN_FIRST_NAME = 'Admin';
const ADMIN_LAST_NAME = 'User';

async function createAdminUser() {
  try {
    console.log('🔍 检查管理员账户...\n');
    
    // 检查用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    
    if (existingUser) {
      console.log(`✅ 管理员账户已存在: ${ADMIN_EMAIL}`);
      
      // 更新密码确保正确
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
    
    console.log('✅ 管理员账户设置完成！\n');
    console.log('📝 登录信息:');
    console.log(`   邮箱: ${ADMIN_EMAIL}`);
    console.log(`   密码: ${ADMIN_PASSWORD}\n`);
    
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

createAdminUser();


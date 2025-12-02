// [2025-12-02 04:00:00] 验证生产环境数据库中的用户
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const USER_EMAIL = 'erichecan@gmail.com';
const USER_PASSWORD = '511511';

async function verifyUser() {
  try {
    console.log('🔍 检查生产环境数据库中的用户...\n');
    console.log(`📧 邮箱: ${USER_EMAIL}`);
    console.log(`🔑 密码: ${USER_PASSWORD}\n`);
    
    // 检查数据库连接
    console.log('📡 检查数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');
    
    // 查找用户
    console.log('🔍 查找用户...');
    const user = await prisma.user.findUnique({
      where: { email: USER_EMAIL.toLowerCase() },
      select: {
        id: true,
        email: true,
        role: true,
        emailVerified: true,
        passwordHash: true,
      },
    });
    
    if (!user) {
      console.log('❌ 用户不存在！');
      console.log('📝 正在创建用户...\n');
      
      const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
      const newUser = await prisma.user.create({
        data: {
          email: USER_EMAIL.toLowerCase(),
          passwordHash: hashedPassword,
          firstName: 'Eric',
          lastName: 'He',
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      console.log('✅ 用户已创建');
      console.log(`   邮箱: ${newUser.email}`);
      console.log(`   密码: ${USER_PASSWORD}`);
      console.log(`   角色: ${newUser.role}`);
      console.log(`   ID: ${newUser.id}\n`);
    } else {
      console.log('✅ 用户存在');
      console.log(`   邮箱: ${user.email}`);
      console.log(`   角色: ${user.role}`);
      console.log(`   已验证: ${user.emailVerified}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   有密码哈希: ${!!user.passwordHash}\n`);
      
      // 验证密码
      if (user.passwordHash) {
        console.log('🔐 验证密码...');
        const isValidPassword = await bcrypt.compare(USER_PASSWORD, user.passwordHash);
        
        if (isValidPassword) {
          console.log('✅ 密码验证成功！\n');
        } else {
          console.log('❌ 密码验证失败！');
          console.log('📝 正在更新密码...\n');
          
          const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
          await prisma.user.update({
            where: { email: USER_EMAIL.toLowerCase() },
            data: {
              passwordHash: hashedPassword,
              role: 'ADMIN',
              emailVerified: true,
            },
          });
          
          console.log('✅ 密码已更新\n');
        }
      } else {
        console.log('⚠️  用户没有密码哈希！');
        console.log('📝 正在设置密码...\n');
        
        const hashedPassword = await bcrypt.hash(USER_PASSWORD, 10);
        await prisma.user.update({
          where: { email: USER_EMAIL.toLowerCase() },
          data: {
            passwordHash: hashedPassword,
            role: 'ADMIN',
            emailVerified: true,
          },
        });
        
        console.log('✅ 密码已设置\n');
      }
    }
    
    // 列出所有用户
    console.log('📋 数据库中的所有用户:');
    const allUsers = await prisma.user.findMany({
      select: {
        email: true,
        role: true,
        emailVerified: true,
      },
      take: 10,
    });
    
    allUsers.forEach((u, index) => {
      console.log(`   ${index + 1}. ${u.email} (${u.role}) - 已验证: ${u.emailVerified}`);
    });
    
    console.log(`\n   总用户数: ${await prisma.user.count()}\n`);
    
    console.log('✅ 验证完成！\n');
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    }
    console.error('   错误详情:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyUser();


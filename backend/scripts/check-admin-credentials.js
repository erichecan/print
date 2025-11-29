#!/usr/bin/env node
/**
 * [2025-01-28 18:00:00] 检查数据库中的 Admin 用户凭证
 * 用于验证 seed 数据中的 admin 用户是否存在，以及密码是否正确
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAILS = [
  'admin@suvernireplus.com',
  'admin@souvenirplus.com',
  'admin@suvernirplus.com',
];

const ADMIN_PASSWORD = 'admin123';

async function checkAdminCredentials() {
  try {
    console.log('=== 检查 Admin 用户凭证 ===\n');
    console.log(`[2025-01-28 18:00:00] 开始检查...\n`);
    
    // 检查所有可能的 admin 邮箱
    console.log('📋 检查可能的 Admin 邮箱:');
    ADMIN_EMAILS.forEach(email => console.log(`   - ${email}`));
    console.log('');
    
    let foundAdmin = null;
    let foundEmail = null;
    
    // 1. 查找所有 ADMIN 角色的用户
    console.log('1️⃣  查找所有 ADMIN 角色的用户...');
    // 先获取所有用户，然后在 JavaScript 中过滤 ADMIN 角色
    const allUsersRaw = await prisma.user.findMany({
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
    
    // 过滤出 ADMIN 角色的用户（不区分大小写）
    const adminUsers = allUsersRaw.filter(user => {
      if (!user.role) return false;
      const roleUpper = String(user.role).toUpperCase();
      return roleUpper === 'ADMIN';
    });
    
    if (adminUsers.length === 0) {
      console.log('   ❌ 未找到任何 ADMIN 角色的用户\n');
    } else {
      console.log(`   ✅ 找到 ${adminUsers.length} 个 ADMIN 用户:\n`);
      adminUsers.forEach((user, index) => {
        console.log(`   ${index + 1}. ${user.email}`);
        console.log(`      角色: ${user.role}`);
        console.log(`      已验证: ${user.emailVerified ? '是' : '否'}`);
        console.log(`      创建时间: ${user.createdAt}`);
        console.log(`      更新时间: ${user.updatedAt}\n`);
      });
      
      // 找到第一个匹配的邮箱
      foundAdmin = adminUsers.find(u => ADMIN_EMAILS.includes(u.email));
      if (foundAdmin) {
        foundEmail = foundAdmin.email;
      } else {
        foundAdmin = adminUsers[0];
        foundEmail = foundAdmin.email;
      }
    }
    
    // 2. 检查主要 admin 邮箱是否存在
    console.log('2️⃣  检查主要 Admin 邮箱是否存在...');
    const primaryEmail = ADMIN_EMAILS[0];
    const primaryAdmin = await prisma.user.findUnique({
      where: { email: primaryEmail },
    });
    
    if (primaryAdmin) {
      console.log(`   ✅ 主要 Admin 邮箱存在: ${primaryEmail}`);
      foundAdmin = primaryAdmin;
      foundEmail = primaryEmail;
    } else {
      console.log(`   ❌ 主要 Admin 邮箱不存在: ${primaryEmail}\n`);
      
      // 检查其他可能的邮箱
      for (const email of ADMIN_EMAILS.slice(1)) {
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (user) {
          console.log(`   ⚠️  找到其他 Admin 邮箱: ${email}`);
          foundAdmin = user;
          foundEmail = email;
          break;
        }
      }
    }
    
    if (!foundAdmin) {
      console.log('\n❌ 未找到任何 Admin 用户！');
      console.log('\n💡 建议操作：');
      console.log('   运行以下命令创建 admin 用户：');
      console.log('   node backend/scripts/create-admin-user.js');
      console.log('\n   或者在 GCP 上运行：');
      console.log('   gcloud run jobs create check-admin-cred --image [IMAGE] --command node --args scripts/create-admin-user.js\n');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    console.log(`\n3️⃣  验证 Admin 用户密码 (${foundEmail})...`);
    
    // 获取完整用户信息（包括密码哈希）
    const fullAdmin = await prisma.user.findUnique({
      where: { email: foundEmail },
    });
    
    if (!fullAdmin || !fullAdmin.passwordHash) {
      console.log('   ❌ 用户没有密码哈希！\n');
      console.log('💡 建议操作：');
      console.log('   运行以下命令更新密码：');
      console.log('   node backend/scripts/create-admin-user.js\n');
      await prisma.$disconnect();
      process.exit(1);
    }
    
    // 验证密码
    const isValidPassword = await bcrypt.compare(ADMIN_PASSWORD, fullAdmin.passwordHash);
    
    if (isValidPassword) {
      console.log(`   ✅ 密码验证成功！`);
      console.log(`   ✅ 密码: ${ADMIN_PASSWORD}\n`);
    } else {
      console.log(`   ❌ 密码验证失败！`);
      console.log(`   ⚠️  当前密码不是: ${ADMIN_PASSWORD}\n`);
    }
    
    // 4. 显示完整的登录信息
    console.log('4️⃣  完整登录信息：');
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   邮箱: ${foundEmail}`);
    if (isValidPassword) {
      console.log(`   密码: ${ADMIN_PASSWORD}`);
    } else {
      console.log(`   密码: ❌ 不匹配预期密码`);
    }
    console.log(`   角色: ${fullAdmin.role}`);
    console.log(`   已验证: ${fullAdmin.emailVerified ? '是' : '否'}`);
    console.log(`   登录页面: https://[前端URL]/admin/login`);
    console.log('   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    // 5. 检查数据库中的用户总数
    console.log('5️⃣  数据库用户统计：');
    const totalUsers = await prisma.user.count();
    // 获取所有用户并统计 ADMIN 角色
    const allUsersForCount = await prisma.user.findMany({
      select: { role: true },
    });
    const adminCount = allUsersForCount.filter(u => 
      u.role && String(u.role).toUpperCase() === 'ADMIN'
    ).length;
    console.log(`   总用户数: ${totalUsers}`);
    console.log(`   Admin 用户数: ${adminCount}\n`);
    
    console.log('=== 检查完成 ===\n');
    
    // 返回结果
    if (isValidPassword) {
      console.log('✅ Admin 用户凭证验证通过！');
      console.log(`   可以正常登录：${foundEmail} / ${ADMIN_PASSWORD}\n`);
      await prisma.$disconnect();
      process.exit(0);
    } else {
      console.log('⚠️  Admin 用户存在，但密码不匹配！');
      console.log('   建议运行 create-admin-user.js 更新密码\n');
      await prisma.$disconnect();
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ 检查 Admin 凭证时出错:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    }
    console.error('   错误详情:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

if (require.main === module) {
  checkAdminCredentials();
}

module.exports = { checkAdminCredentials };


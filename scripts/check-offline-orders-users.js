/**
 * 检查线下订单管理用户
 * [2025-01-30 14:10:00] 查询数据库中 SALES、SALES_MANAGER、ADMIN 角色的用户
 */
// [2025-01-30 14:10:00] 加载环境变量（优先从 backend/.env 加载）
require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });
// 如果 backend/.env 不存在，尝试从根目录加载
if (!process.env.DATABASE_URL) {
  require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
}
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    console.log('🔍 检查线下订单管理用户...\n');
    
    // 查询所有 SALES、SALES_MANAGER、ADMIN 角色的用户
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['SALES', 'SALES_MANAGER', 'ADMIN']
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        passwordHash: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 找到 ${users.length} 个线下订单管理用户：\n`);
    
    if (users.length === 0) {
      console.log('⚠️  没有找到任何 SALES、SALES_MANAGER 或 ADMIN 角色的用户！');
      console.log('   需要创建用户才能访问线下订单管理功能。\n');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   姓名: ${(user.firstName || '') + ' ' + (user.lastName || '')}`.trim() || '未设置');
        console.log(`   密码: ${user.passwordHash ? '✅ 已设置（哈希值: ' + user.passwordHash.substring(0, 20) + '...）' : '❌ 未设置'}`);
        console.log(`   创建时间: ${user.createdAt.toISOString()}`);
        console.log('');
      });
      
      // 按角色统计
      const roleCounts = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('📈 按角色统计：');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`   ${role}: ${count} 个`);
      });
    }
    
    // 检查是否有密码的用户
    const usersWithPassword = users.filter(u => u.passwordHash);
    const usersWithoutPassword = users.filter(u => !u.passwordHash);
    
    console.log(`\n✅ 有密码的用户: ${usersWithPassword.length} 个`);
    console.log(`❌ 无密码的用户: ${usersWithoutPassword.length} 个`);
    
    if (usersWithoutPassword.length > 0) {
      console.log(`\n⚠️  以下用户没有设置密码：`);
      usersWithoutPassword.forEach(u => {
        console.log(`   - ${u.email} (${u.role})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.message.includes('DATABASE_URL')) {
      console.error('   请确保 DATABASE_URL 环境变量已设置');
    } else {
      console.error('   错误详情:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
})();

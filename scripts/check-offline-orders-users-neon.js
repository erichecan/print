/**
 * 检查线上数据库（Neon）的线下订单管理用户
 * [2025-01-30 14:20:00] 使用提供的 Neon 数据库连接字符串
 */
const { PrismaClient } = require('@prisma/client');

// [2025-01-30 14:20:00] 使用用户提供的 Neon 数据库连接字符串
const DATABASE_URL = 'postgresql://neondb_owner:npg_zWXxtTw1UN2s@ep-weathered-smoke-ae6aqiiq-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: DATABASE_URL,
    },
  },
});

(async () => {
  try {
    console.log('🔍 检查线上数据库（Neon）的线下订单管理用户...\n');
    
    // 查询所有 SALES、SALES_MANAGER、ADMIN 角色的用户
    const users = await prisma.$queryRaw`
      SELECT 
        id, 
        email, 
        first_name as "firstName",
        last_name as "lastName",
        role,
        CASE WHEN password_hash IS NOT NULL THEN '✅ 已设置' ELSE '❌ 未设置' END as "hasPassword",
        created_at as "createdAt"
      FROM users
      WHERE role IN ('SALES', 'SALES_MANAGER', 'ADMIN')
      ORDER BY created_at DESC;
    `;
    
    console.log(`📊 找到 ${users.length} 个线下订单管理用户：\n`);
    
    if (users.length === 0) {
      console.log('⚠️  没有找到任何 SALES、SALES_MANAGER 或 ADMIN 角色的用户！');
      console.log('   需要创建用户才能访问线下订单管理功能。\n');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   角色: ${user.role}`);
        console.log(`   姓名: ${(user.firstName || '') + ' ' + (user.lastName || '')}`.trim() || '未设置');
        console.log(`   密码: ${user.hasPassword}`);
        console.log(`   创建时间: ${user.createdAt ? new Date(user.createdAt).toISOString() : '未知'}`);
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
      
      // 检查是否有密码的用户
      const usersWithPassword = users.filter(u => u.hasPassword === '✅ 已设置');
      const usersWithoutPassword = users.filter(u => u.hasPassword === '❌ 未设置');
      
      console.log(`\n✅ 有密码的用户: ${usersWithPassword.length} 个`);
      console.log(`❌ 无密码的用户: ${usersWithoutPassword.length} 个`);
      
      if (usersWithoutPassword.length > 0) {
        console.log(`\n⚠️  以下用户没有设置密码：`);
        usersWithoutPassword.forEach(u => {
          console.log(`   - ${u.email} (${u.role})`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error.message);
    if (error.message.includes('does not exist')) {
      console.error('   表不存在，可能需要运行数据库迁移');
    }
  } finally {
    await prisma.$disconnect();
  }
})();

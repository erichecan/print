// [2025-12-07 03:00:00] 生产环境 Sales 账号 Seed 脚本
// [2025-12-07 03:30:00] 更新：删除旧的3个账号，创建新的4个账号（3个Sales + 1个Sales Manager）
require('dotenv').config();
const { PrismaClient, UserRole } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// [2025-12-07 03:30:00] 旧的账号（需要删除）
const OLD_SALES_USERS = [
  'sales1@example.com',
  'sales2@example.com',
  'sales3@example.com',
];

// [2025-12-07 03:30:00] 新的生产环境 Sales 账号配置
const SALES_USERS = [
  {
    email: 'sales1@suvernireplus.com',
    password: 'sales123456',
    firstName: 'Sales',
    lastName: 'One',
    role: UserRole.SALES,
  },
  {
    email: 'sales2@suvernireplus.com',
    password: 'sales123456',
    firstName: 'Sales',
    lastName: 'Two',
    role: UserRole.SALES,
  },
  {
    email: 'sales3@suvernireplus.com',
    password: 'sales123456',
    firstName: 'Sales',
    lastName: 'Three',
    role: UserRole.SALES,
  },
  {
    email: 'salesmanager@suvernireplus.com',
    password: 'manager123456',
    firstName: 'Sales',
    lastName: 'Manager',
    role: UserRole.SALES_MANAGER,
  },
];

// [2025-12-07 03:00:00] 幂等创建/更新 Sales 用户
async function ensureSalesUser(userConfig) {
  const existing = await prisma.user.findUnique({
    where: { email: userConfig.email.toLowerCase() },
  });

  const passwordHash = await bcrypt.hash(userConfig.password, 10);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: userConfig.firstName,
        lastName: userConfig.lastName,
        role: userConfig.role,
        emailVerified: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: userConfig.email.toLowerCase(),
      passwordHash,
      firstName: userConfig.firstName,
      lastName: userConfig.lastName,
      role: userConfig.role,
      emailVerified: true,
    },
  });
}

// [2025-12-07 03:30:00] 删除旧的账号
async function deleteOldSalesUsers() {
  console.log('🗑️  删除旧的 Sales 账号...\n');
  
  for (const email of OLD_SALES_USERS) {
    try {
      const user = await prisma.user.findUnique({
        where: { email: email.toLowerCase() },
      });
      
      if (user) {
        await prisma.user.delete({
          where: { id: user.id },
        });
        console.log(`   ✅ 已删除: ${email}`);
      } else {
        console.log(`   ℹ️  不存在: ${email}`);
      }
    } catch (error) {
      console.error(`   ❌ 删除失败 ${email}:`, error.message);
    }
  }
  console.log('');
}

async function main() {
  console.log('🌱 Seeding production Sales users...\n');

  try {
    // [2025-12-07 03:30:00] 先删除旧的账号
    await deleteOldSalesUsers();

    // 创建新的账号
    console.log('📝 创建新的 Sales 账号...\n');
    for (const userConfig of SALES_USERS) {
      const user = await ensureSalesUser(userConfig);
      console.log(`✅ ${userConfig.role === UserRole.SALES_MANAGER ? 'Sales Manager' : 'Sales'} 账号就绪: ${user.email} / ${userConfig.password}`);
      console.log(`   姓名: ${user.firstName} ${user.lastName}`);
      console.log(`   角色: ${user.role}\n`);
    }

    console.log('✅ 所有 Sales 账号创建完成！\n');
    console.log('📋 账号列表：');
    SALES_USERS.forEach((user, index) => {
      const roleLabel = user.role === UserRole.SALES_MANAGER ? 'Sales Manager' : 'Sales';
      console.log(`   ${index + 1}. ${user.email} / ${user.password} (${roleLabel})`);
    });
  } catch (error) {
    console.error('❌ Seed production Sales users failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();


// 线下订单 E2E 专用种子脚本（测试账号 + 测试订单）
require('dotenv').config();
const { PrismaClient, UserRole, OfflineOrderStatus, ProductionWorkOrderStatus } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// 固定测试账号配置，便于 Playwright / 手工测试复用
const TEST_SALES_USER = {
  email: 'offline-tester@example.com',
  password: 'OfflineTest123!',
  firstName: 'Offline',
  lastName: 'Tester',
  role: UserRole.SALES,
};

// 线下订单测试数据（3 个不同状态）
const OFFLINE_ORDERS_SEED = [
  {
    orderCode: 'OFF-E2E-CASE-1',
    projectName: 'E2E-Offline-Case-1 New',
    primaryProduct: 'Custom T-Shirt Kit',
    quantity: 50,
    rushOrder: false,
    status: OfflineOrderStatus.ACTIVE,
    stageKey: 'new',
    stageLabel: 'New',
    stagePosition: 0,
  },
  {
    orderCode: 'OFF-E2E-CASE-2',
    projectName: 'E2E-Offline-Case-2 In Review',
    primaryProduct: 'Branded Hoodie Batch',
    quantity: 120,
    rushOrder: true,
    status: OfflineOrderStatus.ACTIVE,
    stageKey: 'review',
    stageLabel: 'Review',
    stagePosition: 1,
  },
  {
    orderCode: 'OFF-E2E-CASE-3',
    projectName: 'E2E-Offline-Case-3 Completed',
    primaryProduct: 'Event Drinkware Set',
    quantity: 200,
    rushOrder: false,
    status: OfflineOrderStatus.COMPLETED,
    stageKey: 'completed',
    stageLabel: 'Completed',
    stagePosition: 99,
  },
];

// 幂等创建/更新测试 Sales 用户
async function ensureTestSalesUser() {
  const existing = await prisma.user.findUnique({
    where: { email: TEST_SALES_USER.email.toLowerCase() },
  });

  const passwordHash = await bcrypt.hash(TEST_SALES_USER.password, 10);

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        passwordHash,
        firstName: TEST_SALES_USER.firstName,
        lastName: TEST_SALES_USER.lastName,
        role: TEST_SALES_USER.role,
        emailVerified: true,
      },
    });
  }

  return prisma.user.create({
    data: {
      email: TEST_SALES_USER.email.toLowerCase(),
      passwordHash,
      firstName: TEST_SALES_USER.firstName,
      lastName: TEST_SALES_USER.lastName,
      role: TEST_SALES_USER.role,
      emailVerified: true,
    },
  });
}

// 为每个订单创建或更新 OfflineOrder + 可选生产工单
async function ensureOfflineOrdersForUser(user) {
  const now = new Date();

  for (const seed of OFFLINE_ORDERS_SEED) {
    const existing = await prisma.offlineOrder.findUnique({
      where: { orderCode: seed.orderCode },
      include: {
        productionWorkOrder: true,
      },
    });

    const commonData = {
      projectName: seed.projectName,
      primaryProduct: seed.primaryProduct,
      quantity: seed.quantity,
      deliveryDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
      description: 'Seeded offline order for E2E tests',
      requiresMockups: true,
      requiresProof: false,
      rushOrder: seed.rushOrder,
      stageKey: seed.stageKey,
      stageLabel: seed.stageLabel,
      stagePosition: seed.stagePosition,
      status: seed.status,
      contactName: 'E2E Contact',
      company: 'E2E Testing Corp',
      email: 'offline-e2e-contact@example.com',
      phone: '4165550000',
      configuration: {
        source: 'offline-e2e-seed',
        artworkNotes: 'This order is created by seed-offline-e2e.js for automated tests.',
      },
      metadata: {
        submittedFrom: 'offline-e2e-seed',
        submittedByUserId: user.id,
      },
    };

    if (!existing) {
      await prisma.offlineOrder.create({
        data: {
          orderCode: seed.orderCode,
          ...commonData,
          histories: {
            create: [
              {
                fromStageKey: null,
                toStageKey: seed.stageKey,
                actorId: user.id,
                actorName: `${user.firstName} ${user.lastName}`.trim() || user.email,
                note: 'Order created via offline E2E seed script',
              },
            ],
          },
        },
      });
      continue;
    }

    await prisma.offlineOrder.update({
      where: { id: existing.id },
      data: {
        ...commonData,
      },
    });

// 为第三个订单确保有一个完成的生产工单
    if (seed.orderCode === 'OFF-E2E-CASE-3') {
      if (existing.productionWorkOrder) {
        await prisma.productionWorkOrder.update({
          where: { id: existing.productionWorkOrder.id },
          data: {
            status: ProductionWorkOrderStatus.COMPLETED,
            priority: 1,
            startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            dueDate: now,
            completedDate: now,
            assigneeName: 'E2E Production Lead',
            notes: 'Completed via E2E seed',
          },
        });
      } else {
        await prisma.productionWorkOrder.create({
          data: {
            workOrderCode: `WO-E2E-${seed.orderCode}`,
            offlineOrderId: existing.id,
            status: ProductionWorkOrderStatus.COMPLETED,
            priority: 1,
            startDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            dueDate: now,
            completedDate: now,
            assigneeName: 'E2E Production Lead',
            notes: 'Completed via E2E seed',
          },
        });
      }
    }
  }
}

async function main() {
  console.log('🌱 Seeding offline E2E data (Sales user + offline orders)...');

  try {
    const user = await ensureTestSalesUser();
    console.log(`✅ Sales 测试账号就绪: ${user.email} / ${TEST_SALES_USER.password}`);

    await ensureOfflineOrdersForUser(user);
    console.log('✅ 线下订单 E2E 测试数据就绪 (3 条订单记录)');
  } catch (error) {
    console.error('❌ Seed offline E2E data failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();



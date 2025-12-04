/**
 * 测试 API imageUrl 问题
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  // 1. 直接从数据库查询
  const product = await prisma.product.findFirst({
    where: { name: { contains: 'Medium Cotton Canvas Tote Bag' } },
    include: {
      variants: {
        take: 3,
        select: {
          color: true,
          imageUrl: true,
        },
      },
    },
  });

  console.log('\n=== 数据库查询结果 ===');
  console.log('商品:', product.name);
  console.log('变体:');
  product.variants.forEach(v => {
    console.log(`  ${v.color}: ${v.imageUrl || 'null'}`);
  });

  // 2. 测试 optimizeImageUrl
  const { optimizeImageUrl } = require('./backend/src/utils/imageHelper');
  const mockReq = {
    protocol: 'https',
    get: () => 'print-main-backend-hsbqzlnkxa-uc.a.run.app',
  };

  console.log('\n=== optimizeImageUrl 测试 ===');
  product.variants.forEach(v => {
    if (v.imageUrl) {
      const optimized = optimizeImageUrl(v.imageUrl, { req: mockReq });
      console.log(`  ${v.color}: ${v.imageUrl} -> ${optimized}`);
    }
  });

  await prisma.$disconnect();
}

test().catch(console.error);


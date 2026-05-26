/**
 * 回填 ProductCategory join 记录
 * 针对有 categoryId 但缺少对应 ProductCategory 行的产品
 * 运行方式：node scripts/backfill-product-categories.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // 找出所有有 categoryId 的产品
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
    },
    select: {
      id: true,
      sku: true,
      categoryId: true,
      productCategories: {
        select: { categoryId: true },
      },
    },
  });

  const withCategory = products.filter((p) => p.categoryId !== null);
  console.log(`共找到 ${products.length} 个产品，其中 ${withCategory.length} 个有 categoryId`);

  let backfilled = 0;
  let skipped = 0;

  for (const product of withCategory) {
    const existingCatIds = new Set(product.productCategories.map((pc) => pc.categoryId));

    if (!existingCatIds.has(product.categoryId)) {
      await prisma.productCategory.create({
        data: {
          productId: product.id,
          categoryId: product.categoryId,
        },
      });
      backfilled++;
    } else {
      skipped++;
    }
  }

  console.log(`回填完成：新增 ${backfilled} 条，跳过（已存在）${skipped} 条`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

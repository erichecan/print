// 一次性数据回填脚本：从主产品表 products 回填到 offline_order_products
// 2026-03-10 06:30:00
//
// 设计：
// - 读取所有 isActive=true 且 deleted=false 的 Product
// - 对每个 Product，若 offline_order_products 中不存在同 sku 或同 name 的记录，则创建一条
// - 字段映射：
//   - name           <- Product.name
//   - image_url      <- 第一张 ProductImage.url（如有）
//   - categoryId     <- Product.categoryId
//   - supplierId     <- null（线下供应商目前单独维护）
//   - sku            <- Product.sku
//   - unit_cost      <- Product.unitCost
//   - stockQuantity  <- Product.stockQuantity
//
// 用法（本地或 Cloud Run job 中执行）：
//   NODE_ENV=production DATABASE_URL=... node backend/scripts/backfill-offline-products-from-catalog.js

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  // eslint-disable-next-line no-console
  console.log('🌱 Backfilling offline_order_products from products...');

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      deleted: false,
    },
    include: {
      images: {
        orderBy: { sortOrder: 'asc' },
        take: 1,
      },
    },
  });

  // eslint-disable-next-line no-console
  console.log(`🔍 Found ${products.length} active products to inspect.`);

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const product of products) {
    const existing = await prisma.offline_order_products.findFirst({
      where: { name: product.name },
    });

    const imageUrl = product.images?.[0]?.url || null;

    if (existing) {
      // 仅在没有图片时补齐 image_url，避免覆盖线下已经维护好的数据
      if (!existing.image_url && imageUrl) {
        await prisma.offline_order_products.update({
          where: { id: existing.id },
          data: { image_url: imageUrl },
        });
        updated += 1;
      } else {
        skipped += 1;
      }
      continue;
    }

    await prisma.offline_order_products.create({
      data: {
        id: uuidv4(),
        name: product.name,
        image_url: imageUrl,
        is_customer_owned: false,
        display_order: 0,
        is_active: true,
      },
    });
    created += 1;
  }

  // eslint-disable-next-line no-console
  console.log('✅ Backfill completed:', { created, updated, skipped });
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


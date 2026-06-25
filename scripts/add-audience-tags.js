#!/usr/bin/env node
/**
 * 给所有没有 audience 标签的 active 产品添加 "Adult" 标签
 * 运行：node scripts/add-audience-tags.js
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const AUDIENCE_TAGS = ["Adult", "Women's", "Youth", "Unisex"];

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true, deleted: false },
    select: { id: true, name: true, tags: true },
  });

  const noAudience = products.filter(
    (p) => !p.tags.some((t) => AUDIENCE_TAGS.includes(t))
  );

  console.log(`Total active products: ${products.length}`);
  console.log(`Products without audience tag: ${noAudience.length}`);

  if (noAudience.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  let updated = 0;
  for (const p of noAudience) {
    await prisma.product.update({
      where: { id: p.id },
      data: { tags: { push: 'Adult' } },
    });
    updated++;
    if (updated % 20 === 0) {
      process.stdout.write(`  Updated ${updated}/${noAudience.length}...\n`);
    }
  }

  console.log(`\nDone. Added "Adult" to ${updated} products.`);

  const after = await prisma.product.count({
    where: {
      isActive: true,
      deleted: false,
      tags: { hasSome: AUDIENCE_TAGS },
    },
  });
  const total = await prisma.product.count({ where: { isActive: true, deleted: false } });
  console.log(`Coverage: ${after}/${total} (${Math.round((after / total) * 100)}%)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

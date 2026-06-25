#!/usr/bin/env node
/**
 * 给 100 件艺术印刷 T-Shirt 批量创建 variants
 * White + Black × S/M/L/XL/2XL/3XL = 12 variants per product
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  datasources: { db: { url: process.env.DATABASE_URL } },
});

const COLORS = [
  { color: 'White', colorHex: '#FFFFFF', colorDisplayName: 'White' },
  { color: 'Black', colorHex: '#000000', colorDisplayName: 'Black' },
];

const SIZES = [
  { size: 'S',   priceAdjustment: 0 },
  { size: 'M',   priceAdjustment: 0 },
  { size: 'L',   priceAdjustment: 0 },
  { size: 'XL',  priceAdjustment: 0 },
  { size: '2XL', priceAdjustment: 200 },
  { size: '3XL', priceAdjustment: 300 },
];

const ART_THEMES = [
  'Floral & Botanical', 'Nature & Landscape', 'Animals & Wildlife',
  'Cute & Kawaii', 'Portraits & Figures', 'Religious & Spiritual',
  'City & Life', 'Art & Abstract',
];

function makeSku(productId, color, size) {
  const shortId = productId.replace(/-/g, '').substring(0, 8).toUpperCase();
  const colorCode = color === 'White' ? 'WHT' : 'BLK';
  return `ART-${shortId}-${colorCode}-${size}`;
}

async function main() {
  const products = await prisma.product.findMany({
    where: { isActive: true, deleted: false, tags: { hasSome: ART_THEMES } },
    select: { id: true, name: true, variants: { select: { id: true } } },
  });

  const noVariants = products.filter(p => p.variants.length === 0);
  const alreadyHas  = products.filter(p => p.variants.length > 0);

  console.log(`Art print products: ${products.length}`);
  console.log(`Already have variants: ${alreadyHas.length}`);
  console.log(`Will process: ${noVariants.length}`);
  console.log(`Expected new variants: ${noVariants.length * COLORS.length * SIZES.length}`);
  console.log('');

  let created = 0;
  let skipped = 0;

  for (const product of noVariants) {
    const variantData = [];
    for (const c of COLORS) {
      for (const s of SIZES) {
        variantData.push({
          productId:        product.id,
          color:            c.color,
          colorHex:         c.colorHex,
          colorDisplayName: c.colorDisplayName,
          size:             s.size,
          sku:              makeSku(product.id, c.color, s.size),
          priceAdjustment:  s.priceAdjustment,
          stockQuantity:    0,
        });
      }
    }

    try {
      await prisma.variant.createMany({ data: variantData, skipDuplicates: true });
      created += variantData.length;
    } catch (e) {
      console.error(`  Failed for ${product.name}:`, e.message);
      skipped++;
    }

    if ((noVariants.indexOf(product) + 1) % 20 === 0) {
      process.stdout.write(`  Progress: ${noVariants.indexOf(product) + 1}/${noVariants.length}\n`);
    }
  }

  console.log(`\nDone. Created ${created} variants across ${noVariants.length - skipped} products.`);
  if (skipped > 0) console.log(`Skipped (errors): ${skipped}`);

  // 验证
  const check = await prisma.variant.count({
    where: { product: { tags: { hasSome: ART_THEMES } } },
  });
  console.log(`Total variants on art print products: ${check}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

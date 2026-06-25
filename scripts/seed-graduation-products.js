/**
 * 创建毕业季 12 个产品到独立站数据库（每张图片一个产品）
 * 图片已上传至 Shopify CDN，URL 读取自 shopify/graduation_manifest.json
 */

require('dotenv').config({ path: __dirname + '/../backend/.env' });

const { PrismaClient, Prisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const manifest = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../shopify/graduation_manifest.json'), 'utf8')
);

const url = (filename) => manifest[filename];

const CATEGORY_ID = 'ec0b0984-86f8-4354-bccb-80d4d8433570'; // T-Shirts
const BRAND_ID    = 'a92beebc-6210-4ed7-b758-2cf95c14d125'; // Gildan
const BASE_PRICE_CENTS = 1999; // $19.99

function makeVariants(skuPrefix, colors) {
  const sizes = ['S', 'M', 'L', 'XL', '2XL'];
  return colors.flatMap(({ color, colorHex, imageUrl }) =>
    sizes.map((size) => ({
      sku: `${skuPrefix}-${color.toUpperCase().replace(/\s+/g, '')}-${size}`,
      color,
      colorHex,
      size,
      stockQuantity: 50,
      priceAdjustment: new Prisma.Decimal(0),
      imageUrl: imageUrl || null,
    }))
  );
}

const PRODUCTS = [
  {
    name: 'Class of 2026 T-Shirt - Navy',
    sku: 'GRAD-2026-COG-NAVY',
    description: 'Celebrate the Class of 2026 in classic Navy! Bold custom print perfect for graduation day, family photos, and celebrations.',
    image: url('01-navy-class-of-2026.png'),
    colors: [{ color: 'Navy', colorHex: '#003087' }],
  },
  {
    name: 'Family Pride Graduation T-Shirt - White',
    sku: 'GRAD-2026-FP-WHT',
    description: 'Show your Family Pride in crisp White! Celebrate your graduate with the whole family wearing this custom graduation tee.',
    image: url('02-white-family-pride-2026.png'),
    colors: [{ color: 'White', colorHex: '#FFFFFF' }],
  },
  {
    name: 'Congrats Grad Gold T-Shirt - Black',
    sku: 'GRAD-2026-CG-BLK',
    description: 'Bold black tee with a stunning gold "Congrats Grad" design — the ultimate graduation statement piece for the Class of 2026.',
    image: url('03-black-congrats-grad-gold-2026.png'),
    colors: [{ color: 'Black', colorHex: '#000000' }],
  },
  {
    name: 'We Did It Graduation T-Shirt - Red',
    sku: 'GRAD-2026-WDI-RED',
    description: '"We Did It!" — celebrate in vibrant Red! Perfect for the grad squad to wear together and mark this once-in-a-lifetime achievement.',
    image: url('04-red-we-did-it-2026.png'),
    colors: [{ color: 'Red', colorHex: '#CC0000' }],
  },
  {
    name: "Family Pride Graduation T-Shirt - Women's White",
    sku: 'GRAD-2026-FP-WFWHT',
    description: "Celebrate your graduation with family pride in Women's White! Flattering fit designed to show off your custom graduation design.",
    image: url('05-white-female-family-pride-2026.png'),
    colors: [{ color: 'White', colorHex: '#FFFFFF' }],
  },
  {
    name: "Congrats Grad T-Shirt - Women's Black",
    sku: 'GRAD-2026-CG-WFBLK',
    description: "Graduate in style with this Women's Black Congrats Grad tee. Sleek, bold, and made to celebrate your big achievement.",
    image: url('06-black-female-congrats-grad-2026.png'),
    colors: [{ color: 'Black', colorHex: '#000000' }],
  },
  {
    name: "We Did It Graduation T-Shirt - Women's Purple",
    sku: 'GRAD-2026-WDI-WFPUR',
    description: '"We Did It!" in a beautiful Purple — a Women\'s graduation tee that stands out in every photo and every celebration.',
    image: url('07-latina-female-we-did-it-2026.png'),
    colors: [{ color: 'Purple', colorHex: '#6A0DAD' }],
  },
  {
    name: "Class of 2026 T-Shirt - Women's Forest Green",
    sku: 'GRAD-2026-COG-WFFG',
    description: "Class of 2026 in Women's Forest Green — a fresh, vibrant color to mark your graduation milestone in unforgettable style.",
    image: url('08-southasian-female-class-of-2026.png'),
    colors: [{ color: 'Forest Green', colorHex: '#228B22' }],
  },
  {
    name: "Class of 2026 T-Shirt - Men's White",
    sku: 'GRAD-2026-COG-MWHT',
    description: "Classic Men's White graduation tee for the Class of 2026. Clean, crisp, and ready to print with your custom design.",
    image: url('09-white-male-class-of-2026.png'),
    colors: [{ color: 'White', colorHex: '#FFFFFF' }],
  },
  {
    name: "Family Pride Graduation T-Shirt - Men's Navy",
    sku: 'GRAD-2026-FP-MNVY',
    description: "Men's Navy Family Pride graduation tee — bring the whole family together in coordinating shirts for your big graduation day.",
    image: url('10-latino-male-family-pride-2026.png'),
    colors: [{ color: 'Navy', colorHex: '#003087' }],
  },
  {
    name: "Congrats Grad T-Shirt - Women's Gold",
    sku: 'GRAD-2026-CG-WFGLD',
    description: "Shine bright on graduation day in Women's Gold! The Congrats Grad design in warm gold makes for stunning graduation photos.",
    image: url('11-asian-female-congrats-grad-2026.png'),
    colors: [{ color: 'Gold', colorHex: '#FFD700' }],
  },
  {
    name: "We Did It Graduation T-Shirt - Men's Black",
    sku: 'GRAD-2026-WDI-MBLK',
    description: '"We Did It!" on a bold Men\'s Black tee — celebrate the Class of 2026 with style and swagger. Perfect for graduation ceremonies and parties.',
    image: url('12-black-male-we-did-it-2026.png'),
    colors: [{ color: 'Black', colorHex: '#000000' }],
  },
];

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function main() {
  console.log('开始创建毕业季产品（12 个）...\n');

  for (const p of PRODUCTS) {
    const slug = slugify(p.name);

    const existing = await prisma.product.findUnique({ where: { slug } });
    if (existing) {
      console.log(`⏭  已存在，跳过: ${p.name}`);
      continue;
    }

    const variants = makeVariants(
      p.sku,
      p.colors.map((c) => ({ ...c, imageUrl: p.image }))
    );

    const created = await prisma.product.create({
      data: {
        name: p.name,
        slug,
        categoryId: CATEGORY_ID,
        brandId: BRAND_ID,
        basePrice: BASE_PRICE_CENTS,
        salePrice: new Prisma.Decimal('19.99'),
        unitCost: new Prisma.Decimal('8.00'),
        grossProfit: new Prisma.Decimal('11.99'),
        sku: p.sku,
        stockQuantity: variants.length * 50,
        description: p.description,
        isActive: true,
        isDraft: false,
        isCustomizable: true,
        garmentType: 'tshirt',
        tags: ['graduation', '2026', 'custom', 'tshirt'],
        variants: { create: variants },
        images: {
          create: [{ url: p.image, alt: p.name, sortOrder: 0 }],
        },
      },
    });

    console.log(`✅ ${p.name}`);
    console.log(`   slug: ${slug}`);
    console.log(`   variants: ${variants.length} 个  image: ${p.image.substring(0, 60)}...\n`);
  }

  console.log('全部完成！');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e.message || e);
  prisma.$disconnect();
  process.exit(1);
});

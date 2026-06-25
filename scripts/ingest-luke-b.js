/**
 * 入库脚本：Luke B 系列前 100 张图 → 商品 + 子分类
 * 运行方式：node scripts/ingest-luke-b.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const TSHIRTS_PARENT_ID = 'ec0b0984-86f8-4354-bccb-80d4d8433570';
const BASE_PRICE_CENTS = 2999;

const THEME_CATEGORIES = {
  floral:    { name: 'Floral & Botanical',    slug: 't-shirts-floral-botanical' },
  landscape: { name: 'Nature & Landscape',    slug: 't-shirts-nature-landscape' },
  animal:    { name: 'Animals & Wildlife',    slug: 't-shirts-animals-wildlife' },
  cute:      { name: 'Cute & Kawaii',         slug: 't-shirts-cute-kawaii' },
  portrait:  { name: 'Portraits & Figures',   slug: 't-shirts-portraits-figures' },
  religious: { name: 'Religious & Spiritual', slug: 't-shirts-religious-spiritual' },
  life:      { name: 'City & Life',           slug: 't-shirts-city-life' },
  abstract:  { name: 'Art & Abstract',        slug: 't-shirts-art-abstract' },
};

async function upsertSubcategories() {
  const map = {};
  for (const [theme, { name, slug }] of Object.entries(THEME_CATEGORIES)) {
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: {
        name,
        slug,
        parentId: TSHIRTS_PARENT_ID,
        isActive: true,
        sortOrder: 0,
      },
    });
    map[theme] = cat.id;
    console.log(`  分类 [${theme}] id=${cat.id}`);
  }
  return map;
}

async function main() {
  const manifestPath = path.join(__dirname, '../shopify/luke_b_manifest.json');
  const classificationPath = path.join(__dirname, '../shopify/luke_b_classification.json');

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const classification = JSON.parse(fs.readFileSync(classificationPath, 'utf8'));

  console.log('创建 8 个主题子分类...');
  const themeToId = await upsertSubcategories();

  let created = 0;
  let skipped = 0;
  const errors = [];

  const files = Object.keys(classification).sort((a, b) => {
    const na = parseInt(a.match(/B(\d+)\.jpg/)[1]);
    const nb = parseInt(b.match(/B(\d+)\.jpg/)[1]);
    return na - nb;
  });

  for (const filename of files) {
    const cdnUrl = manifest[filename];
    if (!cdnUrl) {
      console.warn(`  跳过 ${filename}：manifest 中无对应 URL`);
      skipped++;
      continue;
    }

    const theme = classification[filename];
    const categoryId = themeToId[theme];
    if (!categoryId) {
      console.warn(`  跳过 ${filename}：未知主题 ${theme}`);
      skipped++;
      continue;
    }

    const match = filename.match(/B(\d+)\.jpg/i);
    const n = parseInt(match[1]);
    const sku = `LUKE-B-${n}`;
    const slug = `luke-b-${n}`;
    const name = `Art Print T-Shirt #${n}`;

    try {
      const existing = await prisma.product.findUnique({ where: { sku } });
      if (existing) {
        skipped++;
        continue;
      }

      const product = await prisma.product.create({
        data: {
          name,
          slug,
          sku,
          basePrice: BASE_PRICE_CENTS,
          isCustomizable: false,
          categoryId,
          isActive: true,
          isDraft: false,
          images: {
            create: [{ url: cdnUrl, alt: name, sortOrder: 0 }],
          },
          productCategories: {
            create: [
              { categoryId: TSHIRTS_PARENT_ID },
              { categoryId },
            ],
          },
        },
      });

      created++;
      if (created % 10 === 0) console.log(`  已入库 ${created} 件...`);
    } catch (err) {
      errors.push({ filename, err: err.message });
      console.error(`  错误 ${filename}: ${err.message}`);
    }
  }

  console.log(`\n完成：新建 ${created}，跳过 ${skipped}，错误 ${errors.length}`);
  if (errors.length) {
    console.log('错误详情：', errors);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

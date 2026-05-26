/**
 * 给 100 个 Luke B 产品补充 tags：
 *   - 'T-Shirt'（服装类型）
 *   - 对应的艺术主题（如 'Floral & Botanical'）
 * 运行方式：node scripts/tag-luke-b.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const THEME_TO_TAG = {
  floral:    'Floral & Botanical',
  landscape: 'Nature & Landscape',
  animal:    'Animals & Wildlife',
  cute:      'Cute & Kawaii',
  portrait:  'Portraits & Figures',
  religious: 'Religious & Spiritual',
  life:      'City & Life',
  abstract:  'Art & Abstract',
};

const THEME_SLUGS = {
  floral:    't-shirts-floral-botanical',
  landscape: 't-shirts-nature-landscape',
  animal:    't-shirts-animals-wildlife',
  cute:      't-shirts-cute-kawaii',
  portrait:  't-shirts-portraits-figures',
  religious: 't-shirts-religious-spiritual',
  life:      't-shirts-city-life',
  abstract:  't-shirts-art-abstract',
};

async function main() {
  // 找出每个主题分类对应的产品
  let updated = 0;
  let skipped = 0;

  for (const [theme, themeTag] of Object.entries(THEME_TO_TAG)) {
    const categorySlug = THEME_SLUGS[theme];

    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) {
      console.warn(`  找不到分类 ${categorySlug}，跳过`);
      continue;
    }

    // 找该分类下的所有 Luke B 产品（sku 以 LUKE-B- 开头）
    const products = await prisma.product.findMany({
      where: {
        categoryId: category.id,
        sku: { startsWith: 'LUKE-B-' },
      },
      select: { id: true, sku: true, tags: true },
    });

    for (const product of products) {
      const existingTags = product.tags ?? [];
      const newTags = [...new Set([...existingTags, 'T-Shirt', themeTag])];

      // 如果 tags 已经完整，跳过
      if (newTags.length === existingTags.length && newTags.every((t) => existingTags.includes(t))) {
        skipped++;
        continue;
      }

      await prisma.product.update({
        where: { id: product.id },
        data: { tags: newTags },
      });
      updated++;
    }

    console.log(`  主题 [${theme}] (${products.length} 件) → 已打 tag: T-Shirt, ${themeTag}`);
  }

  console.log(`\n完成：更新 ${updated} 件，跳过 ${skipped} 件`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});

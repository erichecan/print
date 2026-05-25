/**
 * seed-product-tags.js
 *
 * 根据产品现有的 categoryId 自动推断并写入 tags[]。
 * 只处理 tags 为空数组的产品，不覆盖已有 tags。
 *
 * Usage: node backend/scripts/seed-product-tags.js
 *        NODE_ENV=production node backend/scripts/seed-product-tags.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 根据 category slug/name 推断 tags 的规则（按优先级排序）
function inferTags(categorySlug, categoryName) {
  const slug = (categorySlug || '').toLowerCase();
  const name = (categoryName || '').toLowerCase();
  const combined = `${slug} ${name}`;

  const tags = [];

  // ── 服装类型（Dimension 1: garmentType） ──────────────────────────────
  if (combined.includes('v-neck') || combined.includes('v neck')) {
    tags.push('V-Neck T-Shirt');
  } else if (combined.includes('long-sleeve') || combined.includes('long sleeve')) {
    tags.push('Long-Sleeve T-Shirt');
  } else if (combined.includes('polo')) {
    tags.push('Polo Shirt');
  } else if (combined.includes('crewneck') || combined.includes('crew neck')) {
    tags.push('Crewneck Sweatshirt');
  } else if (combined.includes('hoodie')) {
    tags.push('Hoodie');
  } else if (combined.includes('sweatshirt') || combined.includes('sweatshirts')) {
    tags.push('Crewneck Sweatshirt');
  } else if (combined.includes('t-shirt') || combined.includes('tee') || combined.includes('t shirt')) {
    tags.push('T-Shirt');
  }

  // ── 适用人群（Dimension 2: audience） ────────────────────────────────
  if (combined.includes("women's") || combined.includes("women-s") || combined.includes('ladies') || combined.includes('female')) {
    tags.push("Women's");
  } else if (
    combined.includes('kids') || combined.includes('youth') ||
    combined.includes('toddler') || combined.includes('baby') ||
    combined.includes('child') || combined.includes('girls') || combined.includes('boys')
  ) {
    tags.push('Youth');
  } else if (combined.includes('unisex')) {
    tags.push('Unisex');
  } else if (tags.some(t => ['T-Shirt', 'Hoodie', 'Crewneck Sweatshirt', 'Long-Sleeve T-Shirt', 'Polo Shirt', 'V-Neck T-Shirt'].includes(t))) {
    // 有服装类型 tag 但没有人群 tag → 默认 Adult
    tags.push('Adult');
  }

  // ── 领型（Dimension 3: neckline）———由服装类型推断 ────────────────
  if (tags.includes('V-Neck T-Shirt')) {
    tags.push('V-Neck');
  } else if (tags.includes('Polo Shirt')) {
    tags.push('Polo');
    tags.push('Crew Neck');
  } else if (tags.includes('Hoodie')) {
    tags.push('Hooded');
  } else if (tags.includes('T-Shirt') || tags.includes('Long-Sleeve T-Shirt') || tags.includes('Crewneck Sweatshirt')) {
    tags.push('Crew Neck');
  }

  return tags;
}

async function main() {
  console.log('开始自动为产品打 tags...\n');

  // 查询所有 tags 为空的产品（包含 category 信息）
  const products = await prisma.product.findMany({
    where: { tags: { equals: [] } },
    select: {
      id: true,
      name: true,
      tags: true,
      category: { select: { id: true, name: true, slug: true } },
    },
  });

  console.log(`找到 ${products.length} 个 tags 为空的产品\n`);

  let updated = 0;
  let skipped = 0;

  for (const product of products) {
    const cat = product.category;
    if (!cat) {
      skipped++;
      continue;
    }

    const tags = inferTags(cat.slug, cat.name);
    if (tags.length === 0) {
      skipped++;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { tags },
    });

    console.log(`✓ ${product.name.substring(0, 40).padEnd(40)} [${cat.slug.substring(0, 30).padEnd(30)}] → [${tags.join(', ')}]`);
    updated++;
  }

  console.log(`\n完成！已更新 ${updated} 个产品，跳过 ${skipped} 个（无分类或无法推断）`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

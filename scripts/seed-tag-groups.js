/**
 * Seed script: import TAG_TAXONOMY into tag_groups table,
 * and populate categories.filter_tags from CATEGORY_TAG_MAP
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TAG_GROUPS = [
  {
    name: '服装类型',
    slug: 'garment-type',
    sortOrder: 1,
    tags: ['T-Shirt', 'Hoodie', 'Crewneck Sweatshirt', 'Long-Sleeve T-Shirt', 'Polo Shirt', 'V-Neck T-Shirt', 'Cap', 'Mug'],
  },
  {
    name: '适用人群',
    slug: 'audience',
    sortOrder: 2,
    tags: ['Adult', "Women's", 'Youth', 'Unisex'],
  },
  {
    name: 'Neckline',
    slug: 'neckline',
    sortOrder: 3,
    tags: ['Crew Neck', 'V-Neck', 'Hooded', 'Polo'],
  },
  {
    name: 'Material',
    slug: 'material',
    sortOrder: 4,
    tags: ['Cotton', 'Poly-Cotton'],
  },
  {
    name: 'Fit',
    slug: 'fit',
    sortOrder: 5,
    tags: ['Classic Fit', 'Fitted'],
  },
  {
    name: 'Art Theme',
    slug: 'art-theme',
    sortOrder: 6,
    tags: [
      'Floral & Botanical',
      'Nature & Landscape',
      'Animals & Wildlife',
      'Cute & Kawaii',
      'Portraits & Figures',
      'Religious & Spiritual',
      'City & Life',
      'Art & Abstract',
    ],
  },
];

// Maps category slug → filterTags
const CATEGORY_FILTER_TAGS = {
  'hoodies-sweatshirts': ['Hoodie', 'Crewneck Sweatshirt'],
  'kids': ['Youth'],
  'women-s': ["Women's"],
  'hats': ['Cap', 'Hat', 'Beanie'],
  'jackets-vests': ['Jacket', 'Vest', 'Wind Jacket'],
  't-shirts': ['T-Shirt', 'V-Neck T-Shirt', 'Long-Sleeve T-Shirt', 'Polo Shirt'],
  'mugs': ['Mug'],
  'polo-shirts': ['Polo Shirt'],
  'long-sleeve': ['Long-Sleeve T-Shirt'],
};

async function main() {
  console.log('--- Seeding tag_groups ---');
  for (const group of TAG_GROUPS) {
    const result = await prisma.tagGroup.upsert({
      where: { slug: group.slug },
      create: {
        name: group.name,
        slug: group.slug,
        tags: group.tags,
        sortOrder: group.sortOrder,
        isActive: true,
      },
      update: {
        name: group.name,
        tags: group.tags,
        sortOrder: group.sortOrder,
      },
    });
    console.log(`  ✓ TagGroup: ${result.slug} (${result.tags.length} tags)`);
  }

  console.log('\n--- Populating category.filterTags ---');
  for (const [slug, filterTags] of Object.entries(CATEGORY_FILTER_TAGS)) {
    const category = await prisma.category.findUnique({ where: { slug } });
    if (!category) {
      console.log(`  ⚠ Category not found: ${slug}`);
      continue;
    }
    await prisma.category.update({
      where: { slug },
      data: { filterTags },
    });
    console.log(`  ✓ ${slug} → [${filterTags.join(', ')}]`);
  }

  console.log('\n✅ Done.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

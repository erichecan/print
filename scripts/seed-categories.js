/**
 * Seed Categories Script
 * [2025-01-27 18:50:00] 初始化 12 个产品分类及其图片 URL
 * 
 * Usage: node scripts/seed-categories.js
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const categories = [
  {
    name: 'T-shirts',
    slug: 't-shirts',
    description: 'Custom t-shirts and tees',
    imageUrl: '/assets/categories/cat-tshirt.png',
    sortOrder: 1,
    isActive: true,
  },
  {
    name: 'Sweatshirts',
    slug: 'sweatshirts',
    description: 'Hoodies and sweatshirts',
    imageUrl: '/assets/categories/cat-sweatshirt.png',
    sortOrder: 2,
    isActive: true,
  },
  {
    name: 'Hats',
    slug: 'hats',
    description: 'Caps and hats',
    imageUrl: '/assets/categories/cat-hat.png',
    sortOrder: 3,
    isActive: true,
  },
  {
    name: 'Jackets & Vests',
    slug: 'jackets-vests',
    description: 'Outerwear',
    imageUrl: '/assets/categories/cat-jacket-vest.png',
    sortOrder: 4,
    isActive: true,
  },
  {
    name: 'Bags',
    slug: 'bags',
    description: 'Tote bags and backpacks',
    imageUrl: '/assets/categories/cat-bag.png',
    sortOrder: 5,
    isActive: true,
  },
  {
    name: 'Drinkware',
    slug: 'drinkware',
    description: 'Mugs, water bottles, and tumblers',
    imageUrl: '/assets/categories/cat-drinkware.png',
    sortOrder: 6,
    isActive: true,
  },
  {
    name: 'Polos & Business Wear',
    slug: 'polos-business-wear',
    description: 'Business apparel',
    imageUrl: '/assets/categories/cat-polo-business.png',
    sortOrder: 7,
    isActive: true,
  },
  {
    name: 'Workwear and Uniforms',
    slug: 'workwear-uniforms',
    description: 'Work uniforms and apparel',
    imageUrl: '/assets/categories/cat-workwear.png',
    sortOrder: 8,
    isActive: true,
  },
  {
    name: 'Office Supplies',
    slug: 'office-supplies',
    description: 'Office items and supplies',
    imageUrl: '/assets/categories/cat-office.png',
    sortOrder: 9,
    isActive: true,
  },
  {
    name: 'Technology',
    slug: 'technology',
    description: 'Tech accessories',
    imageUrl: '/assets/categories/cat-tech.png',
    sortOrder: 10,
    isActive: true,
  },
  {
    name: 'Trade Show & Signage',
    slug: 'trade-show-signage',
    description: 'Trade show displays and signage',
    imageUrl: '/assets/categories/cat-trade-show.png',
    sortOrder: 11,
    isActive: true,
  },
  {
    name: 'Activewear',
    slug: 'activewear',
    description: 'Athletic and active wear',
    imageUrl: '/assets/categories/cat-activewear.png',
    sortOrder: 12,
    isActive: true,
  },
];

async function main() {
  console.log('🌱 Starting category seeding...');

  try {
    // [2025-01-27 18:50:00] 清空现有分类（可选，如果要重新初始化）
    // await prisma.category.deleteMany({});

    for (const categoryData of categories) {
      // [2025-01-27 18:50:00] 使用 upsert，如果已存在则更新，否则创建
      const category = await prisma.category.upsert({
        where: { slug: categoryData.slug },
        update: {
          name: categoryData.name,
          description: categoryData.description,
          imageUrl: categoryData.imageUrl,
          sortOrder: categoryData.sortOrder,
          isActive: categoryData.isActive,
        },
        create: categoryData,
      });

      console.log(`✅ ${category.name} (${category.slug})`);
    }

    console.log(`\n✨ Successfully seeded ${categories.length} categories!`);
  } catch (error) {
    console.error('❌ Error seeding categories:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


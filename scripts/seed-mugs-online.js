require('dotenv').config({ path: require('path').join(__dirname, '../backend/.env') });

const path = require('path');
const fs = require('fs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const MANIFEST_PATH = path.join(__dirname, '../shopify/shopify_upload_manifest.json');

const VIEWS = ['front', 'angle', 'handle', 'top'];

const PRODUCTS = [
  {
    name: 'White Ceramic Coffee Mug',
    slug: 'white-ceramic-coffee-mug',
    colorSlug: 'white',
    colorHex: '#FFFFFF',
    colorDisplayName: 'White',
    ids: { '11oz': '000109', '15oz': '000110' },
  },
  {
    name: 'Black Accent Ceramic Coffee Mug',
    slug: 'black-accent-ceramic-coffee-mug',
    colorSlug: 'black-accent',
    colorHex: '#111111',
    colorDisplayName: 'Black Accent',
    ids: { '11oz': '000113', '15oz': '000114' },
  },
  {
    name: 'Yellow Accent Ceramic Coffee Mug',
    slug: 'yellow-accent-ceramic-coffee-mug',
    colorSlug: 'yellow-accent',
    colorHex: '#F5C800',
    colorDisplayName: 'Yellow Accent',
    ids: { '11oz': '000115', '15oz': '000116' },
  },
  {
    name: 'Pink Accent Ceramic Coffee Mug',
    slug: 'pink-accent-ceramic-coffee-mug',
    colorSlug: 'pink-accent',
    colorHex: '#E8608A',
    colorDisplayName: 'Pink Accent',
    ids: { '11oz': '000117', '15oz': '000118' },
  },
  {
    name: 'Red Accent Ceramic Coffee Mug',
    slug: 'red-accent-ceramic-coffee-mug',
    colorSlug: 'red-accent',
    colorHex: '#E53030',
    colorDisplayName: 'Red Accent',
    ids: { '11oz': '000119', '15oz': '000120' },
  },
];

function loadManifest() {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function cdnUrl(manifest, productId, colorSlug, view) {
  const key = `${productId}_${colorSlug}_mug_${view}.jpg`;
  const url = manifest[key];
  if (!url) throw new Error(`Manifest missing key: ${key}`);
  return url;
}

async function main() {
  const manifest = loadManifest();

  // 1. Upsert "Mugs" top-level category
  const mugsCategory = await prisma.category.upsert({
    where: { slug: 'mugs' },
    update: {},
    create: {
      name: 'Mugs',
      slug: 'mugs',
      description: 'Custom printed ceramic coffee mugs in multiple sizes and colors',
      sortOrder: 7,
      isActive: true,
    },
  });
  console.log(`Category ready: ${mugsCategory.name} (${mugsCategory.id})\n`);

  for (const product of PRODUCTS) {
    console.log(`─── ${product.name} ───`);

    // 2. Collect CDN URLs for all 8 images (4 views × 2 sizes)
    const imageUrls = { '11oz': {}, '15oz': {} };
    for (const [size, productId] of Object.entries(product.ids)) {
      for (const view of VIEWS) {
        imageUrls[size][view] = cdnUrl(manifest, productId, product.colorSlug, view);
      }
    }

    // 3. Build ProductImage rows (11oz views first, then 15oz views)
    const productImages = [];
    let sortOrder = 0;
    for (const size of ['11oz', '15oz']) {
      for (const view of VIEWS) {
        productImages.push({
          url: imageUrls[size][view],
          alt: `${product.name} ${size} — ${view} view`,
          sortOrder: sortOrder++,
        });
      }
    }

    // 4. Build variants (11oz base price, 15oz +$3)
    const variants = [
      {
        color: product.colorDisplayName,
        colorHex: product.colorHex,
        colorDisplayName: product.colorDisplayName,
        size: '11oz',
        sku: `MUG-11OZ-${product.colorSlug.toUpperCase()}`,
        priceAdjustment: 0,
        stockQuantity: 300,
        imageUrl: imageUrls['11oz']['front'],
      },
      {
        color: product.colorDisplayName,
        colorHex: product.colorHex,
        colorDisplayName: product.colorDisplayName,
        size: '15oz',
        sku: `MUG-15OZ-${product.colorSlug.toUpperCase()}`,
        priceAdjustment: 300,
        stockQuantity: 300,
        imageUrl: imageUrls['15oz']['front'],
      },
    ];

    // 5. Skip if already seeded
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    if (existing) {
      console.log(`  skip (already exists): ${product.slug}\n`);
      continue;
    }

    // 6. Create product with variants + images
    const created = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        categoryId: mugsCategory.id,
        basePrice: 1499,
        sku: `MUG-${product.colorSlug.toUpperCase()}`,
        stockQuantity: 600,
        isActive: true,
        variants: { create: variants },
        images: { create: productImages },
        productCategories: { create: { categoryId: mugsCategory.id } },
      },
    });
    console.log(`  ✓ created: ${created.id}\n`);
  }

  console.log('All done.');
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});

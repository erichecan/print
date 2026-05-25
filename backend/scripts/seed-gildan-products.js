'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const fs = require('fs');
const csv = require('csv-parser');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const CSV_PATH = path.join(__dirname, '../../shopify/shopify_import.csv');
const CATEGORY_NAME = 'Gildan Blanks';
const CATEGORY_SLUG = 'gildan-blanks';
const BRAND_NAME = 'Gildan';
const BRAND_SLUG = 'gildan';
const DEFAULT_PRICE_CENTS = 799;

function parseCSV(filePath) {
  return new Promise((resolve, reject) => {
    const rows = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

async function main() {
  console.log('🌱 Starting Gildan products import...\n');

  const rows = await parseCSV(CSV_PATH);
  console.log(`📄 Parsed ${rows.length} CSV rows`);

  // Group rows by product handle
  const productMap = new Map();
  for (const row of rows) {
    const handle = row['URL handle']?.trim();
    if (!handle) continue;
    if (!productMap.has(handle)) productMap.set(handle, []);
    productMap.get(handle).push(row);
  }
  console.log(`📦 Found ${productMap.size} unique products\n`);

  // Upsert Brand
  const brand = await prisma.brand.upsert({
    where: { slug: BRAND_SLUG },
    update: {},
    create: { name: BRAND_NAME, slug: BRAND_SLUG, description: 'Quality blank apparel' },
  });
  console.log(`🏷️  Brand: ${brand.name} (${brand.id})`);

  // Upsert Category
  const category = await prisma.category.upsert({
    where: { slug: CATEGORY_SLUG },
    update: {},
    create: {
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      description: 'Gildan blank apparel for custom decoration',
      sortOrder: 0,
      isActive: true,
    },
  });
  console.log(`📁 Category: ${category.name} (${category.id})`);

  // Upsert Collection
  const collection = await prisma.collection.upsert({
    where: { slug: CATEGORY_SLUG },
    update: {},
    create: {
      name: CATEGORY_NAME,
      slug: CATEGORY_SLUG,
      description: 'Complete Gildan blank apparel collection',
      isActive: true,
    },
  });
  console.log(`🗂️  Collection: ${collection.name} (${collection.id})\n`);

  let productIndex = 0;
  let totalVariants = 0;
  let totalImages = 0;

  for (const [handle, productRows] of productMap) {
    productIndex++;

    // Get product-level metadata from the first row with a non-empty title
    const metaRow = productRows.find((r) => r['Title']?.trim());
    if (!metaRow) {
      console.log(`  ⚠️  [${productIndex}] Skipping ${handle} — no title found`);
      continue;
    }

    const name = metaRow['Title'].trim();
    const description = metaRow['Description']?.trim() || null;

    // Upsert Product (sku = handle, guaranteed unique)
    const product = await prisma.product.upsert({
      where: { slug: handle },
      update: {
        name,
        description,
        basePrice: DEFAULT_PRICE_CENTS,
        brandId: brand.id,
        categoryId: category.id,
      },
      create: {
        name,
        slug: handle,
        sku: handle,
        description,
        basePrice: DEFAULT_PRICE_CENTS,
        isCustomizable: true,
        isActive: true,
        stockQuantity: 0,
        brandId: brand.id,
        categoryId: category.id,
      },
    });

    // Load existing image URLs to skip duplicates on re-runs
    const existingImgRows = await prisma.productImage.findMany({
      where: { productId: product.id },
      select: { url: true },
    });
    const existingUrls = new Set(existingImgRows.map((i) => i.url));
    const seenUrls = new Set(existingUrls);
    let sortOrder = existingImgRows.length;
    let newImageCount = 0;

    // Insert product-level images (one CDN URL per color from "Product image URL" column)
    for (const row of productRows) {
      const imgUrl = row['Product image URL']?.trim();
      if (!imgUrl || seenUrls.has(imgUrl)) continue;
      seenUrls.add(imgUrl);
      await prisma.productImage.create({
        data: {
          productId: product.id,
          url: imgUrl,
          alt: row['Image alt text']?.trim() || name,
          sortOrder: sortOrder++,
        },
      });
      newImageCount++;
    }

    // Upsert variants (one per SKU row)
    let variantCount = 0;
    for (const row of productRows) {
      const sku = row['SKU']?.trim();
      const color = row['Option1 value']?.trim();
      const size = row['Option2 value']?.trim();
      if (!sku || !color || !size) continue;

      const variantImageUrl = row['Variant image URL']?.trim() || null;
      await prisma.variant.upsert({
        where: { sku },
        update: { color, size, imageUrl: variantImageUrl },
        create: {
          productId: product.id,
          color,
          size,
          sku,
          priceAdjustment: 0,
          stockQuantity: 0,
          imageUrl: variantImageUrl,
        },
      });
      variantCount++;
    }

    // Add to collection (idempotent)
    await prisma.collectionProduct.upsert({
      where: { collectionId_productId: { collectionId: collection.id, productId: product.id } },
      update: {},
      create: { collectionId: collection.id, productId: product.id },
    });

    totalVariants += variantCount;
    totalImages += newImageCount;
    console.log(
      `  ✅ [${productIndex}/14] ${name} — ${variantCount} variants, ${newImageCount} images`
    );
  }

  const stats = {
    categories: await prisma.category.count(),
    brands: await prisma.brand.count(),
    products: await prisma.product.count(),
    variants: await prisma.variant.count(),
    images: await prisma.productImage.count(),
  };

  console.log(`\n🎉 Import complete!`);
  console.log(`   Products:  ${productIndex}`);
  console.log(`   Variants:  ${totalVariants}`);
  console.log(`   Images:    ${totalImages}`);
  console.log(`\n📊 DB totals — products: ${stats.products}, variants: ${stats.variants}, images: ${stats.images}`);
}

main()
  .catch((e) => {
    console.error('❌ Import failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

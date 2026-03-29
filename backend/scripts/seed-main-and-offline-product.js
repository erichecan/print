#!/usr/bin/env node
/**
 * Seed Missing Offline Order Product in Main Catalog and Offline Table
 * 补充缺失的商品到全局商品目录和线下表：AllPro Blended Pique Polo
 */
const path = require('path');
const fs = require('fs');

const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const PRODUCT_DATA = {
  id: '0d730dd0-3f7d-4b68-90fd-eedc502ca189',
  name: 'AllPro Blended Pique Polo',
  slug: 'allpro-blended-pique-polo',
  sku: 'allpro-blended-pique-polo',
  description: 'Imported product: AllPro Blended Pique Polo',
  basePrice: 2595,
  categoryId: 'ec0b0984-86f8-4354-bccb-80d4d8433570', // Production T-shirts category ID
  imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png',
};

async function main() {
  console.log('🌱 Seeding missing product in both main and offline tables...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // 1. Ensure Category exists
    let activeCategoryId = PRODUCT_DATA.categoryId;
    const category = await prisma.category.findUnique({
      where: { id: activeCategoryId },
    });
    
    if (!category) {
      console.log(`⚠️  Category ID ${activeCategoryId} not found. Attempting to find category by slug 't-shirts'...`);
      const tshirtsCat = await prisma.category.findUnique({ where: { slug: 't-shirts' } });
      if (tshirtsCat) {
          activeCategoryId = tshirtsCat.id;
          console.log(`  🔄 Using existing 't-shirts' category (ID: ${activeCategoryId})`);
      } else {
          console.log(`  ✨ Creating new 't-shirts' category...`);
          const newCat = await prisma.category.create({
              data: {
                  id: activeCategoryId,
                  name: 'T-shirts',
                  slug: 't-shirts',
              }
          });
          console.log(`  ✅ Created category: T-shirts`);
      }
    }

    // 2. Insert into main Product table
    const existingMain = await prisma.product.findFirst({
      where: { 
        OR: [
          { sku: PRODUCT_DATA.sku },
          { slug: PRODUCT_DATA.slug }
        ]
      },
    });

    if (existingMain) {
      console.log(`⏭️  Product "${PRODUCT_DATA.name}" already exists in main catalog (SKU: ${existingMain.sku}), skipping`);
    } else {
      await prisma.product.create({
        data: {
          id: PRODUCT_DATA.id,
          name: PRODUCT_DATA.name,
          slug: PRODUCT_DATA.slug,
          sku: PRODUCT_DATA.sku,
          description: PRODUCT_DATA.description,
          basePrice: PRODUCT_DATA.basePrice,
          categoryId: activeCategoryId,
          isActive: true,
          isCustomizable: true,
        },
      });
      console.log(`✅ Created product in main catalog: ${PRODUCT_DATA.name}`);
    }

    // 3. Insert into offline_order_products table
    const existingOffline = await prisma.offline_order_products.findFirst({
      where: { 
        OR: [
          { id: PRODUCT_DATA.id },
          { name: PRODUCT_DATA.name },
          { sku: PRODUCT_DATA.sku }
        ]
      },
    });

    if (existingOffline) {
      console.log(`⏭️  Product "${PRODUCT_DATA.name}" already exists in offline registry, skipping`);
      if (!existingOffline.is_active) {
          await prisma.offline_order_products.update({
              where: { id: existingOffline.id },
              data: { is_active: true }
          });
          console.log(`  ✅ Activated product in offline registry`);
      }
    } else {
      await prisma.offline_order_products.create({
        data: {
          id: PRODUCT_DATA.id,
          name: PRODUCT_DATA.name,
          image_url: PRODUCT_DATA.imageUrl,
          is_customer_owned: false,
          display_order: 100,
          is_active: true,
          categoryId: activeCategoryId,
          sku: PRODUCT_DATA.sku,
        },
      });
      console.log(`✅ Registered product in offline system: ${PRODUCT_DATA.name}`);
    }
    
    console.log('✅ All tasks completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

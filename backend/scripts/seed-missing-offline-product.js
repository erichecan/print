#!/usr/bin/env node
/**
 * Seed Missing Offline Order Product: AllPro Blended Pique Polo
 * 补充缺失的线下订单产品：AllPro Blended Pique Polo
 */
const path = require('path');
const fs = require('fs');

// Load environment variables
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

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

const MISSING_PRODUCT = {
  id: '0d730dd0-3f7d-4b68-90fd-eedc502ca189',
  name: 'AllPro Blended Pique Polo',
  imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png',
  displayOrder: 100,
};

async function main() {
  console.log('🌱 Seeding missing offline product...');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // Check if product exists by name or ID
    const existing = await prisma.offline_order_products.findFirst({
      where: {
        OR: [
          { id: MISSING_PRODUCT.id },
          { name: MISSING_PRODUCT.name }
        ]
      },
    });
    
    if (existing) {
      console.log(`  ⏭️  Product "${MISSING_PRODUCT.name}" already exists (ID: ${existing.id}), skipping`);
      
      // If it exists but is inactive, activate it
      if (!existing.is_active) {
        await prisma.offline_order_products.update({
          where: { id: existing.id },
          data: { is_active: true }
        });
        console.log(`  ✅ Activated product: ${MISSING_PRODUCT.name}`);
      }
    } else {
      await prisma.offline_order_products.create({
        data: {
          id: MISSING_PRODUCT.id,
          name: MISSING_PRODUCT.name,
          image_url: MISSING_PRODUCT.imageUrl,
          is_customer_owned: false,
          display_order: MISSING_PRODUCT.displayOrder,
          is_active: true,
        },
      });
      console.log(`  ✅ Created product: ${MISSING_PRODUCT.name}`);
    }
    
    console.log('✅ Seed completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();

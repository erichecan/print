#!/usr/bin/env node
/**
 * Seed Default Offline Order Products and Colors
 * [2025-12-07 08:20:00] 创建默认的线下订单产品和颜色数据
 */
const path = require('path');
const fs = require('fs');

// [2025-12-07 08:20:00] 加载环境变量（从项目根目录或 backend 目录）
const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

// [2025-12-07 08:20:00] 确保从正确的路径加载 Prisma Client
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// [2025-12-07 08:20:00] 默认产品列表（根据截图）
const DEFAULT_PRODUCTS = [
  // T-shirts 类别
  { name: 'Short Sleeve T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 1 },
  { name: 'Long Sleeve T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 2 },
  { name: 'Soft Tri-Blend T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 3 },
  { name: 'Performance Shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 4 },
  { name: "Women's T-shirts", imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 5 },
  { name: 'Kids T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 6 },
  { name: 'Tie-Dye T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 7 },
  { name: 'Tank Tops & Sleeveless', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 8 },
  { name: 'No Minimum T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 9 },
  { name: 'Made in the USA T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 10 },
  { name: 'Tall T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 11 },
  { name: 'Canada T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 12 },
  { name: 'NEW T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 13 },
  { name: 'All T-shirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 14 },
  
  // Hoodies & Sweatshirts 类别
  { name: 'Hoodies', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 15 },
  { name: 'Crewneck Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 16 },
  { name: 'Full Zip Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 17 },
  { name: 'Quarter Zip Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 18 },
  { name: 'Heavyweight Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 19 },
  { name: 'Lightweight Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 20 },
  { name: 'Champion Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 21 },
  { name: 'Carhartt Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 22 },
  { name: 'Nike Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 23 },
  { name: 'Performance Sweatshirts', imageUrl: 'https://storage.googleapis.com/print-main-product-images/design-lab-products/gildan-softstyle-tshirt/white/front-large_extended.png', displayOrder: 24 },
  
  // 其他选项
  { name: '自带服装', imageUrl: null, isCustomerOwned: true, displayOrder: 25 },
  { name: '其他', imageUrl: null, displayOrder: 26 },
];

// [2025-12-07 08:20:00] 默认颜色列表（根据截图）
const DEFAULT_COLORS = [
  { name: 'Black', hexCode: '#000000' },
  { name: 'Bright Blue', hexCode: '#0066FF' },
  { name: 'White', hexCode: '#FFFFFF' },
  { name: 'Medium Grey', hexCode: '#808080' },
  { name: 'Bright Green', hexCode: '#00FF00' },
  { name: 'Bright Red', hexCode: '#FF0000' },
  { name: 'Light Pink', hexCode: '#FFB6C1' },
  { name: 'Dark Purple', hexCode: '#800080' },
  { name: 'Bright Yellow', hexCode: '#FFFF00' },
  { name: 'Bright Orange', hexCode: '#FFA500' },
  { name: 'Medium Brown', hexCode: '#A0522D' },
  { name: 'Grey Speckled Pattern', hexCode: null }, // 图案，无 hex
  { name: 'Green Camouflage Pattern', hexCode: null }, // 图案，无 hex
  { name: 'Rainbow Tie-Dye Pattern', hexCode: null }, // 图案，无 hex
];

async function seedProducts() {
  console.log('🌱 Seeding default products...');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const product of DEFAULT_PRODUCTS) {
    try {
      // 检查产品是否已存在
      const existing = await prisma.offline_order_products.findFirst({
        where: { name: product.name },
      });
      
      if (existing) {
        console.log(`  ⏭️  Product "${product.name}" already exists, skipping`);
        skippedCount++;
        continue;
      }
      
      // [2025-12-07 09:10:00] 创建产品 - created_at 和 updated_at 由 Prisma 自动处理
      const created = await prisma.offline_order_products.create({
        data: {
          id: uuidv4(),
          name: product.name,
          image_url: product.imageUrl || null,
          is_customer_owned: product.isCustomerOwned || false,
          display_order: product.displayOrder,
          is_active: true,
          // created_at 由 @default(now()) 自动处理
          // updated_at 由 @updatedAt 自动处理
        },
      });
      
      console.log(`  ✅ Created product: ${product.name}`);
      createdCount++;
    } catch (error) {
      console.error(`  ❌ Error creating product "${product.name}":`, error.message);
    }
  }
  
  console.log(`\n📊 Products summary: ${createdCount} created, ${skippedCount} skipped\n`);
  return { createdCount, skippedCount };
}

async function seedColors() {
  console.log('🎨 Seeding default colors...');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const color of DEFAULT_COLORS) {
    try {
      // 检查颜色是否已存在
      const existing = await prisma.offline_order_colors.findUnique({
        where: { name: color.name },
      });
      
      if (existing) {
        console.log(`  ⏭️  Color "${color.name}" already exists, skipping`);
        skippedCount++;
        continue;
      }
      
      // [2025-12-07 09:10:00] 创建颜色 - created_at 由 @default(now()) 自动处理
      await prisma.offline_order_colors.create({
        data: {
          id: uuidv4(),
          name: color.name,
          hex_code: color.hexCode || null,
          // created_at 由 Prisma 自动处理（schema 中有 @default(now())）
          // updated_at 需要手动设置（schema 中没有 @updatedAt）
          updated_at: new Date(),
        },
      });
      
      console.log(`  ✅ Created color: ${color.name}${color.hexCode ? ` (${color.hexCode})` : ' (Pattern)'}`);
      createdCount++;
    } catch (error) {
      console.error(`  ❌ Error creating color "${color.name}":`, error.message);
    }
  }
  
  console.log(`\n📊 Colors summary: ${createdCount} created, ${skippedCount} skipped\n`);
  return { createdCount, skippedCount };
}

async function main() {
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════');
  console.log('🌱 Seed Default Offline Order Data');
  console.log('═══════════════════════════════════════');
  console.log(`Timestamp: ${timestamp}\n`);
  
  try {
    // 测试数据库连接和模型访问
    await prisma.$connect();
    console.log('✅ Database connected');
    
    // 验证模型是否可用
    if (!prisma.offline_order_products || !prisma.offline_order_colors) {
      throw new Error('Prisma models not available. Please run: npx prisma generate');
    }
    console.log('✅ Prisma models verified\n');
    
    // 创建产品
    const productsResult = await seedProducts();
    
    // 创建颜色
    const colorsResult = await seedColors();
    
    console.log('═══════════════════════════════════════');
    console.log('📊 Final Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Products: ${productsResult.createdCount} created, ${productsResult.skippedCount} skipped`);
    console.log(`Colors: ${colorsResult.createdCount} created, ${colorsResult.skippedCount} skipped`);
    console.log('═══════════════════════════════════════');
    console.log('✅ Seed completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行 seed
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { seedProducts, seedColors };


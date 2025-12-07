#!/usr/bin/env node
/**
 * Seed Default Offline Order Products and Colors via API
 * [2025-12-07 08:30:00] 通过 API 创建默认的线下订单产品和颜色数据
 */
const path = require('path');
const fs = require('fs');

// [2025-12-07 08:30:00] 加载环境变量
const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

// [2025-12-07 08:30:00] 支持从环境变量或命令行参数获取 API URL
const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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

/**
 * 登录获取认证 token
 */
async function login(email, password) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Login failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.token || data.accessToken;
  } catch (error) {
    throw new Error(`Failed to login: ${error.message}`);
  }
}

/**
 * 创建产品
 */
async function createProduct(product, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/offline-order-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: product.name,
        imageUrl: product.imageUrl,
        isCustomerOwned: product.isCustomerOwned || false,
        displayOrder: product.displayOrder,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 如果是冲突错误（已存在），返回 null 表示跳过
      if (response.status === 409) {
        return null;
      }
      throw new Error(`Failed to create product: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    throw new Error(`Error creating product "${product.name}": ${error.message}`);
  }
}

/**
 * 创建颜色
 */
async function createColor(color, token) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/offline-order-colors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: color.name,
        hexCode: color.hexCode,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      // 如果是冲突错误（已存在），返回 null 表示跳过
      if (response.status === 409) {
        return null;
      }
      throw new Error(`Failed to create color: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    return data.data || data;
  } catch (error) {
    throw new Error(`Error creating color "${color.name}": ${error.message}`);
  }
}

/**
 * 检查数据库迁移状态
 */
async function checkMigrationStatus(token) {
  try {
    // 尝试获取配置数据，如果表不存在会返回空数组
    const response = await fetch(`${API_BASE_URL}/api/offline-orders/config`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to check migration status: ${response.status}`);
    }

    const data = await response.json();
    return {
      tablesExist: true,
      productsCount: data.products?.length || 0,
      colorsCount: data.colors?.length || 0,
    };
  } catch (error) {
    return {
      tablesExist: false,
      error: error.message,
    };
  }
}

async function seedProducts(token) {
  console.log('🌱 Seeding default products via API...');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const product of DEFAULT_PRODUCTS) {
    try {
      const result = await createProduct(product, token);
      
      if (result === null) {
        console.log(`  ⏭️  Product "${product.name}" already exists, skipping`);
        skippedCount++;
      } else {
        console.log(`  ✅ Created product: ${product.name}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`  ❌ ${error.message}`);
    }
  }
  
  console.log(`\n📊 Products summary: ${createdCount} created, ${skippedCount} skipped\n`);
  return { createdCount, skippedCount };
}

async function seedColors(token) {
  console.log('🎨 Seeding default colors via API...');
  
  let createdCount = 0;
  let skippedCount = 0;
  
  for (const color of DEFAULT_COLORS) {
    try {
      const result = await createColor(color, token);
      
      if (result === null) {
        console.log(`  ⏭️  Color "${color.name}" already exists, skipping`);
        skippedCount++;
      } else {
        console.log(`  ✅ Created color: ${color.name}${color.hexCode ? ` (${color.hexCode})` : ' (Pattern)'}`);
        createdCount++;
      }
    } catch (error) {
      console.error(`  ❌ ${error.message}`);
    }
  }
  
  console.log(`\n📊 Colors summary: ${createdCount} created, ${skippedCount} skipped\n`);
  return { createdCount, skippedCount };
}

async function main() {
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════');
  console.log('🌱 Seed Default Offline Order Data (via API)');
  console.log('═══════════════════════════════════════');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  try {
    // 获取管理员凭据
    const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PASSWORD;
    
    if (!adminEmail || !adminPassword) {
      console.error('❌ Error: ADMIN_EMAIL and ADMIN_PASSWORD environment variables are required');
      console.error('   Please set them in .env file or pass as environment variables');
      console.error('   Example: ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD=password node backend/scripts/seed-offline-defaults-via-api.js');
      process.exit(1);
    }
    
    console.log(`🔐 Logging in as: ${adminEmail}...`);
    
    // 登录获取 token
    const token = await login(adminEmail, adminPassword);
    console.log('✅ Login successful\n');
    
    // 检查数据库迁移状态
    console.log('🔍 Checking database migration status...');
    const migrationStatus = await checkMigrationStatus(token);
    
    if (!migrationStatus.tablesExist) {
      console.error('❌ Error: Database tables do not exist');
      console.error('   Please run database migrations first:');
      console.error('   npx prisma migrate deploy');
      console.error(`   Or enable AUTO_MIGRATE=true in backend environment`);
      process.exit(1);
    }
    
    console.log('✅ Database tables exist');
    console.log(`   Current products: ${migrationStatus.productsCount}`);
    console.log(`   Current colors: ${migrationStatus.colorsCount}\n`);
    
    // 创建产品
    const productsResult = await seedProducts(token);
    
    // 创建颜色
    const colorsResult = await seedColors(token);
    
    console.log('═══════════════════════════════════════');
    console.log('📊 Final Summary');
    console.log('═══════════════════════════════════════');
    console.log(`Products: ${productsResult.createdCount} created, ${productsResult.skippedCount} skipped`);
    console.log(`Colors: ${colorsResult.createdCount} created, ${colorsResult.skippedCount} skipped`);
    console.log('═══════════════════════════════════════');
    console.log('✅ Seed completed successfully!\n');
    
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
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

module.exports = { seedProducts, seedColors, login, checkMigrationStatus };


#!/usr/bin/env node
/**
 * Check Migration Status and Seed Default Offline Order Data via API
 * [2025-12-07 08:40:00] 检查数据库迁移状态，然后通过 API 创建默认数据
 */
const path = require('path');
const fs = require('fs');

// 加载环境变量
const rootEnvPath = path.join(__dirname, '../../.env');
const backendEnvPath = path.join(__dirname, '../.env');

if (fs.existsSync(rootEnvPath)) {
  require('dotenv').config({ path: rootEnvPath });
} else if (fs.existsSync(backendEnvPath)) {
  require('dotenv').config({ path: backendEnvPath });
} else {
  require('dotenv').config();
}

const API_BASE_URL = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

/**
 * 检查数据库迁移状态（通过公开 API）
 */
async function checkMigrationStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/offline-orders/config`, {
      method: 'GET',
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

async function main() {
  const timestamp = new Date().toISOString();
  console.log('═══════════════════════════════════════');
  console.log('🔍 Check Database Migration Status');
  console.log('═══════════════════════════════════════');
  console.log(`Timestamp: ${timestamp}`);
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  try {
    // 检查数据库迁移状态
    console.log('🔍 Checking database migration status...');
    const migrationStatus = await checkMigrationStatus();
    
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
    
    console.log('═══════════════════════════════════════');
    console.log('📋 Next Steps');
    console.log('═══════════════════════════════════════');
    console.log('1. Ensure you have an admin account with ADMIN or SALES_MANAGER role');
    console.log('2. Run the seed script with admin credentials:');
    console.log(`   ADMIN_EMAIL=your-email@example.com ADMIN_PASSWORD=your-password API_BASE_URL=${API_BASE_URL} node backend/scripts/seed-offline-defaults-via-api.js`);
    console.log('═══════════════════════════════════════\n');
    
  } catch (error) {
    console.error('❌ Check failed:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { checkMigrationStatus };


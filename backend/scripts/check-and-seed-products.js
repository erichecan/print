/**
 * [2025-01-29 22:30:00] 检查并确保数据库中有商品数据
 * 如果商品数据不存在，运行 seed 脚本
 */
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');

const prisma = new PrismaClient();

async function checkAndSeedProducts() {
  try {
    console.log('🔍 检查数据库中的商品数据...');
    
    // 检查商品数量
    const productCount = await prisma.product.count({
      where: { isActive: true }
    });
    
    console.log(`📦 当前数据库中的商品数量: ${productCount}`);
    
    if (productCount === 0) {
      console.log('⚠️  数据库中没有商品数据，开始运行 seed...');
      
      // 运行 Prisma seed
      try {
        const repoRoot = path.resolve(__dirname, '../..');
        const seedCommand = 'npm run db:seed';
        console.log(`执行命令: ${seedCommand}`);
        execSync(seedCommand, {
          cwd: repoRoot,
          stdio: 'inherit',
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
          },
        });
        console.log('✅ Prisma seed 完成');
      } catch (seedError) {
        console.error('❌ Prisma seed 失败:', seedError.message);
        
        // 尝试运行 backend/scripts/seed-demo.js
        try {
          console.log('尝试运行 seed-demo.js...');
          execSync('node scripts/seed-demo.js', {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            env: {
              ...process.env,
              DATABASE_URL: process.env.DATABASE_URL,
            },
          });
          console.log('✅ seed-demo.js 完成');
        } catch (demoError) {
          console.error('❌ seed-demo.js 也失败:', demoError.message);
          throw demoError;
        }
      }
      
      // 再次检查
      const newProductCount = await prisma.product.count({
        where: { isActive: true }
      });
      console.log(`📦 Seed 后的商品数量: ${newProductCount}`);
      
      if (newProductCount === 0) {
        throw new Error('Seed 后仍然没有商品数据');
      }
    } else {
      console.log('✅ 数据库中已有商品数据');
    }
    
    // 检查变体数量
    const variantCount = await prisma.variant.count({
      where: {
        product: {
          isActive: true
        }
      }
    });
    console.log(`📦 当前数据库中的变体数量: ${variantCount}`);
    
    if (variantCount === 0) {
      console.log('⚠️  数据库中没有变体数据，可能需要运行 seed-variants.js');
    }
    
    // 列出前 5 个商品
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: 5,
      select: {
        id: true,
        name: true,
        slug: true,
        stockQuantity: true,
        variants: {
          take: 1,
          select: {
            id: true,
            stockQuantity: true,
          }
        }
      }
    });
    
    console.log('\n📋 前 5 个商品:');
    products.forEach((p, i) => {
      console.log(`  ${i + 1}. ${p.name} (${p.slug}) - 库存: ${p.stockQuantity}, 变体: ${p.variants.length}`);
    });
    
    console.log('\n✅ 检查完成');
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 检查 DATABASE_URL
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL 环境变量未设置');
  console.error('请设置 DATABASE_URL 环境变量，例如:');
  console.error('export DATABASE_URL="postgresql://user:password@host:5432/database"');
  process.exit(1);
}

checkAndSeedProducts();


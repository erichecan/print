/**
* Admin Seed Route - 运行数据库 seed 脚本
 * 注意：这是一个管理端点，应该在生产环境中限制访问
 */
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const path = require('path');

// 延迟初始化 Prisma Client，避免在 migrations 之前初始化
// const prisma = new PrismaClient();

// POST /api/admin-seed/run - 运行 seed 脚本
// 先运行 migrations，然后运行 seed
router.post('/run', async (req, res) => {
  try {
    console.log('🌱 开始运行 migrations 和 seed 脚本...');
    
    const repoRoot = path.resolve(__dirname, '../../..');
    const results = {
      migrationResults: [],
      productCountBefore: 0,
      productCountAfter: 0,
      seedResults: [],
    };
    
// 步骤 1: 运行 Prisma migrations
    let migrationsSucceeded = false;
    try {
      console.log('📦 运行 Prisma migrations...');
      const migrationOutput = execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
        cwd: repoRoot,
        stdio: 'pipe',
        timeout: 120000, // 2分钟超时
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      const outputStr = migrationOutput.toString();
      results.migrationResults.push({ 
        type: 'prisma-migrate', 
        success: true, 
        message: 'Prisma migrations completed',
        output: outputStr.substring(0, 500)
      });
      migrationsSucceeded = true;
      console.log('✅ Prisma migrations 完成');
      console.log('Migration output:', outputStr.substring(0, 200));
    } catch (migrationError) {
      const errorOutput = migrationError.stdout ? migrationError.stdout.toString() : '';
      const errorMessage = migrationError.message || migrationError.toString();
      console.error('❌ Prisma migrations 失败:', errorMessage);
      console.error('Error output:', errorOutput.substring(0, 500));
      
// 如果 migrations 失败（可能是空数据库），尝试使用 db push
      if (errorMessage.includes('does not exist') || errorMessage.includes('relation') || errorOutput.includes('does not exist')) {
        console.log('🔄 Migrations 失败，尝试使用 prisma db push 创建表结构...');
        try {
          const pushOutput = execSync('npx prisma db push --schema=./prisma/schema.prisma --accept-data-loss', {
            cwd: repoRoot,
            stdio: 'pipe',
            timeout: 120000,
            env: {
              ...process.env,
              DATABASE_URL: process.env.DATABASE_URL,
            },
          });
          const pushOutputStr = pushOutput.toString();
          console.log('✅ Prisma db push 完成');
          console.log('Push output:', pushOutputStr.substring(0, 200));
          results.migrationResults.push({ 
            type: 'prisma-db-push', 
            success: true, 
            message: 'Prisma db push completed (fallback)',
            output: pushOutputStr.substring(0, 500)
          });
          migrationsSucceeded = true;
        } catch (pushError) {
          console.error('❌ Prisma db push 也失败:', pushError.message);
          results.migrationResults.push({ 
            type: 'prisma-migrate', 
            success: false, 
            message: errorMessage.substring(0, 200),
            output: errorOutput.substring(0, 500)
          });
          migrationsSucceeded = false;
        }
      } else {
        results.migrationResults.push({ 
          type: 'prisma-migrate', 
          success: false, 
          message: errorMessage.substring(0, 200),
          output: errorOutput.substring(0, 500)
        });
        migrationsSucceeded = false;
      }
    }
    
// 检查当前商品数量（在 migrations 之后）
    // 如果 migrations 失败，跳过商品数量检查
    let productCount = 0;
    if (migrationsSucceeded) {
      try {
// 延迟初始化 Prisma Client，确保 migrations 已完成
        const prisma = new PrismaClient();
        // 等待一小段时间确保 migrations 完成
        await new Promise(resolve => setTimeout(resolve, 1000));
        productCount = await prisma.product.count({
          where: { isActive: true }
        });
        results.productCountBefore = productCount;
        console.log(`📦 当前商品数量: ${productCount}`);
        await prisma.$disconnect();
      } catch (countError) {
        console.warn('⚠️  无法检查商品数量（可能表还不存在）:', countError.message);
        results.productCountBefore = 0;
        // 如果 migrations 成功但表仍然不存在，这可能是个问题
        if (migrationsSucceeded) {
          console.warn('⚠️  Migrations 报告成功，但表仍然不存在，可能需要重新检查');
        }
      }
    } else {
      console.warn('⚠️  Migrations 未成功，跳过商品数量检查');
      results.productCountBefore = 0;
// 如果 migrations 失败，直接返回错误，不继续执行 seed
      return res.status(500).json({
        success: false,
        error: 'Database migrations failed. Cannot proceed with seed.',
        results: {
          ...results,
          message: 'Please check migration logs and fix database schema issues before running seed.',
        },
      });
    }
    
// 步骤 2: 运行 Prisma seed
    try {
      console.log('📦 运行 Prisma seed...');
      execSync('npm run db:seed', {
        cwd: repoRoot,
        stdio: 'pipe',
        timeout: 120000, // 2分钟超时
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      results.seedResults.push({ type: 'prisma', success: true, message: 'Prisma seed completed' });
      console.log('✅ Prisma seed 完成');
    } catch (prismaError) {
      console.error('❌ Prisma seed 失败:', prismaError.message);
      results.seedResults.push({ 
        type: 'prisma', 
        success: false, 
        message: prismaError.message.substring(0, 200)
      });
      
      // 尝试运行 seed-demo.js
      try {
        console.log('📦 尝试运行 seed-demo.js...');
        execSync('node scripts/seed-demo.js', {
          cwd: path.resolve(__dirname, '../..'),
          stdio: 'pipe',
          timeout: 60000,
          env: {
            ...process.env,
            DATABASE_URL: process.env.DATABASE_URL,
          },
        });
        results.seedResults.push({ type: 'seed-demo', success: true, message: 'seed-demo.js completed' });
        console.log('✅ seed-demo.js 完成');
      } catch (demoError) {
        console.error('❌ seed-demo.js 也失败:', demoError.message);
        results.seedResults.push({ 
          type: 'seed-demo', 
          success: false, 
          message: demoError.message 
        });
      }
    }
    
    // 再次检查商品数量（仅在 migrations 成功时）
    let newProductCount = 0;
    let variantCount = 0;
    let products = [];
    
    if (migrationsSucceeded) {
      try {
        const prisma = new PrismaClient();
        newProductCount = await prisma.product.count({
          where: { isActive: true }
        });
        results.productCountAfter = newProductCount;
        
        // 检查变体数量
        variantCount = await prisma.variant.count({
          where: {
            product: {
              isActive: true
            }
          }
        });
        
        // 获取前 5 个商品
        products = await prisma.product.findMany({
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
        
        await prisma.$disconnect();
      } catch (error) {
        console.warn('⚠️  无法检查最终商品数量:', error.message);
        results.productCountAfter = 0;
      }
    } else {
      results.productCountAfter = 0;
    }
    
    res.json({
      success: true,
      message: 'Seed 脚本执行完成',
      results: {
        ...results,
        variantCount,
        sampleProducts: products.map(p => ({
          name: p.name,
          slug: p.slug,
          stockQuantity: p.stockQuantity,
          variantCount: p.variants.length,
        })),
      },
    });
  } catch (error) {
    console.error('❌ Seed 脚本执行失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// POST /api/admin-seed/migrate - 运行数据库 migrations
router.post('/migrate', async (req, res) => {
  try {
    console.log('🔧 开始运行数据库 migrations...');
    
    const repoRoot = path.resolve(__dirname, '../../..');
    const results = {
      migrationResults: [],
    };
    
    // 运行 Prisma migrations
    try {
      console.log('📦 运行 Prisma migrate deploy...');
      const output = execSync('npx prisma migrate deploy --schema=./prisma/schema.prisma', {
        cwd: repoRoot,
        stdio: 'pipe',
        timeout: 60000,
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      results.migrationResults.push({ 
        type: 'prisma-migrate', 
        success: true, 
        message: 'Prisma migrations completed',
        output: output.toString().substring(0, 500)
      });
      console.log('✅ Prisma migrations 完成');
    } catch (migrationError) {
      console.error('❌ Prisma migrations 失败:', migrationError.message);
      const errorOutput = migrationError.stdout ? migrationError.stdout.toString() : migrationError.message;
      results.migrationResults.push({ 
        type: 'prisma-migrate', 
        success: false, 
        message: migrationError.message.substring(0, 200),
        output: errorOutput.substring(0, 500)
      });
    }
    
    res.json({
      success: results.migrationResults.some(r => r.success),
      message: 'Migration 脚本执行完成',
      results,
    });
  } catch (error) {
    console.error('❌ Migration 脚本执行失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// POST /api/admin-seed/resolve-migration - 解决失败的迁移
// 修复时间: 2026-01-06T23:20:00.000Z
router.post('/resolve-migration', async (req, res) => {
  try {
    const { migrationName, action = 'applied' } = req.body;
    
    if (!migrationName) {
      return res.status(400).json({
        success: false,
        error: 'migrationName is required'
      });
    }
    
    console.log(`🔧 解决失败的迁移: ${migrationName}, action: ${action}`);
    
    const repoRoot = path.resolve(__dirname, '../../..');
    
    // 使用 prisma migrate resolve 命令
    const args = action === 'applied' 
      ? ['prisma', 'migrate', 'resolve', '--applied', migrationName, '--schema=./prisma/schema.prisma']
      : ['prisma', 'migrate', 'resolve', '--rolled-back', migrationName, '--schema=./prisma/schema.prisma'];
    
    try {
      const output = execSync(`npx ${args.join(' ')}`, {
        cwd: repoRoot,
        stdio: 'pipe',
        timeout: 60000,
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      
      console.log('✅ 迁移状态已解决');
      
      res.json({
        success: true,
        message: `Migration ${migrationName} marked as ${action}`,
        output: output.toString().substring(0, 500)
      });
    } catch (resolveError) {
      console.error('❌ 解决迁移状态失败:', resolveError.message);
      const errorOutput = resolveError.stdout ? resolveError.stdout.toString() : resolveError.message;
      
      res.status(500).json({
        success: false,
        error: resolveError.message,
        output: errorOutput.substring(0, 500)
      });
    }
  } catch (error) {
    console.error('❌ 解决迁移状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
});

// GET /api/admin-seed/status - 检查数据库状态
router.get('/status', async (req, res) => {
  try {
// 延迟初始化 Prisma Client
    const prisma = new PrismaClient();
    
    const productCount = await prisma.product.count({
      where: { isActive: true }
    });
    
    const variantCount = await prisma.variant.count({
      where: {
        product: {
          isActive: true
        }
      }
    });
    
    const categoryCount = await prisma.category.count({
      where: { isActive: true }
    });
    
    const brandCount = await prisma.brand.count({
      where: { isActive: true }
    });
    
    // 获取前 5 个商品
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
    
    await prisma.$disconnect();
    
    res.json({
      success: true,
      data: {
        productCount,
        variantCount,
        categoryCount,
        brandCount,
        sampleProducts: products.map(p => ({
          name: p.name,
          slug: p.slug,
          stockQuantity: p.stockQuantity,
          variantCount: p.variants.length,
        })),
      },
    });
  } catch (error) {
    console.error('❌ 检查数据库状态失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;


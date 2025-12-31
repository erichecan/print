// 临时路由：快速创建 admin 用户
// 注意：这是一个临时修复路由，生产环境应该禁用
const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@suvernireplus.com';
const ADMIN_PASSWORD = 'admin123';

// POST /api/admin-setup/create-user - 创建 admin 用户
router.post('/create-user', async (req, res) => {
  try {
    console.log('🔧 开始创建 admin 用户...');
    
    // 检查用户是否已存在
    let user = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });
    
    if (user) {
      // 更新密码
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      user = await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          passwordHash: hashedPassword,
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      return res.json({
        success: true,
        message: 'Admin 用户密码已更新',
        user: {
          email: user.email,
          role: user.role,
        },
      });
    } else {
      // 创建新用户
      const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, 10);
      user = await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          passwordHash: hashedPassword,
          firstName: 'Admin',
          lastName: 'User',
          role: 'ADMIN',
          emailVerified: true,
        },
      });
      
      return res.json({
        success: true,
        message: 'Admin 用户已创建',
        user: {
          email: user.email,
          role: user.role,
        },
      });
    }
  } catch (error) {
    console.error('❌ 创建 admin 用户失败:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/admin-setup/seed - 运行 seed 脚本
router.post('/seed', async (req, res) => {
  try {
    console.log('🌱 开始运行 seed 脚本...');
    
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    const { execSync } = require('child_process');
    const path = require('path');
    
    // 检查当前商品数量
    const productCount = await prisma.product.count({
      where: { isActive: true }
    });
    
    console.log(`📦 当前商品数量: ${productCount}`);
    
    const repoRoot = path.resolve(__dirname, '../../..');
    const results = {
      productCountBefore: productCount,
      productCountAfter: productCount,
      seedResults: [],
    };
    
    // 运行 Prisma seed
    try {
      console.log('📦 运行 Prisma seed...');
      execSync('npm run db:seed', {
        cwd: repoRoot,
        stdio: 'pipe',
        timeout: 120000,
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
          message: demoError.message.substring(0, 200)
        });
      }
    }
    
    // 再次检查商品数量
    const newProductCount = await prisma.product.count({
      where: { isActive: true }
    });
    results.productCountAfter = newProductCount;
    
    // 检查变体数量
    const variantCount = await prisma.variant.count({
      where: {
        product: {
          isActive: true
        }
      }
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

// GET /api/admin-setup/status - 检查数据库状态
router.get('/status', async (req, res) => {
  try {
    const { PrismaClient } = require('@prisma/client');
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


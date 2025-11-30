#!/usr/bin/env node
/**
 * [2025-01-29 02:00:00] 检查 Neon 数据库中的所有数据
 * 用于部署前验证数据库状态
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkNeonDatabase() {
  try {
    console.log('🔍 检查 Neon 数据库数据...\n');
    console.log(`📡 数据库连接: ${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@') : '未设置'}\n`);

    // 1. 检查数据库连接
    console.log('1️⃣  数据库连接测试...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');

    // 2. 检查所有表
    console.log('2️⃣  检查数据库表...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    console.log(`   找到 ${tables.length} 个表:`);
    tables.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });
    console.log('');

    // 3. 检查用户数据
    console.log('3️⃣  检查用户数据...');
    const userCount = await prisma.user.count();
    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
      },
      take: 5,
    });
    console.log(`   用户总数: ${userCount}`);
    console.log(`   Admin 用户数: ${adminUsers.length}`);
    if (adminUsers.length > 0) {
      console.log('   Admin 用户列表:');
      adminUsers.forEach((user, index) => {
        console.log(`     ${index + 1}. ${user.email} (${user.firstName} ${user.lastName}) - ${user.emailVerified ? '已验证' : '未验证'}`);
      });
    }
    console.log('');

    // 4. 检查分类数据
    console.log('4️⃣  检查分类数据...');
    const categoryCount = await prisma.category.count();
    const activeCategoryCount = await prisma.category.count({
      where: { isActive: true },
    });
    const categories = await prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        _count: {
          select: {
            children: true,
            products: true,
          },
        },
      },
      take: 10,
      orderBy: { sortOrder: 'asc' },
    });
    console.log(`   分类总数: ${categoryCount}`);
    console.log(`   活跃分类数: ${activeCategoryCount}`);
    if (categories.length > 0) {
      console.log('   前10个活跃分类:');
      categories.forEach((cat, index) => {
        console.log(`     ${index + 1}. ${cat.name} (${cat.slug}) - 子分类: ${cat._count.children}, 商品: ${cat._count.products}`);
      });
    }
    console.log('');

    // 5. 检查品牌数据
    console.log('5️⃣  检查品牌数据...');
    const brandCount = await prisma.brand.count();
    const activeBrandCount = await prisma.brand.count({
      where: { isActive: true },
    });
    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      take: 10,
      orderBy: { name: 'asc' },
    });
    console.log(`   品牌总数: ${brandCount}`);
    console.log(`   活跃品牌数: ${activeBrandCount}`);
    if (brands.length > 0) {
      console.log('   前10个活跃品牌:');
      brands.forEach((brand, index) => {
        console.log(`     ${index + 1}. ${brand.name} (${brand.slug}) - 商品数: ${brand._count.products}`);
      });
    }
    console.log('');

    // 6. 检查商品数据
    console.log('6️⃣  检查商品数据...');
    const productCount = await prisma.product.count();
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        stockQuantity: true,
        category: {
          select: {
            name: true,
          },
        },
        brand: {
          select: {
            name: true,
          },
        },
        _count: {
          select: {
            variants: true,
            images: true,
          },
        },
      },
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    console.log(`   商品总数: ${productCount}`);
    console.log(`   活跃商品数: ${activeProductCount}`);
    if (products.length > 0) {
      console.log('   前10个活跃商品:');
      products.forEach((product, index) => {
        console.log(`     ${index + 1}. ${product.name} (${product.slug})`);
        console.log(`        价格: $${(product.basePrice || 0) / 100}`);
        console.log(`        库存: ${product.stockQuantity || 0}`);
        console.log(`        分类: ${product.category?.name || '无'}`);
        console.log(`        品牌: ${product.brand?.name || '无'}`);
        console.log(`        变体数: ${product._count.variants}`);
        console.log(`        图片数: ${product._count.images}`);
      });
    }
    console.log('');

    // 7. 检查商品变体数据
    console.log('7️⃣  检查商品变体数据...');
    const variantCount = await prisma.variant.count();
    const variantsWithStock = await prisma.variant.count({
      where: {
        stockQuantity: {
          gt: 0,
        },
      },
    });
    console.log(`   变体总数: ${variantCount}`);
    console.log(`   有库存的变体数: ${variantsWithStock}`);
    console.log('');

    // 8. 检查商品图片数据
    console.log('8️⃣  检查商品图片数据...');
    const imageCount = await prisma.productImage.count();
    const productsWithImages = await prisma.product.count({
      where: {
        images: {
          some: {},
        },
      },
    });
    console.log(`   图片总数: ${imageCount}`);
    console.log(`   有图片的商品数: ${productsWithImages}`);
    console.log('');

    // 9. 检查集合数据
    console.log('9️⃣  检查集合数据...');
    const collectionCount = await prisma.collection.count();
    const activeCollectionCount = await prisma.collection.count({
      where: { isActive: true },
    });
    const collections = await prisma.collection.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: true,
          },
        },
      },
      take: 10,
    });
    console.log(`   集合总数: ${collectionCount}`);
    console.log(`   活跃集合数: ${activeCollectionCount}`);
    if (collections.length > 0) {
      console.log('   前10个活跃集合:');
      collections.forEach((collection, index) => {
        console.log(`     ${index + 1}. ${collection.name} (${collection.slug}) - 商品数: ${collection._count.products}`);
      });
    }
    console.log('');

    // 10. 数据统计摘要
    console.log('📊 数据统计摘要:');
    console.log(`   ✅ 用户: ${userCount} (Admin: ${adminUsers.length})`);
    console.log(`   ✅ 分类: ${categoryCount} (活跃: ${activeCategoryCount})`);
    console.log(`   ✅ 品牌: ${brandCount} (活跃: ${activeBrandCount})`);
    console.log(`   ✅ 商品: ${productCount} (活跃: ${activeProductCount})`);
    console.log(`   ✅ 变体: ${variantCount} (有库存: ${variantsWithStock})`);
    console.log(`   ✅ 图片: ${imageCount} (有图片的商品: ${productsWithImages})`);
    console.log(`   ✅ 集合: ${collectionCount} (活跃: ${activeCollectionCount})`);
    console.log('');

    // 11. 检查关键数据是否足够
    console.log('⚠️  数据完整性检查:');
    if (activeProductCount === 0) {
      console.log('   ❌ 没有活跃商品！需要导入商品数据');
    } else {
      console.log(`   ✅ 有 ${activeProductCount} 个活跃商品`);
    }

    if (variantsWithStock === 0) {
      console.log('   ❌ 没有有库存的变体！商品无法购买');
    } else {
      console.log(`   ✅ 有 ${variantsWithStock} 个有库存的变体`);
    }

    if (adminUsers.length === 0) {
      console.log('   ❌ 没有 Admin 用户！需要创建管理员账户');
    } else {
      console.log(`   ✅ 有 ${adminUsers.length} 个 Admin 用户`);
    }

    if (activeCategoryCount === 0) {
      console.log('   ⚠️  没有活跃分类！建议创建分类');
    } else {
      console.log(`   ✅ 有 ${activeCategoryCount} 个活跃分类`);
    }

    console.log('\n✅ 数据库检查完成！\n');

  } catch (error) {
    console.error('❌ 检查数据库时出错:', error.message);
    if (error.code === 'P1001') {
      console.error('   无法连接到数据库。请检查 DATABASE_URL 环境变量。');
    } else if (error.code === 'P2025') {
      console.error('   记录未找到。这可能是正常的，如果数据库是空的。');
    } else {
      console.error('   错误详情:', {
        code: error.code,
        meta: error.meta,
      });
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkNeonDatabase();
}

module.exports = { checkNeonDatabase };


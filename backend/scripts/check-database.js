// [2025-01-27 17:00:00] 临时脚本：检查数据库中的产品和图片数据
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库中的产品和图片数据...\n');

    // 检查产品总数
    const productCount = await prisma.product.count();
    console.log(`📦 产品总数: ${productCount}`);

    // 检查活跃产品
    const activeProductCount = await prisma.product.count({
      where: { isActive: true },
    });
    console.log(`✅ 活跃产品数: ${activeProductCount}\n`);

    // 检查图片总数
    const imageCount = await prisma.productImage.count();
    console.log(`🖼️  图片总数: ${imageCount}`);

    // 检查有图片的产品数量
    const productsWithImages = await prisma.product.count({
      where: {
        images: {
          some: {},
        },
      },
    });
    console.log(`📸 有图片的产品数: ${productsWithImages}\n`);

    // 获取前5个产品及其图片信息（使用原始 SQL 查询）
    console.log('📋 前5个产品详情:');
    const productsRaw = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.slug,
        p.is_active as "isActive",
        COUNT(DISTINCT pi.id) as image_count
      FROM products p
      LEFT JOIN product_images pi ON pi.product_id = p.id
      GROUP BY p.id, p.name, p.slug, p.is_active
      ORDER BY p.created_at DESC
      LIMIT 5
    `;

    for (let i = 0; i < productsRaw.length; i++) {
      const product = productsRaw[i];
      console.log(`\n${i + 1}. ${product.name} (${product.slug})`);
      console.log(`   状态: ${product.isActive ? '✅ 活跃' : '❌ 未激活'}`);
      console.log(`   图片数量: ${product.image_count}`);

      // 查询该产品的所有图片（先查询表结构）
      const images = await prisma.$queryRaw`
        SELECT id, url, alt as "alt", sort_order as "sortOrder"
        FROM product_images
        WHERE product_id = ${product.id}
        ORDER BY sort_order ASC
      `;

      if (images.length > 0) {
        images.forEach((img, imgIndex) => {
          console.log(`     图片 ${imgIndex + 1}: ${img.url || 'NULL'} (alt: ${img.alt || 'N/A'})`);
        });
      } else {
        console.log(`     ⚠️  没有图片`);
      }
    }

    // 检查所有图片的 URL 统计
    console.log('\n\n📊 图片 URL 统计:');
    const allImages = await prisma.productImage.findMany({
      select: {
        url: true,
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 20,
    });

    const urlStats = {
      hasUrl: 0,
      nullUrl: 0,
      relativePath: 0,
      absoluteUrl: 0,
    };

    allImages.forEach((img) => {
      if (!img.url) {
        urlStats.nullUrl++;
      } else {
        urlStats.hasUrl++;
        if (img.url.startsWith('http://') || img.url.startsWith('https://')) {
          urlStats.absoluteUrl++;
        } else if (img.url.startsWith('/')) {
          urlStats.relativePath++;
        }
      }
    });

    console.log(`   有 URL: ${urlStats.hasUrl}`);
    console.log(`   NULL URL: ${urlStats.nullUrl}`);
    console.log(`   绝对路径 (http/https): ${urlStats.absoluteUrl}`);
    console.log(`   相对路径 (/开头): ${urlStats.relativePath}`);

    if (allImages.length > 0) {
      console.log('\n   示例图片 URL:');
      allImages.slice(0, 5).forEach((img) => {
        console.log(`     - ${img.product.name}: ${img.url || 'NULL'}`);
      });
    }

  } catch (error) {
    console.error('❌ 查询数据库时出错:', error);
    console.error('错误详情:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
  } finally {
    await prisma.$disconnect();
  }
}

checkDatabase();


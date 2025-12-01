/**
 * 检查数据库中的图片记录
 * [2025-01-29 23:55:00] 查询商品图片、品牌图片和分类图片
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkImageRecords() {
  console.log('🔍 检查数据库中的图片记录...\n');

  try {
    // 检查商品图片
    const productImages = await prisma.productImage.findMany({
      include: {
        product: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
      take: 10, // 只显示前10条
    });

    const totalProductImages = await prisma.productImage.count();
    
    console.log(`📦 商品图片记录:`);
    console.log(`   总数: ${totalProductImages}`);
    
    if (productImages.length > 0) {
      console.log(`\n   前 ${Math.min(10, productImages.length)} 条记录:`);
      productImages.forEach((img, index) => {
        console.log(`   ${index + 1}. ${img.product.name} (${img.product.slug})`);
        console.log(`      URL: ${img.url}`);
        console.log(`      Alt: ${img.alt || 'N/A'}`);
        console.log(`      是否 Custom Ink: ${img.url?.includes('customink.com') || img.url?.includes('mms-images') ? '是' : '否'}`);
        console.log('');
      });
    } else {
      console.log(`   ⚠️  没有商品图片记录\n`);
    }

    // 检查品牌图片
    const brands = await prisma.brand.findMany({
      where: {
        logoUrl: {
          not: null,
        },
      },
      select: {
        name: true,
        slug: true,
        logoUrl: true,
      },
      take: 10,
    });

    const totalBrandsWithLogo = await prisma.brand.count({
      where: {
        logoUrl: {
          not: null,
        },
      },
    });

    console.log(`🏷️  品牌 Logo 记录:`);
    console.log(`   有 logo 的品牌数: ${totalBrandsWithLogo}`);
    
    if (brands.length > 0) {
      console.log(`\n   前 ${Math.min(10, brands.length)} 个品牌:`);
      brands.forEach((brand, index) => {
        console.log(`   ${index + 1}. ${brand.name} (${brand.slug})`);
        console.log(`      URL: ${brand.logoUrl}`);
        console.log(`      是否 Custom Ink: ${brand.logoUrl?.includes('customink.com') || brand.logoUrl?.includes('mms-images') ? '是' : '否'}`);
        console.log('');
      });
    } else {
      console.log(`   ⚠️  没有品牌 logo 记录\n`);
    }

    // 检查分类图片
    const categories = await prisma.category.findMany({
      where: {
        imageUrl: {
          not: null,
        },
      },
      select: {
        name: true,
        slug: true,
        imageUrl: true,
      },
      take: 10,
    });

    const totalCategoriesWithImage = await prisma.category.count({
      where: {
        imageUrl: {
          not: null,
        },
      },
    });

    console.log(`📁 分类图片记录:`);
    console.log(`   有图片的分类数: ${totalCategoriesWithImage}`);
    
    if (categories.length > 0) {
      console.log(`\n   前 ${Math.min(10, categories.length)} 个分类:`);
      categories.forEach((category, index) => {
        console.log(`   ${index + 1}. ${category.name} (${category.slug})`);
        console.log(`      URL: ${category.imageUrl}`);
        console.log(`      是否 Custom Ink: ${category.imageUrl?.includes('customink.com') || category.imageUrl?.includes('mms-images') ? '是' : '否'}`);
        console.log('');
      });
    } else {
      console.log(`   ⚠️  没有分类图片记录\n`);
    }

    // 统计 Custom Ink URL
    const customInkProductImages = await prisma.productImage.count({
      where: {
        OR: [
          { url: { contains: 'customink.com' } },
          { url: { contains: 'mms-images' } },
        ],
      },
    });

    const customInkBrands = await prisma.brand.count({
      where: {
        AND: [
          { logoUrl: { not: null } },
          {
            OR: [
              { logoUrl: { contains: 'customink.com' } },
              { logoUrl: { contains: 'mms-images' } },
            ],
          },
        ],
      },
    });

    const customInkCategories = await prisma.category.count({
      where: {
        AND: [
          { imageUrl: { not: null } },
          {
            OR: [
              { imageUrl: { contains: 'customink.com' } },
              { imageUrl: { contains: 'mms-images' } },
            ],
          },
        ],
      },
    });

    console.log(`\n📊 统计摘要:`);
    console.log(`   商品图片总数: ${totalProductImages}`);
    console.log(`   - Custom Ink URL: ${customInkProductImages}`);
    console.log(`   品牌 Logo 总数: ${totalBrandsWithLogo}`);
    console.log(`   - Custom Ink URL: ${customInkBrands}`);
    console.log(`   分类图片总数: ${totalCategoriesWithImage}`);
    console.log(`   - Custom Ink URL: ${customInkCategories}`);

  } catch (error) {
    console.error('❌ 检查失败:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  checkImageRecords()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    });
}

module.exports = { checkImageRecords };


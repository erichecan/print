/**
 * Custom Ink 商品数据导入脚本
 * [2025-01-28 20:20:00] 将爬取的 JSON 数据导入到数据库
 * 
 * 使用说明：
 * node backend/scripts/import-customink-products.js [json-file-path]
 * 如果不提供路径，将从 all-products.json 导入所有商品
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

const DATA_DIR = path.join(__dirname, '../data/scraped-products');
const ALL_PRODUCTS_FILE = path.join(DATA_DIR, 'all-products.json');

// [2025-01-28 20:20:00] 确保分类存在（支持 2 级分类）
async function ensureCategory(parentSlug, childSlug, name, description = null) {
  let parentCategory = null;
  
  // 确保父分类存在
  if (parentSlug) {
    parentCategory = await prisma.category.findUnique({ where: { slug: parentSlug } });
    if (!parentCategory) {
      // 创建父分类
      const parentName = parentSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      parentCategory = await prisma.category.create({
        data: {
          name: parentName,
          slug: parentSlug,
          description: description || `${parentName} products`,
          isActive: true,
        }
      });
      console.log(`  ✅ 创建父分类: ${parentName} (${parentSlug})`);
    }
  }
  
  // 确保子分类存在
  if (childSlug && childSlug !== parentSlug) {
    let childCategory = await prisma.category.findUnique({ where: { slug: childSlug } });
    if (!childCategory) {
      const childName = childSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      childCategory = await prisma.category.create({
        data: {
          name: childName,
          slug: childSlug,
          description: description || `${childName} products`,
          parentId: parentCategory?.id || null,
          isActive: true,
        }
      });
      console.log(`  ✅ 创建子分类: ${childName} (${childSlug})`);
    }
    return childCategory;
  }
  
  return parentCategory;
}

// [2025-01-28 20:20:00] 确保品牌存在
async function ensureBrand(slug, name, description = null) {
  let brand = await prisma.brand.findUnique({ where: { slug } });
  if (!brand) {
    brand = await prisma.brand.create({
      data: {
        name,
        slug,
        description: description || `${name} products`,
        isActive: true,
      }
    });
    console.log(`  ✅ 创建品牌: ${name} (${slug})`);
  }
  return brand;
}

// [2025-01-28 22:00:00] 生成 SKU（确保唯一性）
async function generateSKU(prisma, skuPrefix, color, size, productId = null) {
  const colorCode = color.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
  let baseSKU = `${skuPrefix}-${colorCode}-${size}`;
  
  // 检查 SKU 是否已存在
  let counter = 0;
  let finalSKU = baseSKU;
  
  while (counter < 1000) { // 最多尝试 1000 次
    const existing = await prisma.variant.findFirst({ 
      where: { sku: finalSKU },
      select: { id: true }
    });
    
    if (!existing) {
      return finalSKU; // SKU 可用
    }
    
    // SKU 已存在，添加数字后缀
    counter++;
    finalSKU = `${baseSKU}-${counter}`;
  }
  
  // 如果还是冲突，使用时间戳
  const timestamp = Date.now().toString().slice(-6);
  return `${baseSKU}-${timestamp}`;
}

// [2025-01-28 20:20:00] 导入单个商品
async function importProduct(productData) {
  try {
    const { product, variants, images } = productData;
    
    // 确保分类和品牌存在
    const category = await ensureCategory(
      product.categoryParentSlug,
      product.categoryChildSlug,
      product.categoryChildSlug || product.categoryParentSlug
    );
    const brand = await ensureBrand(
      product.brandSlug,
      product.brandSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    );
    
    if (!category) {
      throw new Error(`分类不存在: ${product.categoryParentSlug}/${product.categoryChildSlug}`);
    }
    
    // 检查商品是否已存在
    const existing = await prisma.product.findUnique({ where: { slug: product.slug } });
    
    if (existing) {
      console.log(`  ↻ 商品已存在，跳过: ${product.name}`);
      return existing;
    }
    
    // 生成唯一的商品 base SKU（避免与现有商品冲突）
    let baseSKU = `${product.skuPrefix || 'PROD'}-BASE`;
    let counter = 0;
    while (counter < 1000) {
      const existing = await prisma.product.findFirst({ 
        where: { sku: baseSKU },
        select: { id: true }
      });
      if (!existing) break;
      counter++;
      baseSKU = `${product.skuPrefix || 'PROD'}-BASE-${counter}`;
    }
    
    // 创建商品
    const createdProduct = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.slug,
        description: product.description || '',
        longDescription: product.longDescription || product.description || '',
        basePrice: product.basePriceCents,
        sku: baseSKU,
        isCustomizable: product.isCustomizable !== false,
        stockQuantity: 0,
        weight: product.weight ? parseFloat(product.weight) : null,
        dimensions: product.dimensions || null,
        isActive: true,
        categoryId: category.id,
        brandId: brand.id,
      }
    });
    
    console.log(`  ✅ 创建商品: ${product.name}`);
    
    // 创建变体
    let variantCount = 0;
    for (const variantData of variants) {
      const variantSKU = await generateSKU(prisma, product.skuPrefix || 'PROD', variantData.color, variantData.size, createdProduct.id);
      
      await prisma.variant.create({
        data: {
          productId: createdProduct.id,
          color: variantData.color,
          colorHex: variantData.colorHex || null,
          size: variantData.size || 'ONE',
          sku: variantSKU,
          priceAdjustment: variantData.priceAdjustment || 0,
          stockQuantity: variantData.stockQuantity || 50,
          imageUrl: variantData.imageUrl || null,
        }
      });
      variantCount++;
    }
    console.log(`    ✅ 创建 ${variantCount} 个变体`);
    
    // 创建图片
    let imageCount = 0;
    for (const imageData of images) {
      await prisma.productImage.create({
        data: {
          productId: createdProduct.id,
          url: imageData.url,
          alt: imageData.alt || product.name,
          sortOrder: imageData.sortOrder || imageCount,
        }
      });
      imageCount++;
    }
    if (imageCount > 0) {
      console.log(`    ✅ 创建 ${imageCount} 张图片`);
    }
    
    return createdProduct;
    
  } catch (error) {
    console.error(`  ❌ 导入失败: ${error.message}`);
    throw error;
  }
}

// [2025-01-28 20:20:00] 主函数
async function main() {
  console.log('🌱 开始导入 Custom Ink 商品数据...\n');
  
  try {
    // 读取 JSON 文件
    const jsonPath = process.argv[2] || ALL_PRODUCTS_FILE;
    
    if (!fs.existsSync(jsonPath)) {
      console.error(`❌ JSON 文件不存在: ${jsonPath}`);
      process.exit(1);
    }
    
    const fileContent = fs.readFileSync(jsonPath, 'utf-8');
    let productsData;
    
    try {
      const parsed = JSON.parse(fileContent);
      // 判断是单个商品对象还是商品数组
      productsData = Array.isArray(parsed) ? parsed : [parsed];
    } catch (parseError) {
      console.error(`❌ JSON 解析失败: ${parseError.message}`);
      process.exit(1);
    }
    
    console.log(`📋 将导入 ${productsData.length} 个商品\n`);
    
    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;
    
    for (const productData of productsData) {
      try {
        const result = await importProduct(productData);
        if (result) {
          successCount++;
        } else {
          skipCount++;
        }
      } catch (error) {
        errorCount++;
        console.error(`  ❌ 错误: ${error.message}`);
      }
    }
    
    console.log(`\n✨ 导入完成！`);
    console.log(`   - 成功: ${successCount} 个`);
    console.log(`   - 跳过: ${skipCount} 个`);
    console.log(`   - 失败: ${errorCount} 个`);
    
    // 统计数据库中的数据
    const stats = {
      categories: await prisma.category.count(),
      brands: await prisma.brand.count(),
      products: await prisma.product.count(),
      variants: await prisma.variant.count(),
      images: await prisma.productImage.count(),
    };
    
    console.log(`\n📊 数据库统计:`);
    console.log(`   - 分类: ${stats.categories}`);
    console.log(`   - 品牌: ${stats.brands}`);
    console.log(`   - 产品: ${stats.products}`);
    console.log(`   - 变体: ${stats.variants}`);
    console.log(`   - 图片: ${stats.images}`);
    
  } catch (error) {
    console.error('❌ 执行失败:', error);
    throw error;
  }
}

// 运行主函数
if (require.main === module) {
  main()
    .catch(error => {
      console.error('❌ 执行失败:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

module.exports = { importProduct, ensureCategory, ensureBrand };


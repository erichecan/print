// 完整测试数据导入脚本 - 使用 Prisma 导入分类、品牌、产品和变体
const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('crypto');

const prisma = new PrismaClient();

// 完整分类列表（12个分类，与 seed-categories.js 保持一致）
const categories = [
  { name: 'T-Shirts', slug: 't-shirts', description: 'Custom t-shirts and tees', imageUrl: '/assets/categories/cat-tshirt.png', sortOrder: 1 },
  { name: 'Sweatshirts', slug: 'sweatshirts', description: 'Hoodies and sweatshirts', imageUrl: '/assets/categories/cat-sweatshirt.png', sortOrder: 2 },
  { name: 'Hats', slug: 'hats', description: 'Caps and hats', imageUrl: '/assets/categories/cat-hat.png', sortOrder: 3 },
  { name: 'Jackets & Vests', slug: 'jackets-vests', description: 'Outerwear', imageUrl: '/assets/categories/cat-jacket-vest.png', sortOrder: 4 },
  { name: 'Bags', slug: 'bags', description: 'Tote bags and backpacks', imageUrl: '/assets/categories/cat-bag.png', sortOrder: 5 },
  { name: 'Drinkware', slug: 'drinkware', description: 'Mugs, water bottles, and tumblers', imageUrl: '/assets/categories/cat-drinkware.png', sortOrder: 6 },
  { name: 'Polos & Business', slug: 'polos-business', description: 'Business apparel', imageUrl: '/assets/categories/cat-polo-business.png', sortOrder: 7 },
  { name: 'Workwear', slug: 'workwear', description: 'Work uniforms and apparel', imageUrl: '/assets/categories/cat-workwear.png', sortOrder: 8 },
  { name: 'Office Supplies', slug: 'office-supplies', description: 'Office items and supplies', imageUrl: '/assets/categories/cat-office.png', sortOrder: 9 },
  { name: 'Technology', slug: 'technology', description: 'Tech accessories', imageUrl: '/assets/categories/cat-tech.png', sortOrder: 10 },
  { name: 'Trade Show & Signage', slug: 'trade-show-signage', description: 'Trade show displays and signage', imageUrl: '/assets/categories/cat-trade-show.png', sortOrder: 11 },
  { name: 'Activewear', slug: 'activewear', description: 'Athletic and active wear', imageUrl: '/assets/categories/cat-activewear.png', sortOrder: 12 },
];

// 完整品牌列表
const brands = [
  { name: 'Gildan', slug: 'gildan', description: 'Quality blank apparel' },
  { name: 'Hanes', slug: 'hanes', description: 'Classic comfort' },
  { name: 'Jerzees', slug: 'jerzees', description: 'Reliable basics' },
  { name: 'Carhartt', slug: 'carhartt', description: 'Durable workwear' },
  { name: 'Nike', slug: 'nike', description: 'Athletic apparel' },
  { name: 'The North Face', slug: 'north-face', description: 'Outdoor gear' },
  { name: 'Patagonia', slug: 'patagonia', description: 'Sustainable outdoor wear' },
  { name: 'Stanley', slug: 'stanley', description: 'Premium drinkware' },
];

// 扩展产品列表（每个分类至少2-3个产品）
const products = [
  // T-Shirts
  { name: 'Gildan Softstyle Jersey T‑shirt', slug: 'gildan-softstyle-jersey-tee', description: 'A customer favorite tee for screen print or DTG.', longDescription: 'Soft ringspun cotton with modern fit. Perfect for events, teams and giveaways.', basePriceCents: 1500, unitCost: 6.5, salePrice: 0, grossProfit: 8.5, sku: 'tee-0001', stockQuantity: 120, categorySlug: 't-shirts', brandSlug: 'gildan', imageUrl: 'https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=1200&q=80' },
  { name: 'Hanes ComfortSoft T-Shirt', slug: 'hanes-comfortsoft-tee', description: 'Ultra-soft cotton blend t-shirt.', longDescription: 'ComfortSoft fabric with tag-free design. Great for everyday wear.', basePriceCents: 1200, unitCost: 5.0, salePrice: 0, grossProfit: 7.0, sku: 'tee-0002', stockQuantity: 150, categorySlug: 't-shirts', brandSlug: 'hanes', imageUrl: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=1200&q=80' },
  { name: 'Jerzees Heavyweight T-Shirt', slug: 'jerzees-heavyweight-tee', description: 'Durable heavyweight cotton t-shirt.', longDescription: '6.1 oz heavyweight cotton for long-lasting wear.', basePriceCents: 1800, unitCost: 8.0, salePrice: 0, grossProfit: 10.0, sku: 'tee-0003', stockQuantity: 100, categorySlug: 't-shirts', brandSlug: 'jerzees', imageUrl: 'https://images.unsplash.com/photo-1603252109303-2751441dd159?w=1200&q=80' },
  
  // Sweatshirts
  { name: 'Midweight Fleece Hoodie', slug: 'midweight-fleece-hoodie', description: 'Cozy hoodie ideal for embroidery or screen printing.', longDescription: 'Midweight 50/50 fleece. Great for teams, class trips and company swag.', basePriceCents: 3500, unitCost: 16.0, salePrice: 0, grossProfit: 19.0, sku: 'hoodie-0001', stockQuantity: 80, categorySlug: 'sweatshirts', brandSlug: 'hanes', imageUrl: 'https://images.unsplash.com/photo-1520975916090-3105956dac38?w=1200&q=80' },
  { name: 'Gildan Heavy Blend Hoodie', slug: 'gildan-heavy-blend-hoodie', description: 'Warm and comfortable hoodie.', longDescription: '50/50 cotton/polyester blend with double-needle stitching.', basePriceCents: 3800, unitCost: 18.0, salePrice: 0, grossProfit: 20.0, sku: 'hoodie-0002', stockQuantity: 75, categorySlug: 'sweatshirts', brandSlug: 'gildan', imageUrl: 'https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=1200&q=80' },
  
  // Hats
  { name: 'Classic Trucker Hat', slug: 'classic-trucker-hat', description: 'Breathable mesh-back cap perfect for patches.', longDescription: 'Snapback fit with foam front panel. Great canvas for brand patches.', basePriceCents: 1800, unitCost: 7.0, salePrice: 0, grossProfit: 11.0, sku: 'hat-0001', stockQuantity: 150, categorySlug: 'hats', brandSlug: 'jerzees', imageUrl: 'https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=1200&q=80' },
  { name: 'Nike Dri-FIT Cap', slug: 'nike-dri-fit-cap', description: 'Moisture-wicking performance cap.', longDescription: 'Dri-FIT technology keeps you cool and dry.', basePriceCents: 2500, unitCost: 12.0, salePrice: 0, grossProfit: 13.0, sku: 'hat-0002', stockQuantity: 90, categorySlug: 'hats', brandSlug: 'nike', imageUrl: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=1200&q=80' },
  
  // Bags
  { name: 'Canvas Tote Bag', slug: 'canvas-tote-bag', description: 'Eco-friendly canvas tote bag.', longDescription: 'Durable canvas construction with reinforced handles.', basePriceCents: 1200, unitCost: 4.0, salePrice: 0, grossProfit: 8.0, sku: 'bag-0001', stockQuantity: 200, categorySlug: 'bags', brandSlug: 'gildan', imageUrl: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=1200&q=80' },
  
  // Drinkware
  { name: 'Stanley Classic Water Bottle', slug: 'stanley-classic-water-bottle', description: 'Premium insulated water bottle.', longDescription: 'Double-wall vacuum insulation keeps drinks cold for hours.', basePriceCents: 3500, unitCost: 20.0, salePrice: 0, grossProfit: 15.0, sku: 'drink-0001', stockQuantity: 60, categorySlug: 'drinkware', brandSlug: 'stanley', imageUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=1200&q=80' },
  
  // Workwear
  { name: 'Carhartt Work Jacket', slug: 'carhartt-work-jacket', description: 'Durable work jacket for tough conditions.', longDescription: 'Heavy-duty cotton duck fabric with triple-stitched seams.', basePriceCents: 5500, unitCost: 35.0, salePrice: 0, grossProfit: 20.0, sku: 'work-0001', stockQuantity: 50, categorySlug: 'workwear', brandSlug: 'carhartt', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=1200&q=80' },
];

// 变体配置（颜色和尺寸）
const variantConfigs = [
  { color: 'Black', colorHex: '#000000', size: 'S', priceAdjustment: 0 },
  { color: 'Black', colorHex: '#000000', size: 'M', priceAdjustment: 0 },
  { color: 'Black', colorHex: '#000000', size: 'L', priceAdjustment: 0 },
  { color: 'Black', colorHex: '#000000', size: 'XL', priceAdjustment: 0 },
  { color: 'White', colorHex: '#FFFFFF', size: 'S', priceAdjustment: 0 },
  { color: 'White', colorHex: '#FFFFFF', size: 'M', priceAdjustment: 0 },
  { color: 'White', colorHex: '#FFFFFF', size: 'L', priceAdjustment: 0 },
  { color: 'Navy', colorHex: '#001f3f', size: 'M', priceAdjustment: 200 },
  { color: 'Navy', colorHex: '#001f3f', size: 'L', priceAdjustment: 200 },
  { color: 'Gray', colorHex: '#808080', size: 'M', priceAdjustment: 0 },
  { color: 'Gray', colorHex: '#808080', size: 'L', priceAdjustment: 0 },
];

async function ensureCategory(client, data) {
  const existing = await prisma.category.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return await prisma.category.create({ data });
}

async function ensureBrand(client, data) {
  const existing = await prisma.brand.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  return await prisma.brand.create({ data });
}

async function ensureProduct(data, categoryId, brandId) {
  const existing = await prisma.product.findUnique({ where: { slug: data.slug } });
  if (existing) return existing;
  
  const product = await prisma.product.create({
    data: {
      name: data.name,
      slug: data.slug,
      description: data.description,
      longDescription: data.longDescription,
      basePrice: data.basePriceCents,
      unitCost: data.unitCost,
      salePrice: data.salePrice,
      grossProfit: data.grossProfit,
      sku: data.sku,
      stockQuantity: data.stockQuantity,
      isCustomizable: true,
      isActive: true,
      categoryId,
      brandId,
    },
  });
  
// 创建产品图片
  if (data.imageUrl) {
    await prisma.productImage.create({
      data: {
        productId: product.id,
        url: data.imageUrl,
        alt: data.name,
        sortOrder: 1,
      },
    });
  }
  
// 为每个产品创建多个变体
  const variantsToCreate = variantConfigs.slice(0, Math.min(6, variantConfigs.length));
  for (const variantConfig of variantsToCreate) {
    const variantSku = `${data.sku}-${variantConfig.color.substring(0, 3).toUpperCase()}-${variantConfig.size}`;
    await prisma.variant.create({
      data: {
        productId: product.id,
        color: variantConfig.color,
        colorHex: variantConfig.colorHex,
        size: variantConfig.size,
        sku: variantSku,
        priceAdjustment: variantConfig.priceAdjustment,
        stockQuantity: Math.floor(data.stockQuantity / variantsToCreate.length),
      },
    });
  }
  
  return product;
}

async function main() {
  console.log('🌱 开始完整测试数据导入...\n');
  
  try {
// 1. 导入分类
    console.log('📁 导入分类...');
    const categoryMap = new Map();
    for (const catData of categories) {
      const category = await ensureCategory(null, catData);
      categoryMap.set(catData.slug, category.id);
      console.log(`  ✅ ${category.name} (${category.slug})`);
    }
    
// 2. 导入品牌
    console.log('\n🏷️  导入品牌...');
    const brandMap = new Map();
    for (const brandData of brands) {
      const brand = await ensureBrand(null, brandData);
      brandMap.set(brandData.slug, brand.id);
      console.log(`  ✅ ${brand.name} (${brand.slug})`);
    }
    
// 3. 导入产品
    console.log('\n📦 导入产品...');
    let createdCount = 0;
    let updatedCount = 0;
    for (const productData of products) {
      const categoryId = categoryMap.get(productData.categorySlug);
      const brandId = brandMap.get(productData.brandSlug);
      
      if (!categoryId || !brandId) {
        console.log(`  ⚠️  跳过 ${productData.name} (缺少分类或品牌)`);
        continue;
      }
      
      const existing = await prisma.product.findUnique({ where: { slug: productData.slug } });
      if (existing) {
        updatedCount++;
        console.log(`  ↻ ${productData.name} (已存在，跳过)`);
        continue;
      }
      
      await ensureProduct(productData, categoryId, brandId);
      createdCount++;
      console.log(`  ✅ ${productData.name}`);
    }
    
    console.log(`\n✨ 数据导入完成！`);
    console.log(`   - 分类: ${categories.length} 个`);
    console.log(`   - 品牌: ${brands.length} 个`);
    console.log(`   - 产品: 新建 ${createdCount} 个，已存在 ${updatedCount} 个`);
    
// 统计最终数据
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
    console.error('❌ 导入失败:', error);
    throw error;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


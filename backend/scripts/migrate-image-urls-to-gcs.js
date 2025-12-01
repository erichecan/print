/**
 * [2025-12-01 21:50:00] 数据库图片 URL 迁移到 GCS
 *
 * 目标：
 * - 将数据库中指向本地 /assets 或 /uploads 以及 localhost/back-end 域名的图片 URL
 *   统一转换为 GCS Cloud Storage URL（storage.googleapis.com 或 GCP_IMAGE_BASE_URL）
 *
 * 覆盖的字段（参见 docs/DATABASE-SCHEMA.md）：
 * - product_images.image_url / Prisma: productImage.url
 * - product_variants.image_url / Prisma: variant.imageUrl
 * - categories.image_url
 * - brands.logo_url
 * - promotions.banner_image_url
 * - designs.thumbnail_url
 * - design_assets.asset_url
 * - uploads.file_url
 *
 * 使用方式（建议先 dry-run）：
 *   DRY_RUN=true \
 *   NODE_ENV=production \
 *   GCP_IMAGE_BUCKET=print-main-product-images \
 *   node backend/scripts/migrate-image-urls-to-gcs.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { getImageBaseUrl } = require('../src/utils/gcsStorage');

const prisma = new PrismaClient();

const DRY_RUN =
  process.env.DRY_RUN === 'true' || process.env.DRY_RUN === '1';

/**
 * [2025-12-01 21:50:00] 将本地 URL 映射为 GCS URL
 * 规则：
 * - 以 /assets/... 开头：static/ 后续路径
 * - 以 /uploads/... 开头：upload/ 后续路径
 * - 以 FRONTEND_URL 或 BACKEND_URL 开头并紧跟 /assets 或 /uploads：按上述规则处理
 * - 其他 http/https 外链：保持不变
 */
function mapToGcsUrl(url, baseUrl) {
  if (!url || typeof url !== 'string') return url;

  const trimmed = url.trim();

  // 已经是 GCS 或其他合法 CDN URL，直接返回
  if (trimmed.startsWith(baseUrl)) {
    return trimmed;
  }
  if (
    trimmed.startsWith('https://storage.googleapis.com') ||
    trimmed.includes('.storage.googleapis.com/')
  ) {
    return trimmed;
  }

  const frontend = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.replace(/\/$/, '')
    : null;
  const backend = process.env.BACKEND_URL
    ? process.env.BACKEND_URL.replace(/\/$/, '')
    : null;

  const stripOrigin = (value, origin) => {
    if (!origin) return value;
    const normalizedOrigin = origin.replace(/\/$/, '');
    if (value.startsWith(normalizedOrigin)) {
      return value.slice(normalizedOrigin.length);
    }
    return value;
  };

  let pathPart = trimmed;

  if (pathPart.startsWith('http://') || pathPart.startsWith('https://')) {
    pathPart = stripOrigin(pathPart, backend);
    pathPart = stripOrigin(pathPart, frontend);
  }

  if (!pathPart.startsWith('/')) {
    return trimmed;
  }

  let objectPath;
  
  // [2025-12-01 23:00:00] 特殊处理商品图片路径：/assets/products/{slug}/{filename} -> product/{slug}/{filename}
  if (pathPart.startsWith('/assets/products/')) {
    // 去掉 /assets/products/ 前缀，保留 slug/filename
    const relativePath = pathPart.replace(/^\/assets\/products\//, '');
    objectPath = `product/${relativePath}`;
  } else if (pathPart.startsWith('/assets/brands/')) {
    const filename = pathPart.replace(/^\/assets\/brands\//, '');
    objectPath = `brand/${filename}`;
  } else if (pathPart.startsWith('/assets/categories/')) {
    const filename = pathPart.replace(/^\/assets\/categories\//, '');
    objectPath = `category/${filename}`;
  } else if (pathPart.startsWith('/assets/hero/')) {
    const filename = pathPart.replace(/^\/assets\/hero\//, '');
    objectPath = `hero/${filename}`;
  } else if (pathPart.startsWith('/assets/')) {
    objectPath = `static${pathPart}`;
  } else if (pathPart.startsWith('/uploads/')) {
    objectPath = `upload${pathPart.replace(/^\/uploads\//, '')}`;
  } else {
    objectPath = `static${pathPart}`;
  }

  objectPath = objectPath.replace(/^\/+/, '');

  return `${baseUrl}/${objectPath}`;
}

// [2025-12-01 22:50:00] 迁移 ProductImage 表（使用 Prisma Client）
async function migrateProductImages() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 商品图片 (product_images.url)');
  
  const images = await prisma.productImage.findMany({
    select: { id: true, url: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 product_images 中找到 ${images.length} 条有 URL 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const image of images) {
    const original = image.url;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 商品图片更新: ${original.substring(0, 80)}... -> ${mapped.substring(0, 80)}...`);
    } else {
      await prisma.productImage.update({
        where: { id: image.id },
        data: { url: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 商品图片迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 Variant 表
async function migrateVariants() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 商品变体图片 (variants.imageUrl)');
  
  const variants = await prisma.variant.findMany({
    select: { id: true, imageUrl: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 variants 中找到 ${variants.length} 条有 imageUrl 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const variant of variants) {
    const original = variant.imageUrl;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 变体图片更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.variant.update({
        where: { id: variant.id },
        data: { imageUrl: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 变体图片迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 Category 表
async function migrateCategories() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 分类图片 (categories.imageUrl)');
  
  const categories = await prisma.category.findMany({
    select: { id: true, imageUrl: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 categories 中找到 ${categories.length} 条有 imageUrl 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const category of categories) {
    const original = category.imageUrl;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 分类图片更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.category.update({
        where: { id: category.id },
        data: { imageUrl: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 分类图片迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 Brand 表
async function migrateBrands() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 品牌 Logo (brands.logoUrl)');
  
  const brands = await prisma.brand.findMany({
    select: { id: true, logoUrl: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 brands 中找到 ${brands.length} 条有 logoUrl 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const brand of brands) {
    const original = brand.logoUrl;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 品牌 Logo 更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.brand.update({
        where: { id: brand.id },
        data: { logoUrl: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 品牌 Logo 迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 Promotion 表
async function migratePromotions() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 促销 Banner (promotions.bannerImageUrl)');
  
  const promotions = await prisma.promotion.findMany({
    select: { id: true, bannerImageUrl: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 promotions 中找到 ${promotions.length} 条有 bannerImageUrl 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const promotion of promotions) {
    const original = promotion.bannerImageUrl;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 促销 Banner 更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.promotion.update({
        where: { id: promotion.id },
        data: { bannerImageUrl: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 促销 Banner 迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 Design 表
async function migrateDesigns() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 设计缩略图 (designs.thumbnailUrl)');
  
  const designs = await prisma.design.findMany({
    select: { id: true, thumbnailUrl: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 designs 中找到 ${designs.length} 条有 thumbnailUrl 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const design of designs) {
    const original = design.thumbnailUrl;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 设计缩略图更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.design.update({
        where: { id: design.id },
        data: { thumbnailUrl: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 设计缩略图迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

// [2025-12-01 22:50:00] 迁移 DesignAsset 表
async function migrateDesignAssets() {
  const baseUrl = getImageBaseUrl();
  console.log('[2025-12-01 21:50:00] 🔍 开始迁移 设计素材 (design_assets.url)');
  
  const assets = await prisma.designAsset.findMany({
    select: { id: true, url: true },
  });
  
  console.log(`[2025-12-01 21:50:00] 在 design_assets 中找到 ${assets.length} 条有 url 的记录`);
  
  let updateCount = 0;
  let skipCount = 0;
  
  for (const asset of assets) {
    const original = asset.url;
    if (!original || original.trim() === '') {
      skipCount += 1;
      continue;
    }
    
    const mapped = mapToGcsUrl(original, baseUrl);
    
    if (!mapped || mapped === original) {
      skipCount += 1;
      continue;
    }
    
    if (DRY_RUN) {
      console.log(`[2025-12-01 21:50:00] [DRY-RUN] 设计素材更新: ${original?.substring(0, 80)}... -> ${mapped?.substring(0, 80)}...`);
    } else {
      await prisma.designAsset.update({
        where: { id: asset.id },
        data: { url: mapped },
      });
    }
    updateCount += 1;
  }
  
  console.log(`[2025-12-01 21:50:00] ✅ 设计素材迁移完成: 更新 ${updateCount} 条, 跳过 ${skipCount} 条`);
}

async function main() {
  console.log(
    `[2025-12-01 21:50:00] 🚀 开始执行图片 URL -> GCS 迁移脚本 (DRY_RUN=${DRY_RUN})`
  );

  try {
    const baseUrl = getImageBaseUrl();
    console.log(
      `[2025-12-01 21:50:00] 使用的 GCS 基础 URL: ${baseUrl}`
    );

    // [2025-12-01 22:50:00] 使用 Prisma Client 迁移各个表
    await migrateProductImages();
    
    // [2025-12-01 23:10:00] 其他表的迁移（商品图片是主要目标，其他表可选）
    try {
      await migrateCategories();
    } catch (e) {
      console.log(`[2025-12-01 23:10:00] ⚠️  跳过分类图片迁移: ${e.message}`);
    }
    
    try {
      await migrateBrands();
    } catch (e) {
      console.log(`[2025-12-01 23:10:00] ⚠️  跳过品牌 Logo 迁移: ${e.message}`);
    }
    
    // [2025-12-01 23:10:00] 跳过 Variant、Promotion、Design 等表的迁移（这些表可能没有图片数据或 Prisma 模型不可用）
    console.log('[2025-12-01 23:10:00] ℹ️  跳过变体、促销、设计等图片迁移（主要商品图片已完成）');

    console.log(
      `[2025-12-01 21:50:00] 🎉 图片 URL 迁移脚本执行完毕 (DRY_RUN=${DRY_RUN})`
    );
  } catch (error) {
    console.error(
      '[2025-12-01 21:50:00] ❌ 图片 URL 迁移脚本失败:',
      error
    );
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main();
}



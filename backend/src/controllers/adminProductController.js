/**
 * Admin Product Controller
* 提供后台商品管理 CRUD 能力
* 统一后台价格字段的单位转换（数据库存分，接口返回元/美元）
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { Prisma } = require('@prisma/client');
const { redis, deleteCache, getRedisKeys } = require('../config/redis');
const {
  PRODUCT_UPLOAD_DIR,
  buildStorageKey,
  buildPublicUrl,
  extractStorageKeyFromUrl,
} = require('../utils/productUpload');
const { uploadBufferToGcs, buildObjectPath } = require('../utils/gcsStorage');
const logger = require('../utils/logger'); // Import logger

// 将 Prisma Decimal / string / number 安全转换为原始 number，便于做单位换算
const toNumber = (value, fallback = 0) => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number') return Number.isNaN(value) ? fallback : value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
  if (typeof value === 'object') {
    if (typeof value.toNumber === 'function') {
      try {
        const num = value.toNumber();
        return Number.isNaN(num) ? fallback : num;
      } catch {
        return fallback;
      }
    }
    if (value instanceof Number) {
      const num = Number(value);
      return Number.isNaN(num) ? fallback : num;
    }
  }
  return fallback;
};

const DL_PRODUCT_COLORS = [
  { name: 'White', hex: '#ffffff' },
  { name: 'Navy', hex: '#1c203b' },
  { name: 'Maroon', hex: '#731f39' },
  { name: 'Black', hex: '#000000' },
  { name: 'Sport Grey', hex: '#afafaf' },
  { name: 'Heather Dark Grey', hex: '#545454' },
  { name: 'Red', hex: '#f40928' },
  { name: 'Royal Blue', hex: '#395389' },
  { name: 'Forest Green', hex: '#cccccc' },
  { name: 'Purple', hex: '#4f237a' },
];

/**
 * 避免因部署新环境或数据清理导致 Design Lab 默认显示错误的商品（如第一件商品为红色）
 */
exports.seedDesignLabProduct = async (req, res) => {
  try {
    const productSlug = 'design-lab-default-tee';
    const productName = 'Design Lab Default Tee (Gildan Softstyle)';

    // 1. Ensure Category
    let category = await prisma.category.findUnique({
      where: { slug: 't-shirts' }
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'T-Shirts',
          slug: 't-shirts',
          description: 'Quality T-Shirts',
        }
      });
    }

    // 2. Ensure Product
    let product = await prisma.product.findUnique({
      where: { slug: productSlug }
    });

    if (!product) {
      product = await prisma.product.create({
        data: {
          name: productName,
          slug: productSlug,
          description: 'The perfect canvas for your design.',
          basePrice: 1500, // $15.00
          categoryId: category.id,
          sku: 'DL-DEFAULT-TEE-001',
          isCustomizable: true,
          isActive: true,
        }
      });
    } else {
      // Ensure basic fields are correct if it exists
      if (product.name !== productName || product.categoryId !== category.id) {
        product = await prisma.product.update({
          where: { id: product.id },
          data: {
            name: productName,
            categoryId: category.id,
            isActive: true
          }
        });
      }
    }

    // 3. Ensure Variants
    const sizes = ['S', 'M', 'L', 'XL'];
    let createdCount = 0;
    let updatedCount = 0;

    for (const colorData of DL_PRODUCT_COLORS) {
      for (const size of sizes) {
        const sku = `DL-TEE-${colorData.name.replace(/\s+/g, '-').toUpperCase()}-${size}`;

        const existingVariant = await prisma.variant.findUnique({
          where: { sku }
        });

        if (!existingVariant) {
          await prisma.variant.create({
            data: {
              productId: product.id,
              color: colorData.name,
              colorHex: colorData.hex,
              size: size,
              sku: sku,
              priceAdjustment: size === 'XL' ? 200 : 0,
              stockQuantity: 999,
            }
          });
          createdCount++;
        } else {
          // Determine if update is needed (e.g. missing hex)
          if (existingVariant.colorHex !== colorData.hex || existingVariant.productId !== product.id) {
            await prisma.variant.update({
              where: { id: existingVariant.id },
              data: {
                colorHex: colorData.hex,
                productId: product.id // fix relation if weirdness occurred
              }
            });
            updatedCount++;
          }
        }
      }
    }

    // 4. Invalidate cache
    try {
      const { deleteCache } = require('../config/redis');
      await deleteCache(`products:detail:${productSlug}`);
      // Also clear list cache
      const { getRedisKeys, redis } = require('../config/redis');
      const listKeys = await getRedisKeys('products:list:*');
      if (listKeys.length) {
        await redis.del(...listKeys);
      }
    } catch (e) {
      console.warn('Cache invalidation failed in seed:', e);
    }

    return res.json({
      success: true,
      message: 'Design Lab default product seeded successfully',
      details: {
        product: productName,
        slug: productSlug,
        variantsCreated: createdCount,
        variantsUpdated: updatedCount
      }
    });

  } catch (error) {
    console.error('Seed Design Lab Product Error:', error);
    return res.status(500).json({ error: 'Failed to seed product', details: error.message });
  }
};

// 简易 slug 生成工具，确保与 Prisma 事务兼容
const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);

// 确保 slug 唯一
const ensureUniqueSlug = async (tx, baseSlug, existingId) => {
  let candidate = baseSlug;
  let counter = 1;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const duplicate = await tx.product.findFirst({
      where: {
        slug: candidate,
        ...(existingId ? { id: { not: existingId } } : {}),
      },
      select: { id: true },
    });

    if (!duplicate) {
      return candidate;
    }

    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
};

// Normalize alt text inputs from multipart form submissions
const parseAltInputs = (rawInput) => {
  if (!rawInput) return [];
  if (Array.isArray(rawInput)) return rawInput;
  return [rawInput];
};

// Trim alt text while preserving fallback values
const sanitizeAltText = (value, fallback) => {
  if (!value) return fallback || null;
  return value.toString().trim().substring(0, 255) || (fallback || null);
};

// Clear cached product responses after asset mutations
// 使用安全的 getRedisKeys 方法，支持 Redis 不可用的情况
const invalidateProductCache = async (slug) => {
  try {
    const listKeys = await getRedisKeys('products:list:*');
    if (listKeys.length) {
      await redis.del(...listKeys);
    }

    if (slug) {
      await deleteCache(`products:detail:${slug}`);
      const relatedKeys = await getRedisKeys(`products:related:${slug}:*`);
      if (relatedKeys.length) {
        await redis.del(...relatedKeys);
      }
    }
  } catch (error) {
    console.warn('[adminProductController] Failed to invalidate product cache', error.message);
  }
};

// 后台商品列表（分页 / 搜索 / 状态过滤）
exports.listProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const search = req.query.search?.trim();
    const status = req.query.status;
    const categoryId = req.query.categoryId;

    const where = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Exclude system products from the regular admin list
    where.isSystem = false;

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          updatedAt: 'desc',
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
            },
          },
          variants: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          collectionProducts: {
            include: {
              collection: {
                select: { id: true, name: true },
              },
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    // 将图片URL转换为完整的后端服务器URL
    // 添加空值检查，避免处理 null/undefined 时出错
    // 这里同时将数据库中的价格（分 / Decimal）转换为接口返回的金额（元/美元）
    const { optimizeImageUrl } = require('../utils/imageHelper');
    const normalizedProducts = products.map((product) => {
      const basePriceCents = toNumber(product.basePrice, 0);
      const salePriceValue = toNumber(product.salePrice, 0);
      const images = (product.images || []).map((image) => ({
        ...image,
        url: image.url ? (optimizeImageUrl(image.url, { req }) || image.url) : null,
      }));

      return {
        ...product,
        // 数据库存的是“分”，返回给前端统一用“金额”（元/美元，两位小数）
        basePrice: basePriceCents / 100,
        // salePrice 在 schema 中是 Decimal，这里直接转为 number（金额）
        salePrice: salePriceValue,
        images,
        primaryImage: images[0] || null,
        variants: (product.variants || []).map((variant) => ({
          ...variant,
          imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { req }) || variant.imageUrl) : null,
        })),
      };
    });

    res.json({
      data: normalizedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error(' listProducts error:', error);
    console.error(' Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(500).json({
      error: 'Failed to load products',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

// 后台获取单个商品详情
exports.getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        brand: true,
        variants: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        collectionProducts: {
          include: {
            collection: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 将图片URL转换为完整的后端服务器URL
    // 添加空值检查，避免处理 null/undefined 时出错
    // 同时将数据库中的 basePrice（分）与 salePrice（Decimal）转换为金额
    const { optimizeImageUrl } = require('../utils/imageHelper');
    const basePriceCents = toNumber(product.basePrice, 0);
    const salePriceValue = toNumber(product.salePrice, 0);
    const normalizedProduct = {
      ...product,
      basePrice: basePriceCents / 100,
      salePrice: salePriceValue,
      images: (product.images || []).map((image) => ({
        ...image,
        url: image.url ? (optimizeImageUrl(image.url, { req }) || image.url) : null,
      })),
      variants: (product.variants || []).map((variant) => ({
        ...variant,
        imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { req }) || variant.imageUrl) : null,
      })),
    };

    return res.json(normalizedProduct);
  } catch (error) {
    console.error(' getProductById error:', error);
    return res.status(500).json({ error: 'Failed to load product' });
  }
};

// 创建商品
exports.createProduct = async (req, res) => {
  try {
    const {
      name,
      slug,
      categoryId,
      brandId,
      basePrice,
      unitCost,
      salePrice,
      grossProfit,
      sku,
      stockQuantity,
      description,
      longDescription,
      isActive = true,
      isCustomizable = true,
      weight,
      dimensions,
      variants = [],
      images = [],
      collections = [],
    } = req.body || {};

    const { denormalizeImageUrl } = require('../utils/imageHelper');

    if (!name || !categoryId || !sku || typeof basePrice === 'undefined' || basePrice === null) {
      return res.status(400).json({ error: 'Missing required fields: name, categoryId, sku, or basePrice' });
    }

    // 类型转换：basePrice 需要转换为分（整数）
    // basePrice 在 schema 中是 Int 类型（base_price_cents），前端可能发送美元金额
    let basePriceCents;
    if (typeof basePrice === 'number') {
      // 如果是美元金额（通常小于 10000），转换为分
      // 如果已经是分（通常大于 1000），直接使用
      basePriceCents = basePrice < 1000 ? Math.round(basePrice * 100) : Math.round(basePrice);
    } else if (typeof basePrice === 'string') {
      const parsed = parseFloat(basePrice);
      if (isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid basePrice format' });
      }
      basePriceCents = parsed < 1000 ? Math.round(parsed * 100) : Math.round(parsed);
    } else {
      const parsed = parseInt(basePrice, 10);
      if (isNaN(parsed)) {
        return res.status(400).json({ error: 'Invalid basePrice format' });
      }
      basePriceCents = parsed;
    }

    // 确保 basePriceCents 是有效的整数
    if (!Number.isInteger(basePriceCents) || basePriceCents < 0) {
      return res.status(400).json({ error: 'basePrice must be a positive number' });
    }

    // 确保其他价格字段为 Decimal 类型（使用 Prisma.Decimal）
    const convertToDecimal = (value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'string') return new Prisma.Decimal(value);
      if (typeof value === 'number') return new Prisma.Decimal(value);
      return value;
    };

    const result = await prisma.$transaction(async (tx) => {
      const finalSlug = await ensureUniqueSlug(
        tx,
        slugify(slug || name),
        undefined
      );

      const created = await tx.product.create({
        data: {
          name,
          slug: finalSlug,
          categoryId,
          brandId: brandId || null,
          basePrice: basePriceCents,
          unitCost: convertToDecimal(unitCost) || new Prisma.Decimal(0),
          salePrice: convertToDecimal(salePrice) || new Prisma.Decimal(basePriceCents).dividedBy(100),
          grossProfit: convertToDecimal(grossProfit) || new Prisma.Decimal(0),
          sku,
          stockQuantity: stockQuantity || 0,
          description: description || null,
          longDescription: longDescription || null,
          isActive,
          isCustomizable,
          weight: weight ? convertToDecimal(weight) : null,
          dimensions: dimensions || null,
          variants: variants && variants.length > 0
            ? {
              create: variants
                // 过滤掉无效的变体（缺少必需字段）
                .filter((variant) => {
                  return variant && variant.sku && variant.color && variant.size;
                })
                .map((variant) => ({
                  color: variant.color.trim() || 'UNSET',
                  colorHex: variant.colorHex ? variant.colorHex.trim() : null,
                  size: variant.size.trim() || 'ONE',
                  sku: variant.sku.trim(),
                  priceAdjustment: variant.priceAdjustment
                    ? convertToDecimal(variant.priceAdjustment)
                    : new Prisma.Decimal(0),
                  stockQuantity: typeof variant.stockQuantity === 'number'
                    ? Math.max(0, Math.floor(variant.stockQuantity))
                    : 0,
                  imageUrl: variant.imageUrl ? variant.imageUrl.trim() : null,
                })),
            }
            : undefined,
          images: images && images.length > 0
            ? {
              create: images
                // 过滤掉无效的URL（如file://协议）
                .filter((image) => {
                  if (!image || !image.url) return false;
                  const url = image.url.trim();
                  // 只允许 http、https 或相对路径
                  return url.startsWith('http') || url.startsWith('/');
                })
                .map((image, index) => ({
                  url: denormalizeImageUrl(image.url.trim(), req),
                  alt: image.alt ? image.alt.trim() : null,
                  sortOrder:
                    typeof image.sortOrder === 'number'
                      ? image.sortOrder
                      : index,
                })),
            }
            : undefined,
          collectionProducts: collections.length
            ? {
              create: collections.map((collectionId) => ({
                collection: {
                  connect: { id: collectionId },
                },
              })),
            }
            : undefined,
          // Keep categoryId column and productCategories relation in sync
          productCategories: {
            create: {
              categoryId: categoryId,
            }
          },
        },
        include: {
          category: true,
          brand: true,
          variants: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          collectionProducts: {
            include: {
              collection: true,
            },
          },
          productCategories: true,
        },
      });

      return created;
    });

    // 将图片URL转换为完整的后端服务器URL
    // 添加空值检查，避免处理 null/undefined 时出错
    const { optimizeImageUrl } = require('../utils/imageHelper');
    const normalizedResult = {
      ...result,
      images: (result.images || []).map((image) => ({
        ...image,
        url: image.url ? (optimizeImageUrl(image.url, { req }) || image.url) : null,
      })),
      variants: (result.variants || []).map((variant) => ({
        ...variant,
        imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { req }) || variant.imageUrl) : null,
      })),
    };

    // 创建商品后立即清理缓存，确保前台可以看到最新商品
    // 缓存清理失败不应该影响商品创建成功
    try {
      await invalidateProductCache(result.slug);
    } catch (cacheError) {
      console.warn(' Failed to invalidate cache:', cacheError);
      // 缓存清理失败不影响商品创建成功
    }

    return res.status(201).json(normalizedResult);
  } catch (error) {
    // 增强错误日志，输出详细错误信息
    console.error(' createProduct error:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'), // 只输出前10行堆栈
    });
    console.error('Request body:', JSON.stringify(req.body, null, 2));

    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'SKU or slug already exists',
        details: error.meta?.target || 'Unknown field',
      });
    }

    if (error.code === 'P2003') {
      return res.status(400).json({
        error: 'Invalid foreign key reference',
        details: error.meta?.field_name || 'Unknown field',
      });
    }

    // 返回更详细的错误信息（开发环境）
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      return res.status(500).json({
        error: 'Failed to create product',
        details: error.message,
        code: error.code,
        meta: error.meta,
      });
    }

    return res.status(500).json({ error: 'Failed to create product' });
  }
};

// 更新商品
exports.updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      slug,
      categoryId,
      brandId,
      basePrice,
      unitCost,
      salePrice,
      grossProfit,
      sku,
      stockQuantity,
      description,
      longDescription,
      isActive,
      isCustomizable,
      weight,
      dimensions,
      variants,
      images,
      collections,
    } = req.body || {};

    const { denormalizeImageUrl } = require('../utils/imageHelper');

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, isSystem: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot update a system protected product' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalSlug = existing.slug;

      if (typeof slug === 'string' && slug.length > 0 && slug !== existing.slug) {
        finalSlug = await ensureUniqueSlug(tx, slugify(slug), id);
      } else if (typeof name === 'string' && slug === undefined) {
        finalSlug = await ensureUniqueSlug(tx, slugify(name), id);
      }

      // 更新逻辑中补齐价格字段的单位转换，保持与 createProduct 一致：
      // - basePrice：前端提交金额（元/美元），这里统一转换为“分”存数据库
      // - 其他价格字段：统一转换为 Prisma.Decimal，避免类型不一致
      let basePriceCents;
      if (basePrice !== undefined) {
        if (typeof basePrice === 'number') {
          basePriceCents = basePrice < 1000 ? Math.round(basePrice * 100) : Math.round(basePrice);
        } else if (typeof basePrice === 'string') {
          const parsed = parseFloat(basePrice);
          if (!Number.isNaN(parsed)) {
            basePriceCents = parsed < 1000 ? Math.round(parsed * 100) : Math.round(parsed);
          }
        }
      }

      const convertToDecimal = (value) => {
        if (value === undefined || value === null) return undefined;
        if (typeof value === 'string') return new Prisma.Decimal(value);
        if (typeof value === 'number') return new Prisma.Decimal(value);
        return value;
      };

      // 确保 categoryId 不是空字符串
      const finalCategoryId = (categoryId && typeof categoryId === 'string' && categoryId.trim() !== '')
        ? categoryId
        : (categoryId === undefined ? undefined : existing.categoryId);

      const updateData = {
        ...(name !== undefined ? { name } : {}),
        slug: finalSlug,
        ...(finalCategoryId !== undefined ? { categoryId: finalCategoryId } : {}),
        ...(brandId !== undefined ? { brandId } : {}),
        ...(basePriceCents !== undefined ? { basePrice: basePriceCents } : {}),
        ...(unitCost !== undefined ? { unitCost: convertToDecimal(unitCost) } : {}),
        ...(salePrice !== undefined ? { salePrice: convertToDecimal(salePrice) } : {}),
        ...(grossProfit !== undefined ? { grossProfit: convertToDecimal(grossProfit) } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(longDescription !== undefined ? { longDescription } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isCustomizable !== undefined ? { isCustomizable } : {}),
        ...(weight !== undefined ? { weight: convertToDecimal(weight) } : {}),
        ...(dimensions !== undefined ? { dimensions } : {}),
      };

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (Array.isArray(variants)) {
        // 改进变体更新逻辑：upsert 避免 P2003 错误
        // 获取所有现有变体
        const existingVariants = await tx.variant.findMany({
          where: { productId: id }
        });
        const existingVariantIds = new Set(existingVariants.map(v => v.id));
        const incomingVariantIds = new Set(variants.filter(v => v.id).map(v => v.id));

        // 1. 更新或创建传入的变体
        for (const variant of variants) {
          const variantData = {
            productId: id,
            color: variant.color || 'UNSET',
            colorHex: variant.colorHex || null,
            size: variant.size || 'ONE',
            sku: variant.sku,
            priceAdjustment: convertToDecimal(variant.priceAdjustment) || new Prisma.Decimal(0),
            stockQuantity: typeof variant.stockQuantity === 'number' ? Math.max(0, variant.stockQuantity) : 0,
            imageUrl: denormalizeImageUrl(variant.imageUrl, req) || null,
          };

          if (variant.id && existingVariantIds.has(variant.id)) {
            await tx.variant.update({
              where: { id: variant.id },
              data: variantData
            });
          } else {
            // 如果没有 ID，尝试按 SKU 匹配
            const matchBySku = existingVariants.find(v => v.sku === variant.sku);
            if (matchBySku) {
              await tx.variant.update({
                where: { id: matchBySku.id },
                data: variantData
              });
              incomingVariantIds.add(matchBySku.id);
            } else {
              await tx.variant.create({
                data: variantData
              });
            }
          }
        }

        // 2. 删除不再需要的变体（仅当没有被引用时）
        const toDeleteIds = existingVariants
          .map(v => v.id)
          .filter(vId => !incomingVariantIds.has(vId));

        for (const vId of toDeleteIds) {
          try {
            await tx.variant.delete({ where: { id: vId } });
          } catch (delErr) {
            // 如果报错（通常是 P2003 外键约束），则保留该变体，但可以记录日志
            console.warn(` Cannot delete variant ${vId} due to references:`, delErr.message);
          }
        }
      }

      if (Array.isArray(images)) {
        // Only update images if the array is provided.
        // Frontend sends the complete list of desired images.
        // We delete all existing and re-create to ensure sync (simplest approach for ordering).
        // WARNING: This assumes frontend sends EVERYTHING.

        await tx.productImage.deleteMany({ where: { productId: id } });

        if (images.length > 0) {
          const validImages = images
            .filter(img => img && img.url && typeof img.url === 'string')
            .map((image, index) => ({
              productId: id,
              url: denormalizeImageUrl(image.url.trim(), req), // Ensure URL is relative/clean
              alt: image.alt ? image.alt.trim() : null,
              sortOrder: typeof image.sortOrder === 'number' ? image.sortOrder : index,
            }));

          if (validImages.length > 0) {
            await tx.productImage.createMany({ data: validImages });
          }
        }
      }

      if (Array.isArray(collections)) {
        await tx.collectionProduct.deleteMany({ where: { productId: id } });
        if (collections.length) {
          await tx.collectionProduct.createMany({
            data: collections.map((collectionId) => ({
              productId: id,
              collectionId,
            })),
          });
        }
      }

      // Keep categoryId column and productCategories relation in sync
      if (categoryId && typeof categoryId === 'string') {
        // Find existing main category mappings to avoid duplicates or orphans
        // Note: For now we just ensure the CURRENT categoryId is in productCategories.
        // If we wanted only ONE category, we'd delete all others first.
        // But some products might intentionally have multiple categories from other sources.
        await tx.productCategory.upsert({
          where: {
            productId_categoryId: {
              productId: id,
              categoryId: categoryId,
            },
          },
          create: {
            productId: id,
            categoryId: categoryId,
          },
          update: {},
        });
      }

      const refreshed = await tx.product.findUnique({
        where: { id },
        include: {
          category: true,
          brand: true,
          variants: true,
          images: {
            orderBy: { sortOrder: 'asc' },
          },
          collectionProducts: {
            include: {
              collection: true,
            },
          },
          productCategories: true,
        },
      });

      return refreshed;
    });

    // 将图片URL转换为完整的后端服务器URL
    // 添加空值检查，避免处理 null/undefined 时出错
    const { optimizeImageUrl } = require('../utils/imageHelper');
    const basePriceCents = toNumber(result.basePrice, 0);
    const salePriceValue = toNumber(result.salePrice, 0);
    const normalizedResult = {
      ...result,
      basePrice: basePriceCents / 100,
      salePrice: salePriceValue,
      images: (result.images || []).map((image) => ({
        ...image,
        url: image.url ? (optimizeImageUrl(image.url, { req }) || image.url) : null,
      })),
      variants: (result.variants || []).map((variant) => ({
        ...variant,
        imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { req }) || variant.imageUrl) : null,
      })),
    };

    // 更新商品后同步刷新缓存，避免旧数据残留
    await invalidateProductCache(result.slug);

    return res.json(normalizedResult);
  } catch (error) {
    // 增强错误日志，包含详细错误信息
    console.error(' updateProduct error:', {
      error: error.message,
      code: error.code,
      stack: error.stack,
      name: error.name,
      productId: req.params?.id,
    });
    if (error.code === 'P2002') {
      return res.status(409).json({
        error: 'Duplicate SKU or slug',
        message: error.meta?.target ? `Duplicate value for ${error.meta.target}` : undefined,
      });
    }
    return res.status(500).json({
      error: 'Failed to update product',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// 软删除商品
exports.archiveProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, isSystem: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (existing.isSystem) {
      return res.status(403).json({ error: 'Cannot archive a system protected product' });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // 归档商品后清理缓存，防止前台继续展示
    await invalidateProductCache(existing.slug);

    return res.json({ success: true });
  } catch (error) {
    console.error(' archiveProduct error:', error);
    return res.status(500).json({ error: 'Failed to archive product' });
  }
};

// 更新商品状态
exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be boolean' });
    }

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { isSystem: true },
    });

    if (existing?.isSystem) {
      return res.status(403).json({ error: 'Cannot change status of a system protected product' });
    }

    const updated = await prisma.product.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        slug: true,
        isActive: true,
        updatedAt: true,
      },
    });

    // 状态变更也要刷新缓存，保证上架/下架即时生效
    await invalidateProductCache(updated.slug);

    // eslint-disable-next-line no-unused-vars
    const { slug, ...payload } = updated;

    return res.json(payload);
  } catch (error) {
    console.error(' updateProductStatus error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: 'Failed to update product status' });
  }
};

// Handle direct product image uploads via admin panel
// 修复：在 Cloud Run 环境下使用 memoryStorage + GCS 上传，避免只读文件系统报错
exports.uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true, isSystem: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.isSystem) {
      return res.status(403).json({ error: 'Cannot upload images to a system protected product' });
    }

    const altInput =
      req.body.alt || req.body.alts || req.body.altText || req.body.altTexts || null;
    const altValues = parseAltInputs(altInput);

    const existingCount = await prisma.productImage.count({ where: { productId: id } });

    // 并行上传所有图片到 GCS
    const createPayload = await Promise.all(
      files.map(async (file, index) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
        const fileName = `${timestamp}-${safeName}`;

        // 构建 GCS 路径: products/:productId/:fileName
        const objectPath = buildObjectPath('products', [id, fileName]);

        try {
          // 直接从内存 Buffer 上传到 GCS
          const gcsUrl = await uploadBufferToGcs(file.buffer, objectPath, {
            contentType: file.mimetype,
          });

          const fallbackAlt = file.originalname ? file.originalname.replace(/\.[^/.]+$/, '') : null;
          const providedAlt = altValues[index] || (altValues.length === 1 ? altValues[0] : null);

          return {
            productId: id,
            url: gcsUrl, // 存储完整的 GCS URL
            alt: sanitizeAltText(providedAlt, fallbackAlt),
            sortOrder: existingCount + index,
          };
        } catch (uploadError) {
          console.error(`[uploadProductImages] Failed to upload file ${fileName}:`, uploadError);
          throw new Error(`Failed to upload ${fileName} to storage: ${uploadError.message}`);
        }
      })
    );

    const images = await prisma.$transaction(async (tx) => {
      await tx.productImage.createMany({ data: createPayload });

      return tx.productImage.findMany({
        where: { productId: id },
        orderBy: { sortOrder: 'asc' },
      });
    });

    // 将图片 URL 转换为优化的 URL（如果需要）
    const { optimizeImageUrl } = require('../utils/imageHelper');
    const normalizedImages = (images || []).map((image) => ({
      ...image,
      url: image.url ? (optimizeImageUrl(image.url, { req }) || image.url) : null,
    }));

    await invalidateProductCache(product.slug);

    res.status(201).json({
      message: 'Images uploaded successfully',
      images: normalizedImages,
    });
  } catch (error) {
    logger.error('[adminProductController] uploadProductImages error:', error);
    // 检查是否是 GCS 配置错误
    if (error.message && (error.message.includes('GCS') || error.message.includes('Bucket'))) {
      return res.status(500).json({
        error: 'Storage configuration error',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Please check server logs'
      });
    }
    res.status(500).json({
      error: 'Failed to upload product images',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Remove product images and clean up cached payloads
exports.deleteProductImage = async (req, res) => {
  try {
    const { productId, imageId } = req.params;

    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: {
        id: true,
        productId: true,
        url: true,
        sortOrder: true,
        product: {
          select: {
            slug: true,
            isSystem: true,
          },
        },
      },
    });

    if (!image || image.productId !== productId) {
      return res.status(404).json({ error: 'Image not found' });
    }

    if (image.product?.isSystem) {
      return res.status(403).json({ error: 'Cannot delete images from a system protected product' });
    }

    const remainingImages = await prisma.$transaction(async (tx) => {
      await tx.productImage.delete({ where: { id: imageId } });

      const list = await tx.productImage.findMany({
        where: { productId },
        orderBy: { sortOrder: 'asc' },
      });

      for (let index = 0; index < list.length; index += 1) {
        const current = list[index];
        if (current.sortOrder !== index) {
          await tx.productImage.update({
            where: { id: current.id },
            data: { sortOrder: index },
          });
          list[index].sortOrder = index;
        }
      }

      return list;
    });

    const storageKey = extractStorageKeyFromUrl(image.url);
    if (storageKey && storageKey.startsWith('products/')) {
      const relativePath = storageKey.replace(/^products\//, '');
      const absolutePath = path.join(PRODUCT_UPLOAD_DIR, relativePath);
      fs.unlink(absolutePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          console.warn('[adminProductController] Failed to remove image file', absolutePath, err.message);
        }
      });
    }

    await invalidateProductCache(image.product?.slug);

    res.json({
      message: 'Image deleted successfully',
      images: remainingImages,
    });
  } catch (error) {
    console.error('[adminProductController] deleteProductImage error:', error);
    res.status(500).json({ error: 'Failed to delete product image' });
  }
};



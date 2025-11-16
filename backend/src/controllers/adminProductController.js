/**
 * Admin Product Controller
 * [2025-11-11 23:18:42] 提供后台商品管理 CRUD 能力
 */
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const { redis, deleteCache, getRedisKeys } = require('../config/redis');
const {
  PRODUCT_UPLOAD_DIR,
  buildStorageKey,
  buildPublicUrl,
  extractStorageKeyFromUrl,
} = require('../utils/productUpload');

// [2025-11-11 23:18:42] 简易 slug 生成工具，确保与 Prisma 事务兼容
const slugify = (value = '') =>
  value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);

// [2025-11-11 23:18:42] 确保 slug 唯一
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

// [2025-01-27 15:02:30] Normalize alt text inputs from multipart form submissions
const parseAltInputs = (rawInput) => {
  if (!rawInput) return [];
  if (Array.isArray(rawInput)) return rawInput;
  return [rawInput];
};

// [2025-01-27 15:02:30] Trim alt text while preserving fallback values
const sanitizeAltText = (value, fallback) => {
  if (!value) return fallback || null;
  return value.toString().trim().substring(0, 255) || (fallback || null);
};

// [2025-01-27 15:02:30] Clear cached product responses after asset mutations
// [2025-11-15 10:50:00] 使用安全的 getRedisKeys 方法，支持 Redis 不可用的情况
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

// [2025-11-11 23:18:42] 后台商品列表（分页 / 搜索 / 状态过滤）
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

    res.json({
      data: products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[2025-11-11 23:18:42] listProducts error:', error);
    res.status(500).json({ error: 'Failed to load products' });
  }
};

// [2025-11-11 23:18:42] 后台获取单个商品详情
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

    return res.json(product);
  } catch (error) {
    console.error('[2025-11-11 23:18:42] getProductById error:', error);
    return res.status(500).json({ error: 'Failed to load product' });
  }
};

// [2025-11-11 23:18:42] 创建商品
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

    if (!name || !categoryId || !sku || typeof basePrice === 'undefined') {
      return res.status(400).json({ error: 'Missing required fields' });
    }

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
          basePrice,
          unitCost: typeof unitCost === 'undefined' ? 0 : unitCost,
          salePrice: typeof salePrice === 'undefined' ? basePrice : salePrice,
          grossProfit: typeof grossProfit === 'undefined' ? 0 : grossProfit,
          sku,
          stockQuantity: stockQuantity || 0,
          description: description || null,
          longDescription: longDescription || null,
          isActive,
          isCustomizable,
          weight: weight || null,
          dimensions: dimensions || null,
          variants: variants.length
            ? {
                create: variants.map((variant) => ({
                  color: variant.color || null,
                  colorHex: variant.colorHex || null,
                  size: variant.size || null,
                  sku: variant.sku,
                  priceAdjustment: variant.priceAdjustment || 0,
                  stockQuantity: variant.stockQuantity || 0,
                  imageUrl: variant.imageUrl || null,
                })),
              }
            : undefined,
          images: images.length
            ? {
                create: images.map((image, index) => ({
                  url: image.url,
                  alt: image.alt || null,
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
        },
      });

      return created;
    });

    // [2025-11-16 14:15:00] 创建商品后立即清理缓存，确保前台可以看到最新商品
    await invalidateProductCache(result.slug);

    return res.status(201).json(result);
  } catch (error) {
    console.error('[2025-11-11 23:18:42] createProduct error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'SKU or slug already exists' });
    }
    return res.status(500).json({ error: 'Failed to create product' });
  }
};

// [2025-11-11 23:18:42] 更新商品
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

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const result = await prisma.$transaction(async (tx) => {
      let finalSlug = existing.slug;

      if (typeof slug === 'string' && slug.length > 0 && slug !== existing.slug) {
        finalSlug = await ensureUniqueSlug(tx, slugify(slug), id);
      } else if (typeof name === 'string' && slug === undefined) {
        finalSlug = await ensureUniqueSlug(tx, slugify(name), id);
      }

      const updateData = {
        ...(name !== undefined ? { name } : {}),
        slug: finalSlug,
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(brandId !== undefined ? { brandId } : {}),
        ...(basePrice !== undefined ? { basePrice } : {}),
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(salePrice !== undefined ? { salePrice } : {}),
        ...(grossProfit !== undefined ? { grossProfit } : {}),
        ...(sku !== undefined ? { sku } : {}),
        ...(stockQuantity !== undefined ? { stockQuantity } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(longDescription !== undefined ? { longDescription } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(isCustomizable !== undefined ? { isCustomizable } : {}),
        ...(weight !== undefined ? { weight } : {}),
        ...(dimensions !== undefined ? { dimensions } : {}),
      };

      await tx.product.update({
        where: { id },
        data: updateData,
      });

      if (Array.isArray(variants)) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length) {
          await tx.productVariant.createMany({
            data: variants.map((variant) => ({
              productId: id,
              color: variant.color || null,
              colorHex: variant.colorHex || null,
              size: variant.size || null,
              sku: variant.sku,
              priceAdjustment: variant.priceAdjustment || 0,
              stockQuantity: variant.stockQuantity || 0,
              imageUrl: variant.imageUrl || null,
            })),
          });
        }
      }

      if (Array.isArray(images)) {
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (images.length) {
          await tx.productImage.createMany({
            data: images.map((image, index) => ({
              productId: id,
              url: image.url,
              alt: image.alt || null,
              sortOrder:
                typeof image.sortOrder === 'number' ? image.sortOrder : index,
            })),
          });
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
        },
      });

      return refreshed;
    });

    // [2025-11-16 14:15:00] 更新商品后同步刷新缓存，避免旧数据残留
    await invalidateProductCache(result.slug);

    return res.json(result);
  } catch (error) {
    console.error('[2025-11-11 23:18:42] updateProduct error:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate SKU or slug' });
    }
    return res.status(500).json({ error: 'Failed to update product' });
  }
};

// [2025-11-11 23:18:42] 软删除商品
exports.archiveProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existing = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

    // [2025-11-16 14:15:00] 归档商品后清理缓存，防止前台继续展示
    await invalidateProductCache(existing.slug);

    return res.json({ success: true });
  } catch (error) {
    console.error('[2025-11-11 23:18:42] archiveProduct error:', error);
    return res.status(500).json({ error: 'Failed to archive product' });
  }
};

// [2025-11-11 23:18:42] 更新商品状态
exports.updateProductStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body || {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'isActive must be boolean' });
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

    // [2025-11-16 14:15:00] 状态变更也要刷新缓存，保证上架/下架即时生效
    await invalidateProductCache(updated.slug);

    // eslint-disable-next-line no-unused-vars
    const { slug, ...payload } = updated;

    return res.json(payload);
  } catch (error) {
    console.error('[2025-11-11 23:18:42] updateProductStatus error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: 'Failed to update product status' });
  }
};

// [2025-01-27 15:02:30] Handle direct product image uploads via admin panel
exports.uploadProductImages = async (req, res) => {
  try {
    const { id } = req.params;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ error: 'At least one image file is required' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true, slug: true },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const altInput =
      req.body.alt || req.body.alts || req.body.altText || req.body.altTexts || null;
    const altValues = parseAltInputs(altInput);

    const existingCount = await prisma.productImage.count({ where: { productId: id } });

    const createPayload = files.map((file, index) => {
      const storageKey = buildStorageKey(file.filename);
      const publicUrl = buildPublicUrl(storageKey);
      const fallbackAlt = file.originalname ? file.originalname.replace(/\.[^/.]+$/, '') : null;
      const providedAlt = altValues[index] || (altValues.length === 1 ? altValues[0] : null);

      return {
        productId: id,
        url: publicUrl,
        alt: sanitizeAltText(providedAlt, fallbackAlt),
        sortOrder: existingCount + index,
      };
    });

    const images = await prisma.$transaction(async (tx) => {
      await tx.productImage.createMany({ data: createPayload });

      return tx.productImage.findMany({
        where: { productId: id },
        orderBy: { sortOrder: 'asc' },
      });
    });

    await invalidateProductCache(product.slug);

    res.status(201).json({
      message: 'Images uploaded successfully',
      images,
    });
  } catch (error) {
    console.error('[adminProductController] uploadProductImages error:', error);
    res.status(500).json({ error: 'Failed to upload product images' });
  }
};

// [2025-01-27 15:02:30] Remove product images and clean up cached payloads
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
          },
        },
      },
    });

    if (!image || image.productId !== productId) {
      return res.status(404).json({ error: 'Image not found' });
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



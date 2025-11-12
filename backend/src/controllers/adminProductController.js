/**
 * Admin Product Controller
 * [2025-11-11 23:18:42] 提供后台商品管理 CRUD 能力
 */
const prisma = require('../lib/prisma');

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
      select: { id: true },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await prisma.product.update({
      where: { id },
      data: { isActive: false },
    });

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
        isActive: true,
        updatedAt: true,
      },
    });

    return res.json(updated);
  } catch (error) {
    console.error('[2025-11-11 23:18:42] updateProductStatus error:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.status(500).json({ error: 'Failed to update product status' });
  }
};



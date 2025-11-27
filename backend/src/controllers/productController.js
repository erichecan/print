/**
 * Product Controller
 * [2025-01-27 00:00:00]
 * [2025-01-27 13:55:00] Enhanced with out-of-stock filtering
 * [2025-01-27 17:00:00] Added filter options API endpoint
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const { optimizeImageUrl } = require('../utils/imageHelper');

const PRODUCT_LIST_CACHE_TTL = 300; // 5 minutes
const PRODUCT_DETAIL_CACHE_TTL = 600; // 10 minutes
const FILTER_OPTIONS_CACHE_TTL = 600; // 10 minutes

// [2025-01-27 16:40:00] 辅助函数：安全地将 Prisma.Decimal 或数字转换为 Number
const toNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) {
    return defaultValue;
  }
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'object' && value.toNumber && typeof value.toNumber === 'function') {
    return value.toNumber();
  }
  const parsed = Number(value);
  return isNaN(parsed) ? defaultValue : parsed;
};

/**
 * Get filter options with counts
 * GET /api/products/filters/options?collection=
 * [2025-01-27 17:00:00] 获取筛选选项统计数据，用于动态渲染筛选器
 */
exports.getFilterOptions = async (req, res) => {
  try {
    const collectionSlug = req.query.collection;
    const search = req.query.search;

    // Build base where clause
    const baseWhere = {
      isActive: true,
    };
    const andConditions = [];

    // Filter by collection
    if (collectionSlug) {
      andConditions.push({
        collectionProducts: {
          some: {
            collection: {
              slug: collectionSlug,
              isActive: true,
            },
          },
        },
      });
    }

    // Search filter
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      baseWhere.AND = andConditions;
    }

    const cacheKey = `products:filters:${JSON.stringify({ collection: collectionSlug || '', search: search || '' })}`;
    const cachedFilters = await getCache(cacheKey);

    if (cachedFilters) {
      return res.json(cachedFilters);
    }

    // [2025-01-27 17:00:00] 先获取符合条件的产品ID列表，然后用于统计
    const matchingProductIds = await prisma.product.findMany({
      where: baseWhere,
      select: { id: true },
    });
    const productIds = matchingProductIds.map(p => p.id);

    // [2025-01-27 17:00:00] 获取分类统计（包括一级和二级分类）
    const allCategories = await prisma.category.findMany({
      where: {
        isActive: true,
      },
      include: {
        children: {
          where: {
            isActive: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    // [2025-01-27 17:00:00] 获取每个分类的商品数量
    const categoryCounts = await Promise.all(
      allCategories.map(async (cat) => {
        const productCount = await prisma.product.count({
          where: {
            ...baseWhere,
            categoryId: cat.id,
          },
        });
        const childCounts = await Promise.all(
          cat.children.map(async (child) => {
            const count = await prisma.product.count({
              where: {
                ...baseWhere,
                categoryId: child.id,
              },
            });
            return { ...child, count };
          })
        );
        return {
          ...cat,
          count: productCount,
          children: childCounts,
        };
      })
    );

    const categories = categoryCounts.filter(cat => cat.count > 0 || cat.children.some(c => c.count > 0));

    // [2025-01-27 17:00:00] 获取品牌统计
    const allBrands = await prisma.brand.findMany({
      where: {
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const brands = await Promise.all(
      allBrands.map(async (brand) => {
        const productCount = await prisma.product.count({
          where: {
            ...baseWhere,
            brandId: brand.id,
          },
        });
        return {
          ...brand,
          _count: { products: productCount },
        };
      })
    );

    const brandsWithProducts = brands.filter(b => b._count.products > 0);

    // [2025-01-27 17:00:00] 获取颜色统计（从variants）
    // color是String（必填），colorHex是String?（可选），只需过滤空字符串
    const colorStats = await prisma.variant.groupBy({
      by: ['color', 'colorHex'],
      where: {
        product: baseWhere,
        color: {
          not: '',
        },
        colorHex: {
          not: '',
        },
      },
      _count: {
        _all: true,
      },
    }).catch(() => []); // [2025-01-27 17:05:00] 如果查询失败，返回空数组

    // [2025-01-27 17:00:00] 获取尺寸统计（从variants）
    // size是String（必填），只需过滤空字符串
    const sizeStats = await prisma.variant.groupBy({
      by: ['size'],
      where: {
        product: baseWhere,
        size: {
          not: '',
        },
      },
      _count: {
        _all: true,
      },
    }).catch(() => []); // [2025-01-27 17:05:00] 如果查询失败，返回空数组

    // [2025-01-27 17:00:00] 获取价格范围统计
    const products = await prisma.product.findMany({
      where: baseWhere,
      select: {
        basePrice: true,
      },
    });

    const prices = products.map((p) => toNumber(p.basePrice) / 100); // 转换为美元
    const minPrice = Math.min(...prices, 0);
    const maxPrice = Math.max(...prices, 0);

    // [2025-01-27 17:00:00] 价格区间统计
    const priceRanges = [
      { name: '$', min: 0, max: 20, count: 0 },
      { name: '$$', min: 20, max: 40, count: 0 },
      { name: '$$$', min: 40, max: Infinity, count: 0 },
    ];

    prices.forEach((price) => {
      priceRanges.forEach((range) => {
        if (price >= range.min && price < range.max) {
          range.count++;
        }
      });
    });

    // [2025-01-27 17:00:00] 格式化分类数据
    const categoryTree = categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      slug: cat.slug,
      count: cat.count,
      children: cat.children.map((child) => ({
        id: child.id,
        name: child.name,
        slug: child.slug,
        count: child.count,
      })),
    }));

    // [2025-01-27 17:00:00] 格式化品牌数据
    const brandOptions = brandsWithProducts.map((brand) => ({
      name: brand.name,
      slug: brand.slug,
      count: brand._count.products,
    }));

    // [2025-01-27 17:00:00] 格式化颜色数据
    const colorOptions = colorStats.map((stat) => ({
      name: stat.color,
      hex: stat.colorHex || '#CCCCCC',
      count: stat._count._all,
    }));

    // [2025-01-27 17:00:00] 格式化尺寸数据
    const sizeOptions = sizeStats
      .map((stat) => ({
        name: stat.size,
        count: stat._count._all,
      }))
      .sort((a, b) => {
        // 排序：XS, S, M, L, XL, 2XL, 3XL等
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'];
        const indexA = sizeOrder.indexOf(a.name);
        const indexB = sizeOrder.indexOf(b.name);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

    const filterData = {
      categories: categoryTree,
      brands: brandOptions,
      colors: colorOptions,
      sizes: sizeOptions,
      priceRanges: priceRanges.map((r) => ({
        name: r.name,
        count: r.count,
      })),
      priceRange: {
        min: minPrice,
        max: maxPrice,
      },
      // [2025-01-27 17:00:00] 目前数据库中不存在的字段，返回空数组
      fit: [],
      decoration: [],
      material: [],
      type: [],
      style: [],
      neckline: [],
      features: [],
      rushDelivery: [],
    };

    await setCache(cacheKey, filterData, FILTER_OPTIONS_CACHE_TTL);

    res.json(filterData);
  } catch (error) {
    logger.error('[2025-01-27 17:00:00] Failed to get filter options:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch filter options',
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message,
      }),
    });
  }
};

/**
 * Get products list with pagination, filtering, and sorting
 * GET /api/products?page=1&limit=20&collection=&search=&sort=
 */
exports.getProducts = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
    const skip = (page - 1) * limit;
    const collectionSlug = req.query.collection;
    const search = req.query.search;
    // [2025-01-27 16:45:00] 只使用数据库中实际存在的列名，避免 Prisma 映射问题
    const allowedSortFields = ['createdAt', 'name', 'updatedAt'];
    const requestedSort = req.query.sort || 'createdAt';
    const sortBy = allowedSortFields.includes(requestedSort) ? requestedSort : 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where = {
      isActive: true,
    };
    const andConditions = [];

    // Filter out products with no available variants (optional, can be controlled by query param)
    // [2025-01-27 13:55:00] Out-of-stock filtering
    // [2025-11-16 14:12:00] 支持仅使用产品库存的简单商品，避免前端看不到新建商品
    const includeOutOfStock = req.query.includeOutOfStock === 'true';
    if (!includeOutOfStock) {
      andConditions.push({
        OR: [
          {
            variants: {
              some: {
                stockQuantity: {
                  gt: 0,
                },
              },
            },
          },
          {
            AND: [
              {
                variants: {
                  none: {},
                },
              },
              {
                stockQuantity: {
                  gt: 0,
                },
              },
            ],
          },
        ],
      });
    }

    // Filter by collection
    if (collectionSlug) {
      andConditions.push({
        collectionProducts: {
          some: {
            collection: {
              slug: collectionSlug,
              isActive: true,
            },
          },
        },
      });
    }

    // Search by name, description, or SKU
    if (search) {
      andConditions.push({
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (andConditions.length > 0) {
      where.AND = andConditions;
    }

    // [2025-01-27 16:30:00] 构建缓存key，包含所有筛选条件
    const cacheKey = `products:list:${JSON.stringify({
      page,
      limit,
      collection: collectionSlug || '',
      search: search || '',
      sort: sortBy,
      order: sortOrder,
      includeOutOfStock,
    })}`;

    const cachedResponse = await getCache(cacheKey);

    if (cachedResponse) {
      return res.json(cachedResponse);
    }

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: {
          id: true,
          name: true,
          slug: true,
          basePrice: true,
          salePrice: true,
          stockQuantity: true,
          createdAt: true,
          updatedAt: true,
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          brand: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          images: {
            select: {
              url: true,
              alt: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          variants: {
            select: {
              id: true,
              color: true,
              colorHex: true,
              stockQuantity: true,
            },
            orderBy: { stockQuantity: 'desc' },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const normalizedProducts = products.map((product) => {
      const primaryImage = product.images[0];
      const primaryVariant = product.variants[0];

      // [2025-01-27 16:20:00] 将图片URL转换为完整的后端服务器URL
      const imageUrl = primaryImage
        ? optimizeImageUrl(primaryImage.url, req)
        : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: {
          base: toNumber(product.basePrice) / 100, // 转换为美元
          sale: toNumber(product.salePrice),
          currency: 'CAD',
        },
        primaryImage: imageUrl
          ? {
              url: imageUrl,
              alt: primaryImage.alt || product.name,
            }
          : null,
        category: product.category
          ? {
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,
        brand: product.brand
          ? {
              name: product.brand.name,
              slug: product.brand.slug,
            }
          : null,
        // [2025-01-27 18:30:00] 添加variants信息用于颜色显示
        variants: product.variants
          .filter((v) => v.color && v.color.trim() !== '') // [2025-01-27 17:05:00] 只返回有颜色信息的variant
          .map((v) => ({
            color: v.color || null,
            colorHex: v.colorHex || null,
          })),
        rating: {
          average: 4.5, // 默认值，可以从reviews计算
          count: 10000, // 默认值
        },
      };
    });

    const response = {
      data: normalizedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, response, PRODUCT_LIST_CACHE_TTL);

    res.json(response);
  } catch (error) {
    logger.error('[2025-01-27 13:55:00] Failed to get products:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      meta: error.meta,
    });
    const errorResponse = {
      error: 'Server Error',
      message: 'Failed to fetch products',
    };

    if (process.env.NODE_ENV === 'development') {
      errorResponse.details = error.message;
      errorResponse.stack = error.stack;
    }

    res.status(500).json(errorResponse);
  }
};

/**
 * Get product by slug
 * GET /api/products/:slug
 */
exports.getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const cacheKey = `products:detail:${slug}`;
    const cachedProduct = await getCache(cacheKey);

    if (cachedProduct) {
      return res.json(cachedProduct);
    }

    const product = await prisma.product.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        longDescription: true,
        basePrice: true,
        salePrice: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        brand: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
          select: {
            id: true,
            sku: true,
            color: true,
            colorHex: true,
            size: true,
            priceAdjustment: true,
            stockQuantity: true,
            imageUrl: true,
          },
          orderBy: [{ size: 'asc' }, { color: 'asc' }],
        },
        reviews: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            rating: true,
            title: true,
            comment: true,
            isVerifiedPurchase: true,
            createdAt: true,
          },
        },
        collectionProducts: {
          select: {
            collection: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const avgRating = await prisma.productReview.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    const formattedProduct = {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      longDescription: product.longDescription,
      basePrice: toNumber(product.basePrice, 0),
      price: {
        base: toNumber(product.basePrice, 0) / 100, // 转换为美元
        sale: toNumber(product.salePrice, toNumber(product.basePrice, 0)) / 100,
        currency: 'CAD',
        onSale: (() => {
          const sale = toNumber(product.salePrice, 0);
          const base = toNumber(product.basePrice, 0);
          return sale > 0 && sale !== base;
        })(),
      },
      category: product.category,
      brand: product.brand,
      images: (product.images || []).map((image) => ({
        id: image.id,
        url: image.url ? (optimizeImageUrl(image.url, { width: 1280, quality: 85, req }) || image.url) : null,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      })),
      variants: (product.variants || []).map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        colorHex: variant.colorHex,
        size: variant.size,
        stockQuantity: variant.stockQuantity,
        priceAdjustment: toNumber(variant.priceAdjustment, 0),
        price: (toNumber(product.basePrice, 0) + toNumber(variant.priceAdjustment, 0)) / 100,
        imageUrl: variant.imageUrl ? (optimizeImageUrl(variant.imageUrl, { width: 640, quality: 80, req }) || variant.imageUrl) : null,
      })),
      rating: {
        average: Number(avgRating._avg.rating || 0),
        count: Number(avgRating._count.rating || 0),
      },
      reviews: product.reviews,
      collections: (product.collectionProducts || []).map((item) => item.collection),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    formattedProduct.primaryImage = formattedProduct.images.length
      ? formattedProduct.images[0]
      : null;

    await setCache(cacheKey, formattedProduct, PRODUCT_DETAIL_CACHE_TTL);

    res.json(formattedProduct);
  } catch (error) {
    logger.error('Failed to fetch product by slug', { 
      error: error.message, 
      stack: error.stack,
      slug: req.params.slug,
    });
    res.status(500).json({ 
      error: 'Failed to fetch product',
      ...(process.env.NODE_ENV === 'development' && { details: error.message }),
    });
  }
};

/**
 * Get related products by category
 * GET /api/products/:slug/related?limit=4
 * [2025-11-12 03:00:00] Added for product detail page recommendations
 */
exports.getRelatedProducts = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 4;

    const currentProduct = await prisma.product.findUnique({
      where: { slug },
      select: { id: true, categoryId: true, brandId: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const cacheKey = `products:related:${slug}:${limit}`;
    const cachedRelated = await getCache(cacheKey);

    if (cachedRelated) {
      return res.json({ data: cachedRelated });
    }

    const candidateProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      select: { id: true },
      take: limit * 2,
    });
    
    const productIds = candidateProducts.map((p) => p.id);
    
    const ratingStats = await prisma.productReview.groupBy({
      by: ['productId'],
      where: {
        productId: { in: productIds },
      },
      _avg: { rating: true },
      _count: true,
    });
    
    const ratingMap = new Map();
    ratingStats.forEach((stat) => {
      ratingMap.set(stat.productId, {
        avgRating: Number(stat._avg.rating || 0),
        reviewCount: Number(stat._count || 0),
      });
    });
    
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      take: limit * 2,
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        salePrice: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        images: {
          select: {
            url: true,
            alt: true,
            sortOrder: true,
          },
          orderBy: { sortOrder: 'asc' },
          take: 1,
        },
        variants: {
          select: {
            id: true,
            stockQuantity: true,
          },
          orderBy: { stockQuantity: 'desc' },
          take: 1,
        },
      },
    });
    
    const productsWithScore = relatedProducts.map((product) => {
      const rating = ratingMap.get(product.id) || { avgRating: 0, reviewCount: 0 };
      const stockQuantity = product.variants?.[0]?.stockQuantity || 0;
      
      const ratingScore = (rating.avgRating / 5) * 0.4;
      const reviewScore = Math.min(Math.log10(rating.reviewCount + 1) / 10, 1) * 0.2;
      const stockScore = (stockQuantity > 0 ? 1 : 0) * 0.2;
      const randomScore = Math.random() * 0.2;
      
      const recommendationScore = ratingScore + reviewScore + stockScore + randomScore;
      
      return {
        ...product,
        recommendationScore,
        rating: {
          average: rating.avgRating,
          count: rating.reviewCount,
        },
      };
    });
    
    const topProducts = productsWithScore
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    const formattedRelated = topProducts.map((product) => {
      const images = (product.images || []).map((image) => ({
        url: optimizeImageUrl(image.url, { width: 480, quality: 80, req }) || image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      }));

      const primaryImage = images.length ? images[0] : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        basePrice: toNumber(product.basePrice, 0),
        price: {
          base: toNumber(product.basePrice, 0) / 100,
          sale: toNumber(product.salePrice, product.basePrice) / 100,
          currency: 'CAD',
        },
        category: product.category,
        images,
        primaryImage,
        thumbnail: primaryImage,
        stockStatus: product.variants?.[0]?.stockQuantity > 0 ? 'in_stock' : 'out_of_stock',
        rating: product.rating,
      };
    });

    await setCache(cacheKey, formattedRelated, PRODUCT_LIST_CACHE_TTL);

    res.json({ data: formattedRelated });
  } catch (error) {
    logger.error('Failed to fetch related products', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch related products' });
  }
};

/**
 * [2025-11-20 12:45:00] Provide product base images via variantId for Design Lab
 * GET /api/products/variant/:variantId
 */
// [2025-01-27 23:00:00] 添加详细日志用于调试
exports.getProductByVariantId = async (req, res) => {
  const timestamp = new Date().toISOString();
  const { variantId } = req.params;

  console.log('[Backend] ===== getProductByVariantId START =====', {
    variantId,
    timestamp,
    url: req.url,
    method: req.method
  });

  if (!variantId) {
    console.warn('[Backend] Missing variantId', { timestamp });
    return res.status(400).json({ error: 'variantId is required' });
  }

  try {
    console.log('[Backend] Querying database for variant:', { variantId, timestamp });
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: {
            images: {
              orderBy: { sortOrder: 'asc' },
            },
            variants: true,
          },
        },
      },
    });

    if (!variant || !variant.product) {
      console.warn('[Backend] Variant not found in database:', {
        variantId,
        variantExists: !!variant,
        productExists: variant ? !!variant.product : false,
        timestamp
      });
      return res.status(404).json({ error: 'Variant not found' });
    }

    console.log('[Backend] Variant found:', {
      variantId: variant.id,
      productId: variant.product.id,
      productName: variant.product.name,
      timestamp
    });

    const product = variant.product;
    const optimizedImages = (product.images || [])
      .map((img) => (img?.url ? optimizeImageUrl(img.url, req) : null))
      .filter(Boolean);

    const fallbackImage =
      variant.imageUrl ||
      optimizedImages[0] ||
      '/assets/hero/hero-card-tee.jpg';

    const baseImages = {
      front: fallbackImage,
      back: optimizedImages[1] || fallbackImage,
      sleeve: optimizedImages[2] || fallbackImage,
    };

    const colors = Array.from(
      new Set(
        (product.variants || [])
          .map((v) => v.color)
          .filter((color) => color && color.trim() !== '')
      )
    );

    const response = {
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      color: variant.color || null,
      colors,
      baseImages,
      gallery: optimizedImages,
    };

    console.log('[Backend] Sending response:', {
      productId: response.productId,
      productName: response.productName,
      variantId: response.variantId,
      colorsCount: response.colors.length,
      galleryCount: response.gallery.length,
      timestamp
    });

    console.log('[Backend] ===== getProductByVariantId SUCCESS =====', { timestamp });
    res.json(response);
  } catch (error) {
    console.error('[Backend] ===== getProductByVariantId ERROR =====', {
      error: error.message,
      stack: error.stack,
      variantId,
      timestamp
    });
    logger.error('Failed to fetch product by variantId', {
      error: error.message,
      variantId,
    });
    res.status(500).json({ error: 'Failed to fetch product by variantId' });
  }
};
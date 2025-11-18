/**
 * Product Controller
 * [2025-01-27 00:00:00]
 * [2025-01-27 13:55:00] Enhanced with out-of-stock filtering
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');
const { optimizeImageUrl } = require('../utils/imageHelper');

const PRODUCT_LIST_CACHE_TTL = 300; // 5 minutes
const PRODUCT_DETAIL_CACHE_TTL = 600; // 10 minutes

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
    const allowedSortFields = ['createdAt', 'name', 'basePrice', 'salePrice'];
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

    if (andConditions.length) {
      where.AND = andConditions;
    }

    const cacheKey = `products:list:${page}:${limit}:${collectionSlug || 'all'}:${search || 'all'}:${sortBy}:${sortOrder}:${includeOutOfStock}`;
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
              stockQuantity: true,
            },
            orderBy: { stockQuantity: 'desc' },
            take: 1,
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const normalizedProducts = products.map((product) => {
      const basePrice = Number(product.basePrice || 0);
      const salePrice = Number(product.salePrice || product.basePrice || 0);
      const topVariant = product.variants?.[0];
      const variantStock = Number(topVariant?.stockQuantity || 0);
      const fallbackProductStock = Number(product.stockQuantity || 0);
      const stockQuantity = topVariant ? variantStock : fallbackProductStock; // [2025-11-16 14:12:00] 支持无变体商品读取产品级库存

      // [2025-01-27 15:02:55] Normalize image payloads with optimized CDN parameters
      // [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL，以便Next.js Image组件访问
      const images = (product.images || []).map((image) => ({
        url: optimizeImageUrl(image.url, { width: 640, quality: 80, req }) || image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      }));

      const primaryImage = images.length ? images[0] : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: {
          base: basePrice,
          sale: salePrice,
          currency: 'CAD',
          onSale: salePrice > 0 && salePrice !== basePrice,
        },
        category: product.category
          ? {
              id: product.category.id,
              name: product.category.name,
              slug: product.category.slug,
            }
          : null,
        brand: product.brand
          ? {
              id: product.brand.id,
              name: product.brand.name,
              slug: product.brand.slug,
            }
          : null,
        images,
        primaryImage,
        thumbnail: primaryImage,
        stockStatus: stockQuantity > 10 ? 'in_stock' : stockQuantity > 0 ? 'low_stock' : 'out_of_stock',
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      };
    });

    const responsePayload = {
      data: normalizedProducts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    await setCache(cacheKey, responsePayload, PRODUCT_LIST_CACHE_TTL);

    res.json(responsePayload);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
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
      price: {
        base: Number(product.basePrice || 0),
        sale: Number(product.salePrice || product.basePrice || 0),
        currency: 'CAD',
        onSale:
          Number(product.salePrice || 0) > 0 && Number(product.salePrice || 0) !== Number(product.basePrice || 0),
      },
      category: product.category,
      brand: product.brand,
      images: product.images.map((image) => ({
        id: image.id,
        // [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
        url: optimizeImageUrl(image.url, { width: 1280, quality: 85, req }) || image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      })),
      variants: product.variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color,
        size: variant.size,
        stockQuantity: variant.stockQuantity,
        price: Number(product.basePrice || 0) + Number(variant.priceAdjustment || 0),
        // [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
        imageUrl: optimizeImageUrl(variant.imageUrl, { width: 640, quality: 80, req }) || variant.imageUrl,
      })),
      rating: {
        average: Number(avgRating._avg.rating || 0),
        count: Number(avgRating._count.rating || 0),
      },
      reviews: product.reviews,
      collections: product.collectionProducts.map((item) => item.collection),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    };

    formattedProduct.primaryImage = formattedProduct.images.length
      ? formattedProduct.images[0]
      : null; // [2025-01-27 15:02:55] Surface primary image for frontend consumption

    await setCache(cacheKey, formattedProduct, PRODUCT_DETAIL_CACHE_TTL);

    res.json(formattedProduct);
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
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

    // [2025-01-27 21:50:00] 改进推荐算法：考虑评分、销量、相关性
    // 获取产品评分统计（先获取产品列表，再查询评分）
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
    
    // 获取同类别产品（优先高评分和高销量）
    const relatedProducts = await prisma.product.findMany({
      where: {
        isActive: true,
        categoryId: currentProduct.categoryId,
        id: { not: currentProduct.id },
      },
      take: limit * 2, // 获取更多候选产品，然后排序筛选
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
    
    // [2025-01-27 21:50:00] 计算推荐分数并排序
    const productsWithScore = relatedProducts.map((product) => {
      const rating = ratingMap.get(product.id) || { avgRating: 0, reviewCount: 0 };
      const stockQuantity = product.variants?.[0]?.stockQuantity || 0;
      
      // 推荐分数计算：
      // - 评分权重：40% (avgRating / 5 * 0.4)
      // - 评价数量权重：20% (log(reviewCount + 1) / 10 * 0.2)
      // - 库存权重：20% (有库存优先)
      // - 随机性：20% (保持多样性)
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
    
    // 按推荐分数排序并取前 limit 个
    const topProducts = productsWithScore
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);

    const formattedRelated = topProducts.map((product) => {
      const images = (product.images || []).map((image) => ({
        // [2025-01-27 16:15:00] 将相对路径转换为完整的后端服务器URL
        url: optimizeImageUrl(image.url, { width: 480, quality: 80, req }) || image.url,
        alt: image.alt || product.name,
        sortOrder: image.sortOrder,
      }));

      // [2025-01-27 15:02:55] Provide lightweight image data for related product carousel
      const primaryImage = images.length ? images[0] : null;

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: {
          base: Number(product.basePrice || 0),
          sale: Number(product.salePrice || product.basePrice || 0),
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
    console.error('[2025-11-12 03:00:00] Error fetching related products:', error);
    res.status(500).json({ error: 'Failed to fetch related products' });
  }
};
/**
 * Product Controller
 * [2025-01-27 00:00:00]
 */
const prisma = require('../lib/prisma');

/**
 * Get products list with pagination, filtering, and sorting
 * GET /api/products?page=1&limit=20&collection=&search=&sort=
 */
exports.getProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const collectionSlug = req.query.collection;
    const search = req.query.search;
    const sortBy = req.query.sort || 'createdAt';
    const sortOrder = req.query.order === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where = {
      isActive: true,
    };

    // Filter by collection
    if (collectionSlug) {
      where.collectionProducts = {
        some: {
          collection: {
            slug: collectionSlug,
            isActive: true,
          },
        },
      };
    }

    // Search by name, description, or SKU
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Execute query
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
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
            orderBy: { sortOrder: 'asc' },
            take: 1,
          },
          variants: {
            take: 1,
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

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        brand: true,
        images: {
          orderBy: { sortOrder: 'asc' },
        },
        variants: {
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
            // Don't include userId in response for privacy
          },
        },
        collectionProducts: {
          include: {
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

    // Calculate average rating
    const avgRating = await prisma.productReview.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    res.json({
      ...product,
      rating: {
        average: avgRating._avg.rating || 0,
        count: avgRating._count.rating || 0,
      },
    });
  } catch (error) {
    console.error('Error fetching product:', error);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
};

/**
 * Collection Controller
 */
const prisma = require('../lib/prisma');

/**
 * Get collections list
 * GET /api/collections
 */
exports.getCollections = async (req, res) => {
  try {
    const collections = await prisma.collection.findMany({
      where: {
        isActive: true,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    res.json(collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      imageUrl: collection.imageUrl,
      productCount: collection._count.products,
    })));
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ error: 'Failed to fetch collections' });
  }
};

/**
 * Get collection by slug with products
 * GET /api/collections/:slug
 */
exports.getCollectionBySlug = async (req, res) => {
  try {
    const { slug } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const collection = await prisma.collection.findUnique({
      where: { slug },
      include: {
        products: {
          skip,
          take: limit,
          include: {
            product: {
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
            },
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!collection) {
      return res.status(404).json({ error: 'Collection not found' });
    }

    const products = collection.products.map((cp) => cp.product);

    res.json({
      id: collection.id,
      name: collection.name,
      slug: collection.slug,
      description: collection.description,
      imageUrl: collection.imageUrl,
      products,
      pagination: {
        page,
        limit,
        total: collection._count.products,
        totalPages: Math.ceil(collection._count.products / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    res.status(500).json({ error: 'Failed to fetch collection' });
  }
};

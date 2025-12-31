/**
 * Brand Controller
* 品牌相关控制器
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { optimizeImageUrl } = require('../utils/imageHelper');

/**
 * Get products by brand ID
 * GET /api/brands/:id/products?excludeProductId={currentId}&limit=12
* 获取指定品牌的其它商品列表，排除当前商品
 */
exports.getBrandProducts = async (req, res) => {
  try {
    const brandId = req.params.id;
    const excludeProductId = req.query.excludeProductId;
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 12, 1), 50);

// 验证品牌是否存在
    const brand = await prisma.brand.findUnique({
      where: { id: brandId },
      select: { id: true, name: true, slug: true },
    });

    if (!brand) {
      return res.status(404).json({
        error: 'Brand not found',
        message: `Brand with ID ${brandId} does not exist`,
      });
    }

// 构建查询条件
    const where = {
      brandId: brandId,
      isActive: true,
    };

// 排除当前商品
    if (excludeProductId) {
      where.id = {
        not: excludeProductId,
      };
    }

// 查询商品，按创建时间降序，然后按销量降序
    const products = await prisma.product.findMany({
      where,
      take: limit,
      orderBy: [
        { createdAt: 'desc' },
        // 注意：如果后续有销量字段，可以添加 { sales: 'desc' }
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        basePrice: true,
        images: {
          where: { sortOrder: 0 },
          take: 1,
          select: {
            url: true,
            alt: true,
          },
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

// 格式化返回数据
    const items = products.map((product) => {
      const coverImage = product.images[0];
      return {
        id: product.id,
        title: product.name,
        slug: product.slug,
        price: Number(product.basePrice) / 100, // 转换为元
        coverImageUrl: coverImage
          ? optimizeImageUrl(coverImage.url, { req, width: 600, quality: 80 })
          : null,
      };
    });

    res.json({
      items,
      brand: {
        id: brand.id,
        name: brand.name,
        slug: brand.slug,
      },
    });
  } catch (error) {
    logger.error('[BrandController] Error fetching brand products:', {
      error: error.message,
      stack: error.stack,
      brandId: req.params.id,
      excludeProductId: req.query.excludeProductId,
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch brand products',
    });
  }
};

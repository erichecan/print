/**
 * Product Review Controller
* 产品评价管理
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { getCache, setCache } = require('../config/redis');

const PRODUCT_REVIEW_CACHE_TTL = 600; // 10 minutes

// GET /api/products/:id/reviews - 获取产品评价列表
exports.getProductReviews = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { page = 1, limit = 10, rating, sort = 'newest' } = req.query;
    
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);
    
    const where = {
      productId,
    };
    
    if (rating) {
      where.rating = parseInt(rating, 10);
    }
    
    const orderBy = sort === 'helpful'
      ? { helpfulCount: 'desc' }
      : sort === 'oldest'
      ? { createdAt: 'asc' }
      : { createdAt: 'desc' };
    
    const cacheKey = `product:${productId}:reviews:${page}:${limit}:${rating || 'all'}:${sort}`;
    const cached = await getCache(cacheKey);
    
    if (cached) {
      return res.json(cached);
    }
    
// Removed user include due to missing relation; frontend handles anonymous data
    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        take,
        skip,
        orderBy,
      }),
      prisma.productReview.count({ where }),
    ]);
    
    // 计算平均评分和评分分布
    const ratingStats = await prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId },
      _count: true,
    });
    
    const ratingDistribution = {
      5: 0,
      4: 0,
      3: 0,
      2: 0,
      1: 0,
    };
    
    ratingStats.forEach((stat) => {
      ratingDistribution[stat.rating] = stat._count;
    });
    
    const avgRating = await prisma.productReview.aggregate({
      where: { productId },
      _avg: { rating: true },
      _count: true,
    });
    
    const response = {
      data: reviews,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
      stats: {
        average: Number(avgRating._avg.rating || 0),
        count: Number(avgRating._count || 0),
        distribution: ratingDistribution,
      },
    };
    
    await setCache(cacheKey, response, PRODUCT_REVIEW_CACHE_TTL);
    res.json(response);
  } catch (error) {
    logger.error('Error fetching product reviews:', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// POST /api/products/:id/reviews - 提交产品评价
exports.createProductReview = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { rating, title, comment, orderId } = req.body;
    const userId = req.user?.id || null;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }
    
    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Review title is required' });
    }
    
    if (!comment || comment.trim().length === 0) {
      return res.status(400).json({ error: 'Review comment is required' });
    }
    
    // 验证产品存在
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // 如果已登录，检查是否已经评价过
    if (userId) {
      const existingReview = await prisma.productReview.findFirst({
        where: {
          productId,
          userId,
        },
      });
      
      if (existingReview) {
        return res.status(400).json({ error: 'You have already reviewed this product' });
      }
    }
    
    // 如果提供了订单 ID，验证订单并标记为已验证购买
    let isVerifiedPurchase = false;
    if (orderId && userId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          userId,
          items: {
            some: {
              variant: {
                productId,
              },
            },
          },
        },
      });
      
      if (order) {
        isVerifiedPurchase = true;
      }
    }
    
// Create review without eager-loading user relation
    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        orderId: orderId || null,
        rating: parseInt(rating, 10),
        title: title.trim(),
        comment: comment.trim(),
        isVerifiedPurchase,
      },
    });
    
    // 清除缓存
    const cachePattern = `product:${productId}:reviews:*`;
    // 这里需要使用 Redis 的 keys 命令或使用更精细的缓存策略
    
    res.status(201).json({ data: review });
  } catch (error) {
    logger.error('Error creating product review:', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// POST /api/reviews/:id/helpful - 标记评价为有用
exports.markReviewHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.productReview.update({
      where: { id },
      data: { helpfulCount: { increment: 1 } },
    });
    
    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    logger.error('Error marking review helpful:', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
};


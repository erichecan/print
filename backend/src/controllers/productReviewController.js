/**
 * Product Review Controller
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { uploadBufferToGcs, buildObjectPath } = require('../utils/gcsStorage');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only jpg, png, webp images are allowed'));
  },
});

exports.uploadMiddleware = upload.array('images', 5);

// POST /api/reviews/images/upload
exports.uploadReviewImages = async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No images provided' });
    }

    const urls = await Promise.all(
      files.map(async (file) => {
        const ext = path.extname(file.originalname) || '.jpg';
        const filename = `${uuidv4()}${ext}`;
        const objectPath = buildObjectPath('reviews', ['temp', filename]);
        const url = await uploadBufferToGcs(file.buffer, objectPath, { contentType: file.mimetype });
        return url;
      })
    );

    res.json({ urls });
  } catch (error) {
    logger.error('[uploadReviewImages]', error);
    res.status(500).json({ error: 'Failed to upload images' });
  }
};

// GET /api/products/:id/reviews
exports.getProductReviews = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { page = 1, limit = 10, rating, sort = 'newest' } = req.query;

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const settings = await prisma.productReviewSettings.findUnique({ where: { productId } });
    if (settings && !settings.reviewsEnabled) {
      return res.json({
        data: [],
        pagination: { page: 1, limit: take, total: 0, totalPages: 0 },
        stats: { average: 0, count: 0, distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 } },
        reviewsEnabled: false,
      });
    }

    const where = { productId, status: 'APPROVED' };
    if (rating) where.rating = parseInt(rating, 10);

    const orderBy =
      sort === 'helpful' ? { helpfulCount: 'desc' }
      : sort === 'oldest' ? { createdAt: 'asc' }
      : { createdAt: 'desc' };

    const maxDisplay = settings?.maxDisplayCount > 0 ? settings.maxDisplayCount : null;

    const effectiveTake = maxDisplay ? Math.min(take, Math.max(0, maxDisplay - skip)) : take;

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        take: effectiveTake > 0 ? effectiveTake : 0,
        skip,
        orderBy,
      }),
      prisma.productReview.count({ where }),
    ]);

    const effectiveTotal = maxDisplay ? Math.min(total, maxDisplay) : total;

    const ratingStats = await prisma.productReview.groupBy({
      by: ['rating'],
      where: { productId, status: 'APPROVED' },
      _count: true,
    });

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingStats.forEach((s) => { distribution[s.rating] = s._count; });

    const agg = await prisma.productReview.aggregate({
      where: { productId, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    });

    res.json({
      data: reviews,
      pagination: {
        page: parseInt(page, 10),
        limit: take,
        total: effectiveTotal,
        totalPages: Math.ceil(effectiveTotal / take),
      },
      stats: {
        average: Number((agg._avg.rating || 0).toFixed(1)),
        count: Number(agg._count),
        distribution,
      },
      reviewsEnabled: true,
    });
  } catch (error) {
    logger.error('[getProductReviews]', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// GET /api/products/:id/review-summary
exports.getProductReviewSummary = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const settings = await prisma.productReviewSettings.findUnique({ where: { productId } });
    if (settings && !settings.reviewsEnabled) {
      return res.json({
        average: 0,
        count: 0,
        distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
        reviewsEnabled: false,
      });
    }

    const [agg, ratingStats] = await Promise.all([
      prisma.productReview.aggregate({
        where: { productId, status: 'APPROVED' },
        _avg: { rating: true },
        _count: true,
      }),
      prisma.productReview.groupBy({
        by: ['rating'],
        where: { productId, status: 'APPROVED' },
        _count: true,
      }),
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingStats.forEach((s) => { distribution[s.rating] = s._count; });

    res.json({
      average: Number((agg._avg.rating || 0).toFixed(1)),
      count: Number(agg._count),
      distribution,
      reviewsEnabled: true,
    });
  } catch (error) {
    logger.error('[getProductReviewSummary]', error);
    res.status(500).json({ error: 'Failed to fetch review summary' });
  }
};

// POST /api/products/:id/reviews
exports.createProductReview = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { rating, title, comment, images = [] } = req.body;
    const userId = req.user?.id;
    const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'admin';

    if (!userId) return res.status(401).json({ error: 'Login required' });
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    if (!title || title.trim().length === 0)
      return res.status(400).json({ error: 'Review title is required' });
    if (!comment || comment.trim().length === 0)
      return res.status(400).json({ error: 'Review comment is required' });
    if (title.trim().length > 100)
      return res.status(400).json({ error: 'Title must be 100 characters or less' });
    if (comment.trim().length > 1000)
      return res.status(400).json({ error: 'Comment must be 1000 characters or less' });

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const settings = await prisma.productReviewSettings.findUnique({ where: { productId } });
    if (settings && !settings.reviewsEnabled) {
      return res.status(403).json({ error: 'Reviews are disabled for this product' });
    }

    const existing = await prisma.productReview.findFirst({ where: { productId, userId } });
    if (existing) return res.status(400).json({ error: 'You have already reviewed this product' });

    let isVerifiedPurchase = false;
    if (!isAdmin) {
      const purchasedOrder = await prisma.order.findFirst({
        where: {
          userId,
          status: { in: ['DELIVERED', 'SHIPPED', 'COMPLETED'] },
          items: { some: { variant: { productId } } },
        },
      });
      if (!purchasedOrder) {
        return res.status(403).json({ error: 'You must purchase this product before reviewing it' });
      }
      isVerifiedPurchase = true;
    }

    const review = await prisma.productReview.create({
      data: {
        productId,
        userId,
        rating: parseInt(rating, 10),
        title: title.trim(),
        comment: comment.trim(),
        images: Array.isArray(images) ? images.slice(0, 5) : [],
        isVerifiedPurchase,
        status: 'PENDING',
      },
    });

    res.status(201).json({ data: review });
  } catch (error) {
    logger.error('[createProductReview]', error);
    res.status(500).json({ error: 'Failed to create review' });
  }
};

// GET /api/reviews/mine
exports.getMyReviews = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Login required' });

    const reviews = await prisma.productReview.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { product: { select: { id: true, name: true, slug: true } } },
    });

    res.json({ data: reviews });
  } catch (error) {
    logger.error('[getMyReviews]', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// POST /api/reviews/:id/helpful
exports.markReviewHelpful = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productReview.update({ where: { id }, data: { helpfulCount: { increment: 1 } } });
    res.json({ message: 'Review marked as helpful' });
  } catch (error) {
    logger.error('[markReviewHelpful]', error);
    res.status(500).json({ error: 'Failed to mark review as helpful' });
  }
};

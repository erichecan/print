/**
 * Admin Review Controller
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// GET /api/admin/reviews
exports.listReviews = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, productName, sort = 'newest' } = req.query;
    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const take = parseInt(limit, 10);

    const where = {};
    if (status && status !== 'ALL') where.status = status;
    if (productName) {
      where.product = { name: { contains: productName, mode: 'insensitive' } };
    }

    const orderBy = sort === 'oldest' ? { createdAt: 'asc' } : { createdAt: 'desc' };

    const [reviews, total] = await Promise.all([
      prisma.productReview.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          product: { select: { id: true, name: true, slug: true } },
        },
      }),
      prisma.productReview.count({ where }),
    ]);

    res.json({
      data: reviews,
      pagination: { page: parseInt(page, 10), limit: take, total, totalPages: Math.ceil(total / take) },
    });
  } catch (error) {
    logger.error('[admin listReviews]', error);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
};

// PATCH /api/admin/reviews/:id/status
exports.updateReviewStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body; // approve | reject | hide | restore

    const statusMap = {
      approve: 'APPROVED',
      reject: 'REJECTED',
      hide: 'HIDDEN',
      restore: 'APPROVED',
    };

    const newStatus = statusMap[action];
    if (!newStatus) return res.status(400).json({ error: 'Invalid action. Use approve, reject, hide, or restore' });

    const review = await prisma.productReview.update({
      where: { id },
      data: { status: newStatus },
    });

    res.json({ data: review });
  } catch (error) {
    logger.error('[admin updateReviewStatus]', error);
    res.status(500).json({ error: 'Failed to update review status' });
  }
};

// POST /api/admin/reviews/:id/reply
exports.replyToReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { reply } = req.body;

    if (!reply || reply.trim().length === 0) {
      return res.status(400).json({ error: 'Reply content is required' });
    }

    const review = await prisma.productReview.update({
      where: { id },
      data: { adminReply: reply.trim(), adminRepliedAt: new Date() },
    });

    res.json({ data: review });
  } catch (error) {
    logger.error('[admin replyToReview]', error);
    res.status(500).json({ error: 'Failed to save reply' });
  }
};

// DELETE /api/admin/reviews/:id
exports.deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.productReview.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    logger.error('[admin deleteReview]', error);
    res.status(500).json({ error: 'Failed to delete review' });
  }
};

// GET /api/admin/products/:id/review-settings
exports.getReviewSettings = async (req, res) => {
  try {
    const { id: productId } = req.params;

    const settings = await prisma.productReviewSettings.findUnique({ where: { productId } });

    res.json({
      data: settings || { productId, reviewsEnabled: true, maxDisplayCount: 10 },
    });
  } catch (error) {
    logger.error('[admin getReviewSettings]', error);
    res.status(500).json({ error: 'Failed to fetch review settings' });
  }
};

// PUT /api/admin/products/:id/review-settings
exports.updateReviewSettings = async (req, res) => {
  try {
    const { id: productId } = req.params;
    const { reviewsEnabled, maxDisplayCount } = req.body;

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    const settings = await prisma.productReviewSettings.upsert({
      where: { productId },
      update: {
        ...(reviewsEnabled !== undefined && { reviewsEnabled: Boolean(reviewsEnabled) }),
        ...(maxDisplayCount !== undefined && { maxDisplayCount: Math.max(0, parseInt(maxDisplayCount, 10)) }),
      },
      create: {
        productId,
        reviewsEnabled: reviewsEnabled !== undefined ? Boolean(reviewsEnabled) : true,
        maxDisplayCount: maxDisplayCount !== undefined ? Math.max(0, parseInt(maxDisplayCount, 10)) : 10,
      },
    });

    res.json({ data: settings });
  } catch (error) {
    logger.error('[admin updateReviewSettings]', error);
    res.status(500).json({ error: 'Failed to update review settings' });
  }
};

const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/productReviewController');
const { authenticate, authenticateOptional } = require('../middleware/auth');

// POST /api/reviews/images/upload - 上传评论图片（需登录）
router.post(
  '/images/upload',
  authenticate,
  reviewController.uploadMiddleware,
  reviewController.uploadReviewImages
);

// GET /api/reviews/mine - 我的评论（需登录）
router.get('/mine', authenticate, reviewController.getMyReviews);

// POST /api/reviews/:id/helpful - 标记有用（可选认证）
router.post('/:id/helpful', authenticateOptional, reviewController.markReviewHelpful);

module.exports = router;

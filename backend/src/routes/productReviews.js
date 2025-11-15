// [2025-01-27 21:45:00] Product Review routes
const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/productReviewController');
const { authenticateOptional } = require('../middleware/auth');

// POST /api/reviews/:id/helpful - 标记评价为有用（可选认证）
router.post('/:id/helpful', authenticateOptional, reviewController.markReviewHelpful);

module.exports = router;


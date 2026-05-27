const express = require('express');
const router = express.Router();
const adminReviewController = require('../controllers/adminReviewController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// GET /api/admin/reviews
router.get('/', adminReviewController.listReviews);

// PATCH /api/admin/reviews/:id/status
router.patch('/:id/status', adminReviewController.updateReviewStatus);

// POST /api/admin/reviews/:id/reply
router.post('/:id/reply', adminReviewController.replyToReview);

// DELETE /api/admin/reviews/:id
router.delete('/:id', adminReviewController.deleteReview);

module.exports = router;

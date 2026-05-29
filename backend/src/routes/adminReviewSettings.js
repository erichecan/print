const express = require('express');
const router = express.Router();
const adminReviewController = require('../controllers/adminReviewController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// GET /api/admin/products/:id/review-settings
router.get('/:id/review-settings', adminReviewController.getReviewSettings);

// PUT /api/admin/products/:id/review-settings
router.put('/:id/review-settings', adminReviewController.updateReviewSettings);

module.exports = router;

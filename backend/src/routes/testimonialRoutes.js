const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
// Note: Authentication middleware should be added here for admin routes (POST, PUT, DELETE)
// For now, assuming basic structure. Ideally, verifyAdmin middleware.

// Public routes
router.get('/active', testimonialController.getActiveTestimonials);

// Admin routes (should be protected)
router.get('/', testimonialController.getAllTestimonials);
router.post('/', testimonialController.createTestimonial);
router.put('/:id', testimonialController.updateTestimonial);
router.delete('/:id', testimonialController.deleteTestimonial);

module.exports = router;

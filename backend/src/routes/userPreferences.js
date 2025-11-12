/**
 * User Preferences Routes
 * [2025-01-27 14:45:00] User notification preferences and account settings routes
 */
const express = require('express');
const router = express.Router();
const {
  getPreferences,
  updatePreferences,
} = require('../controllers/userPreferenceController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// GET /api/user/preferences - Get user preferences
router.get('/', getPreferences);

// PUT /api/user/preferences - Update user preferences
router.put('/', updatePreferences);

module.exports = router;


/**
 * Authentication Routes
 * [2025-11-05 01:00:00]
 */
const express = require('express');
const router = express.Router();
const {
  register,
  login,
  logout,
  me,
  forgotPassword,
  resetPassword,
  updateProfile,
  updatePassword,
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

// POST /api/auth/register - Register new user (public)
router.post('/register', register);

// POST /api/auth/login - Login user (public)
router.post('/login', login);

// POST /api/auth/logout - Logout user (optional auth)
router.post('/logout', logout);

// GET /api/auth/me - Get current user (auth required)
router.get('/me', authenticate, me);

// POST /api/auth/forgot-password - Request password reset (public)
router.post('/forgot-password', forgotPassword);

// POST /api/auth/reset-password - Reset password (public)
router.post('/reset-password', resetPassword);

// PUT /api/auth/me - Update user profile (auth required)
router.put('/me', authenticate, updateProfile);

// PUT /api/auth/me/password - Update password (auth required)
router.put('/me/password', authenticate, updatePassword);

module.exports = router;

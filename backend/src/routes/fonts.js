/**
 * Font Routes (Public API)
 * [2025-01-30 19:00:00] Public routes for fetching fonts
 */
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/fontController');

// [2025-01-30 19:00:00] 获取所有字体（按分类分组）
router.get('/', fontController.getFonts);

// [2025-01-30 19:00:00] 按分类获取字体
router.get('/category/:category', fontController.getFontsByCategory);

module.exports = router;


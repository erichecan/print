/**
 * Font Routes (Public API)
* Public routes for fetching fonts
 */
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/fontController');

// 获取所有字体（按分类分组）
router.get('/', fontController.getFonts);

// 按分类获取字体
router.get('/category/:category', fontController.getFontsByCategory);

module.exports = router;


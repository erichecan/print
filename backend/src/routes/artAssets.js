/**
 * Art Assets Routes (Public API)
 * [2025-01-28 00:50:00] Public routes for fetching art assets
 */
const express = require('express');
const router = express.Router();
const artAssetController = require('../controllers/artAssetController');

// [2025-01-28 00:50:00] 获取所有素材（按分类分组）
router.get('/', artAssetController.getArtAssets);

// [2025-01-28 00:50:00] 按分类获取素材
router.get('/category/:category', artAssetController.getArtAssetsByCategory);

module.exports = router;


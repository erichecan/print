/**
 * Art Assets Routes (Public API)
* Public routes for fetching art assets
 */
const express = require('express');
const router = express.Router();
const artAssetController = require('../controllers/artAssetController');

// 获取所有素材（按分类分组）
router.get('/', artAssetController.getArtAssets);

// 按分类获取素材
router.get('/category/:category', artAssetController.getArtAssetsByCategory);

module.exports = router;


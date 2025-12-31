/**
 * Artworks Routes (Public API)
* 新的艺术作品 API，支持分类树、分页、搜索
 */
const express = require('express');
const router = express.Router();
const artworksController = require('../controllers/artworksController');

// 获取艺术作品列表（支持分页、分类过滤、搜索）
router.get('/', artworksController.getArtworks);

// 获取分类树（包含计数）
router.get('/categories/tree', artworksController.getCategoriesTree);

// 获取单个艺术作品
router.get('/:id', artworksController.getArtwork);

module.exports = router;

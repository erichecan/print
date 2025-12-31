/**
 * Categories Routes (Public)
* 公共分类路由
* 添加树状分类路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryController');

// 获取所有活跃分类（用于首页）
router.get('/', controller.listCategories);

// 获取树状分类（含产品计数）
router.get('/tree', controller.getCategoryTree);

// 获取分组分类树（含精确计数）
router.get('/tree-with-counts', controller.getTreeWithCounts);

// 根据分类 slug 获取产品列表（必须在 /:slug 之前）
router.get('/:slug/products', controller.getProductsByCategorySlug);

// 根据 slug 获取分类详情（必须在最后，避免匹配其他路由）
router.get('/:slug', controller.getCategoryBySlug);

module.exports = router;


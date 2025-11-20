/**
 * Categories Routes (Public)
 * [2025-01-27 18:50:00] 公共分类路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/categoryController');

// [2025-01-27 18:50:00] 获取所有活跃分类（用于首页）
router.get('/', controller.listCategories);

// [2025-01-27 18:50:00] 根据 slug 获取分类详情
router.get('/:slug', controller.getCategoryBySlug);

module.exports = router;


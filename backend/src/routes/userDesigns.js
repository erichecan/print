/**
 * User Designs Routes
 * [2025-01-30 23:58:00] 用户设计列表路由
 */
const express = require('express');
const router = express.Router();
const { authenticate } = require('../middleware/auth');
const userDesignController = require('../controllers/userDesignController');

// GET /api/user/designs - 获取用户的设计列表
// [2025-01-30 23:58:00] 支持时间筛选参数 ?days=30
router.get('/', authenticate, userDesignController.listUserDesigns);

module.exports = router;


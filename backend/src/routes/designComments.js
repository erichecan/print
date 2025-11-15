// [2025-01-27 21:40:00] Design Comment routes
const express = require('express');
const router = express.Router();
const commentController = require('../controllers/designCommentController');
const { authenticateOptional } = require('../middleware/auth');

// GET /api/designs/:id/comments - 获取设计评论（公开）
router.get('/:id/comments', authenticateOptional, commentController.getComments);

// POST /api/designs/:id/comments - 提交评论（可选认证，匿名评论需要提供姓名和邮箱）
router.post('/:id/comments', authenticateOptional, commentController.createComment);

// POST /api/comments/:id/like - 点赞评论（可选认证）
router.post('/:id/like', authenticateOptional, commentController.likeComment);

module.exports = router;


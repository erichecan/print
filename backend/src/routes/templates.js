// Design Template routes
const express = require('express');
const router = express.Router();
const templateController = require('../controllers/designTemplateController');
const { authenticateOptional } = require('../middleware/auth');

// GET /api/templates - 获取模板列表（公开）
router.get('/', authenticateOptional, templateController.getTemplates);

// GET /api/templates/:id - 获取模板详情（公开）
router.get('/:id', authenticateOptional, templateController.getTemplate);

// POST /api/templates/:id/like - 点赞模板（可选认证）
router.post('/:id/like', authenticateOptional, templateController.likeTemplate);

module.exports = router;


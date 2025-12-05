/**
 * Admin Font Routes
 * [2025-01-30 19:00:00] Admin routes for managing fonts
 */
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/fontController');
const { requireAdmin } = require('../middleware/auth');

// [2025-01-30 19:00:00] 所有路由需要管理员权限
router.use(requireAdmin);

// [2025-01-30 19:00:00] 获取所有字体（管理员，包括未启用的）
router.get('/', fontController.getAllFonts);

// [2025-01-30 19:00:00] 获取单个字体
router.get('/:id', fontController.getFont);

// [2025-01-30 19:00:00] 创建字体
router.post('/', fontController.createFont);

// [2025-01-30 19:00:00] 更新字体
router.put('/:id', fontController.updateFont);

// [2025-01-30 19:00:00] 删除字体
router.delete('/:id', fontController.deleteFont);

module.exports = router;


/**
 * Admin Font Routes
* Admin routes for managing fonts
 */
const express = require('express');
const router = express.Router();
const fontController = require('../controllers/fontController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

// 获取所有字体（管理员，包括未启用的）
router.get('/', fontController.getAllFonts);

// 获取单个字体
router.get('/:id', fontController.getFont);

// 创建字体
router.post('/', fontController.createFont);

// 更新字体
router.put('/:id', fontController.updateFont);

// 删除字体
router.delete('/:id', fontController.deleteFont);

module.exports = router;


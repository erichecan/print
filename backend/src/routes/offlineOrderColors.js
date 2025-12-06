// [2025-12-06] PRD v2.0: 线下订单颜色管理路由
const express = require('express');
const router = express.Router();
const offlineOrderColorController = require('../controllers/offlineOrderColorController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

router.get('/', offlineOrderColorController.listColors);
router.post('/', offlineOrderColorController.createColor);
router.patch('/:id', offlineOrderColorController.updateColor);
router.delete('/:id', offlineOrderColorController.deleteColor);

module.exports = router;


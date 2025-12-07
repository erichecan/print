// [2025-12-06] PRD v2.0: 线下订单颜色管理路由
// [2025-12-07 06:10:00] 允许 SALES_MANAGER 和 ADMIN 访问
const express = require('express');
const router = express.Router();
const offlineOrderColorController = require('../controllers/offlineOrderColorController');
const { authorizeRoles } = require('../middleware/auth');

// 允许 SALES_MANAGER 和 ADMIN 访问
router.use(authorizeRoles('SALES_MANAGER', 'ADMIN'));

router.get('/', offlineOrderColorController.listColors);
router.post('/', offlineOrderColorController.createColor);
router.patch('/:id', offlineOrderColorController.updateColor);
router.delete('/:id', offlineOrderColorController.deleteColor);

module.exports = router;


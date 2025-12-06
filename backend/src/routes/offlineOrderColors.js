/**
 * Offline Order Colors Routes
 * [2025-12-06 17:55:00] PRD v2.0: 线下订单颜色管理路由
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/offlineOrderColorController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listColors);
router.post('/', controller.createColor);
router.patch('/:id', controller.updateColor);
router.delete('/:id', controller.deleteColor);

module.exports = router;


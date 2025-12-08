/**
 * Design Lab Analytics Routes
 * [2025-12-08] 处理Design Lab埋点事件和指标收集
 */
const express = require('express');
const router = express.Router();
const designLabAnalyticsController = require('../controllers/designLabAnalyticsController');
const { authenticateOptional } = require('../middleware/auth');
const logger = require('../utils/logger');

// [2025-12-08] 接收埋点事件（无需认证，但可选）
router.post('/events', authenticateOptional, designLabAnalyticsController.trackEvents);

// [2025-12-08] 提交上传体验评分（可选认证）
router.post('/upload-rating', authenticateOptional, designLabAnalyticsController.submitUploadRating);

// [2025-12-08] 获取指标数据（需要认证，管理员或数据分析）
router.get('/metrics', authenticateOptional, designLabAnalyticsController.getMetrics);

module.exports = router;


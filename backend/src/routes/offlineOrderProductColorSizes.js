/**
 * Offline Order Product Color Sizes Routes
 * [2025-12-06 17:55:00] PRD v2.0: 产品-颜色-尺码可用性配置路由
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const controller = require('../controllers/offlineOrderProductColorSizeController');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.getAvailabilityConfigs);
router.post('/', controller.createAvailabilityConfig);
router.post('/batch', controller.batchUpdateAvailabilityConfigs);
router.patch('/:id', controller.updateAvailabilityConfig);
router.delete('/:id', controller.deleteAvailabilityConfig);

module.exports = router;


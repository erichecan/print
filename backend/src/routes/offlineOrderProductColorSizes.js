// PRD v2.0: 线下订单产品-颜色-尺码可用性配置路由
const express = require('express');
const router = express.Router();
const offlineOrderProductColorSizeController = require('../controllers/offlineOrderProductColorSizeController');
const { requireAdmin } = require('../middleware/auth');

// 所有路由需要管理员权限
router.use(requireAdmin);

router.get('/', offlineOrderProductColorSizeController.getAvailabilityConfigs);
router.post('/', offlineOrderProductColorSizeController.createAvailabilityConfig);
router.post('/batch', offlineOrderProductColorSizeController.batchUpdateAvailabilityConfigs);
router.patch('/:id', offlineOrderProductColorSizeController.updateAvailabilityConfig);
router.delete('/:id', offlineOrderProductColorSizeController.deleteAvailabilityConfig);

module.exports = router;


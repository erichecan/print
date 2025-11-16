// [2025-11-15 15:30:00] Admin settings routes
const express = require('express');
const controller = require('../controllers/adminSettingController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/site', controller.getSiteSettings);
router.put('/site', controller.updateSiteSettings);
router.get('/content', controller.getContentConfig);
router.put('/content', controller.updateContentConfig);
// [2025-11-16 16:05:00] Production stage templates
router.get('/production/templates', controller.getProductionTemplates);
router.put('/production/templates', controller.updateProductionTemplates);

module.exports = router;


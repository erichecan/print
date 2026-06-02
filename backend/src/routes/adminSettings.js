// Admin settings routes
const express = require('express');
const controller = require('../controllers/adminSettingController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/site', controller.getSiteSettings);
router.put('/site', controller.updateSiteSettings);
router.get('/content', controller.getContentConfig);
router.put('/content', controller.updateContentConfig);
// Production stage templates
router.get('/production/templates', controller.getProductionTemplates);
router.put('/production/templates', controller.updateProductionTemplates);

// Shipping settings
router.get('/shipping', controller.getShippingSettings);
router.put('/shipping', controller.updateShippingSettings);

// Color Mappings
router.get('/color-mappings', controller.getColorMappings);
router.put('/color-mappings', controller.updateColorMappings);
router.delete('/color-mappings/:id', controller.deleteColorMapping);

// Print Pricing
router.get('/print-pricing', controller.getPrintPricing);
router.put('/print-pricing', controller.updatePrintPricing);

module.exports = router;


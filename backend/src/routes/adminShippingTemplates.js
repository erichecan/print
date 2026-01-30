const express = require('express');
const controller = require('../controllers/shippingTemplateController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes require admin authentication
router.use(requireAdmin);

/**
 * @route GET /api/admin/shipping-templates
 * @desc Get all shipping templates
 */
router.get('/', controller.listTemplates);

/**
 * @route GET /api/admin/shipping-templates/:id
 * @desc Get a single shipping template by ID
 */
router.get('/:id', controller.getTemplate);

/**
 * @route POST /api/admin/shipping-templates
 * @desc Create a new shipping template
 */
router.post('/', controller.createTemplate);

/**
 * @route PATCH /api/admin/shipping-templates/:id
 * @desc Update an existing shipping template
 */
router.patch('/:id', controller.updateTemplate);

/**
 * @route DELETE /api/admin/shipping-templates/:id
 * @desc Delete a shipping template
 */
router.delete('/:id', controller.deleteTemplate);

/**
 * @route POST /api/admin/shipping-templates/:id/duplicate
 * @desc Duplicate an existing shipping template
 */
router.post('/:id/duplicate', controller.duplicateTemplate);

module.exports = router;

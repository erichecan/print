// [2025-11-11 15:32:12] Design Lab routes
const express = require('express');
const router = express.Router();
const designController = require('../controllers/designController');
const { authenticateOptional, authenticate } = require('../middleware/auth');

router.post('/', authenticateOptional, designController.createDesignDraft);
router.get('/:id', authenticateOptional, designController.getDesignDraft);
router.patch('/:id', authenticateOptional, designController.updateDesignDraft);
router.post('/:id/assets', authenticate, designController.generateAssetUploadUrl);
router.post('/:id/quote', authenticateOptional, designController.requestQuote);
router.post('/:id/order', authenticateOptional, designController.submitDesignOrder);

module.exports = router;



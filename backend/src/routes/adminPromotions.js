// [2025-11-15 15:20:00] Admin promotion routes
const express = require('express');
const controller = require('../controllers/adminPromotionController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listPromotions);
router.post('/', controller.createPromotion);
router.put('/:id', controller.updatePromotion);
router.delete('/:id', controller.deletePromotion);

module.exports = router;


// [2025-11-15 15:05:00] Admin design review routes
const express = require('express');
const controller = require('../controllers/adminDesignController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listDesigns);
router.get('/:id', controller.getDesignDetail);
router.patch('/:id/status', controller.updateDesignStatus);

module.exports = router;


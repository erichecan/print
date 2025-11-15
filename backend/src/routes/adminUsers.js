// [2025-11-15 14:05:00] Admin user management routes
const express = require('express');
const controller = require('../controllers/adminUserController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listUsers);
router.get('/:id', controller.getUserDetail);

module.exports = router;


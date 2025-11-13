const express = require('express');
const controller = require('../controllers/adminAuditLogController');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.use(requireAdmin);

router.get('/', controller.listAuditLogs);

module.exports = router;


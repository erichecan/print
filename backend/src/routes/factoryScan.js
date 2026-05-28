const express = require('express');
const router = express.Router();
const { getOrderByToken, updateStatusByToken } = require('../controllers/factoryScanController');

// Public routes — printToken is the auth mechanism, no JWT required
router.get('/scan', getOrderByToken);
router.post('/scan/update-status', updateStatusByToken);

module.exports = router;

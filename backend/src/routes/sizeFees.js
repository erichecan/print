const express = require('express');
const router = express.Router();
const offlineOrderSizeFeeController = require('../controllers/offlineOrderSizeFeeController');
const logger = require('../utils/logger');

// Public route to get size fees
// Used by Design Lab to calculate accurate pricing
router.get('/', (req, res, next) => {
    // Add logging for debugging
    logger.info('[SizeFees Public Route] Request received');
    next();
}, offlineOrderSizeFeeController.getSizeFees);

module.exports = router;

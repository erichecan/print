const express = require('express');
const router = express.Router();
const sizeFeeController = require('../controllers/sizeFeeController');
const logger = require('../utils/logger');

// Public route to get size fees
// Used by Design Lab to calculate accurate pricing
// 返回所有启用的尺码配置，按 display_order 排序
router.get('/', (req, res, next) => {
    // Add logging for debugging
    logger.info('[SizeFees Public Route] Request received');
    next();
}, sizeFeeController.getSizeFees);

module.exports = router;

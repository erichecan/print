/**
 * Public Content Routes
* Public routes for CMS content (no authentication required)
 */
const express = require('express');
const controller = require('../controllers/adminSettingController');

const router = express.Router();

// 公共内容 API，不需要管理员权限
router.get('/', controller.getPublicContentConfig);

module.exports = router;


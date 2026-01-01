/**
 * Product Color Image Routes
* 产品颜色图片映射 API 路由
 */
const express = require('express');
const router = express.Router();
const controller = require('../controllers/productColorImageController');
const { authenticateOptional } = require('../middleware/auth');

const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

// 获取产品颜色图片映射
router.get('/', authenticateOptional, controller.getProductColorImages);

// 根据颜色名称获取图片 URL
router.get('/by-color/:productId/:colorName', authenticateOptional, controller.getImageUrlByColor);

// 获取颜色映射表（用于前端 COLOR_ID_MAP）
router.get('/mapping/:productId', authenticateOptional, controller.getColorMapping);

// Upload endpoint for Color Mapping Page
router.post('/upload', authenticateOptional, upload.single('file'), controller.uploadColorImage);

// Update mapping endpoint for Color Mapping Page
router.post('/update-mapping', authenticateOptional, controller.updateReferenceColors);

// 批量创建或更新（需要管理员权限，暂时开放用于数据导入）
router.post('/bulk', authenticateOptional, controller.bulkCreateOrUpdate);

module.exports = router;


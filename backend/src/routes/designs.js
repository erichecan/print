// [2025-11-11 15:32:12] Design Lab routes
const express = require('express');
const router = express.Router();
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const designController = require('../controllers/designController');
const { authenticateOptional, authenticate } = require('../middleware/auth');

// --- [新增] Multer 文件上传配置 ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 文件存储在项目根目录下的 `backend/uploads` 文件夹
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名: uuid + 原始文件扩展名
    const uniqueSuffix = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const upload = multer({ storage: storage });
// --- 结束新增 ---

router.post('/', authenticateOptional, designController.createDesignDraft);
router.get('/:id', authenticateOptional, designController.getDesignDraft);
router.patch('/:id', authenticateOptional, designController.updateDesignDraft);

// [新增] 处理文件上传的路由
// 'signature' 必须与前端 FormData 中的字段名匹配
router.post(
  '/:designId/upload-signature',
  authenticateOptional, // 使用可选认证，方便测试
  upload.single('signature'), 
  designController.uploadSignature
);

router.post('/:id/assets', authenticate, designController.generateAssetUploadUrl);
router.post('/:id/quote', authenticateOptional, designController.requestQuote);
router.post('/:id/order', authenticateOptional, designController.submitDesignOrder);

module.exports = router;



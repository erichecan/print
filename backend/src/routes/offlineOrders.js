// Offline order intake routes
const express = require('express');
const multer = require('multer');
const { authenticateOptional } = require('../middleware/auth');
const offlineOrderController = require('../controllers/offlineOrderController');
const { ensureOfflineUploadRoot, getAllowedExtensions, isExtensionAllowed } = require('../utils/offlineUpload');

const router = express.Router();

// Use memory storage for GCS upload
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (!isExtensionAllowed(file.originalname)) {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = `Unsupported file type: ${file.originalname}. Allowed extensions: ${getAllowedExtensions().join(
      ', '
    )}`;
    return cb(error);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.OFFLINE_ORDER_MAX_FILE_MB || '50', 10) * 1024 * 1024,
    files: parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)
  },
  fileFilter
});

// PRD v2.0: 获取订单创建配置数据（产品、颜色、尺码费用、可用性等）
router.get('/config', offlineOrderController.getOrderConfig);

router.post(
  '/',
  authenticateOptional,
  upload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.createOfflineOrder
);

module.exports = router;


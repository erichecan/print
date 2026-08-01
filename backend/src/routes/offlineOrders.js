// Offline order intake routes
const express = require('express');
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
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

const maxFilesPerField = parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10);

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.OFFLINE_ORDER_MAX_FILE_MB || '50', 10) * 1024 * 1024,
    // limits.files 是所有字段合计的上限，assets（订单级附件）+ positionAssets（印刷位置设计图）各自最多 maxFilesPerField
    files: maxFilesPerField * 2
  },
  fileFilter
});

// PRD v2.0: 获取订单创建配置数据（产品、颜色、尺码费用、可用性等）
router.get('/config', offlineOrderController.getOrderConfig);

router.post(
  '/',
  authenticate,
  upload.fields([
    { name: 'assets', maxCount: maxFilesPerField },
    { name: 'positionAssets', maxCount: maxFilesPerField }
  ]),
  offlineOrderController.createOfflineOrder
);

module.exports = router;


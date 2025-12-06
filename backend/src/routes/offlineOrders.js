// [2025-11-08 06:56:45] Offline order intake routes
const express = require('express');
const multer = require('multer');
const { authenticateOptional } = require('../middleware/auth');
const offlineOrderController = require('../controllers/offlineOrderController');
const { ensureOfflineUploadRoot, getAllowedExtensions, isExtensionAllowed } = require('../utils/offlineUpload');

const router = express.Router();

const uploadRoot = ensureOfflineUploadRoot();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
    cb(null, `${timestamp}-${safeName}`);
  }
});

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

// [2025-12-06 17:55:00] PRD v2.0: 获取订单配置数据（无需认证，前端创建订单时使用）
router.get('/config', offlineOrderController.getOrderConfig);

router.post(
  '/',
  authenticateOptional,
  upload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.createOfflineOrder
);

module.exports = router;


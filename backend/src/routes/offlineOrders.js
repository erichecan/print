// [2025-11-08 06:56:45] Offline order intake routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateOptional } = require('../middleware/auth');
const offlineOrderController = require('../controllers/offlineOrderController');

const router = express.Router();

const uploadRoot = path.join(__dirname, '../../uploads/offline-orders');
if (!fs.existsSync(uploadRoot)) {
  fs.mkdirSync(uploadRoot, { recursive: true });
}

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

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.OFFLINE_ORDER_MAX_FILE_MB || '50', 10) * 1024 * 1024,
    files: parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)
  }
});

router.post(
  '/',
  authenticateOptional,
  upload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.createOfflineOrder
);

module.exports = router;


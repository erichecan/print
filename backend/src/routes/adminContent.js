/**
 * Admin Content Routes
 * [2025-01-28 06:00:00] Admin routes for CMS content management
 */
const express = require('express');
const router = express.Router();
const adminContentController = require('../controllers/adminContentController');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// [2025-01-28 06:00:00] 所有路由需要管理员权限
router.use(requireAdmin);

// [2025-01-28 06:00:00] 配置文件上传
const cmsUploadRoot = path.join(__dirname, '../../uploads/cms');
if (!require('fs').existsSync(cmsUploadRoot)) {
  require('fs').mkdirSync(cmsUploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, cmsUploadRoot);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed types: ${allowedMimes.join(', ')}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
});

// [2025-01-28 06:00:00] 图片上传（带错误处理）
router.post('/upload', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // [2025-01-28 06:00:00] Multer 错误处理
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      // [2025-01-28 06:00:00] 其他错误（如文件类型错误）
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, adminContentController.uploadImage);

module.exports = router;


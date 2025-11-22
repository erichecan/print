/**
 * Admin Art Assets Routes
 * [2025-01-28 00:50:00] Admin routes for managing art assets
 */
const express = require('express');
const router = express.Router();
const artAssetController = require('../controllers/artAssetController');
const { requireAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

// [2025-01-28 00:50:00] 所有路由需要管理员权限
router.use(requireAdmin);

// [2025-01-28 00:50:00] 配置文件上传
const artAssetUploadRoot = path.join(__dirname, '../../uploads/art-assets');
if (!require('fs').existsSync(artAssetUploadRoot)) {
  require('fs').mkdirSync(artAssetUploadRoot, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, artAssetUploadRoot);
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

// [2025-01-28 00:50:00] 获取所有素材（管理员，包括未启用的）
router.get('/', artAssetController.getAllArtAssets);

// [2025-01-28 00:50:00] 获取单个素材
router.get('/:id', artAssetController.getArtAsset);

// [2025-01-28 02:25:00] 创建素材（带错误处理）
router.post('/', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      // [2025-01-28 02:25:00] Multer 错误处理
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      // [2025-01-28 02:25:00] 其他错误（如文件类型错误）
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, artAssetController.createArtAsset);

// [2025-01-28 02:25:00] 更新素材（带错误处理）
router.put('/:id', (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ error: 'File too large. Maximum size is 10MB' });
        }
        return res.status(400).json({ error: err.message || 'File upload error' });
      }
      return res.status(400).json({ error: err.message || 'File upload failed' });
    }
    next();
  });
}, artAssetController.updateArtAsset);

// [2025-01-28 00:50:00] 删除素材
router.delete('/:id', artAssetController.deleteArtAsset);

module.exports = router;


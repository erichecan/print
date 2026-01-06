// Admin routes for offline POD orders
// 允许 SALES_MANAGER 访问配置相关接口
const express = require('express');
const multer = require('multer');
const offlineOrderController = require('../controllers/offlineOrderController');
const { ensureOfflineUploadRoot, getAllowedExtensions, isExtensionAllowed } = require('../utils/offlineUpload');
const { requireAdmin, authorizeRoles } = require('../middleware/auth');

const router = express.Router();

// 配置相关接口允许 SALES、SALES_MANAGER 和 ADMIN 访问（必须在 requireAdmin 之前定义）
// 修复：authorizeRoles 需要先认证，所以先调用 authenticate
const { authenticate } = require('../middleware/auth');
// GET /config/stages 允许 SALES、SALES_MANAGER 和 ADMIN 访问（SALES 需要查看阶段配置）
router.get('/config/stages', authenticate, authorizeRoles('SALES', 'SALES_MANAGER', 'ADMIN'), offlineOrderController.getOfflineWorkflowStages);
// PUT /config/stages 仅允许 ADMIN 访问
router.put('/config/stages', requireAdmin, offlineOrderController.updateOfflineWorkflowStages);

// 其他接口需要 ADMIN 权限
router.use(requireAdmin);

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

const adminUpload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.OFFLINE_ORDER_MAX_FILE_MB || '50', 10) * 1024 * 1024,
    files: parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)
  },
  fileFilter
});

// 注意：以下路由都会应用 requireAdmin 中间件（通过上面的 router.use）

router.get('/metrics/summary', offlineOrderController.getOfflineOrderMetrics);

router.get('/', offlineOrderController.listOfflineOrders);

router.get('/:id', offlineOrderController.getOfflineOrderById);

router.patch('/:id/stage', offlineOrderController.updateOfflineOrderStage);

// 修复：PATCH /:id 需要支持 FormData（用于更新订单时上传文件）
// 使用 multer 中间件处理可能的文件上传
router.patch('/:id', adminUpload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)), offlineOrderController.updateOfflineOrder);

router.post('/:id/notes', offlineOrderController.addOfflineOrderNote);

router.post(
  '/:id/assets',
  adminUpload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.uploadOfflineOrderAssets
);

router.post('/:id/production', offlineOrderController.createOrUpdateProductionWorkOrder);

// 删除订单
router.delete('/:id', offlineOrderController.deleteOfflineOrder);

module.exports = router;


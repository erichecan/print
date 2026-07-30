// Admin routes for offline POD orders
// 允许 SALES_MANAGER 访问配置相关接口
const express = require('express');
const multer = require('multer');
const offlineOrderController = require('../controllers/offlineOrderController');
// 2026-04-20: 新增 status 选项字典 controller
const offlineOrderStatusOptionController = require('../controllers/offlineOrderStatusOptionController');
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

// Base authentication for all following routes
router.use(authenticate);

// List of roles allowed for general offline order management
const ORDER_MANAGEMENT_ROLES = ['SALES', 'SALES_MANAGER', 'ADMIN'];

ensureOfflineUploadRoot();

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

const adminMaxFilesPerField = parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10);

// 使用 memoryStorage 以便上传到 GCS（与 POST /api/offline-orders 一致）
const adminUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.OFFLINE_ORDER_MAX_FILE_MB || '50', 10) * 1024 * 1024,
    // limits.files 是所有字段合计的上限，assets（订单级附件）+ positionAssets（印刷位置设计图）各自最多 adminMaxFilesPerField
    files: adminMaxFilesPerField * 2
  },
  fileFilter
});

// 注意：以下路由都会应用 requireAdmin 中间件（通过上面的 router.use）

// ----------------------------------------------------------------
// 2026-04-20: 状态选项字典（订单管理列表 status 自定义功能用）
// 必须放在 /:id 之前，否则 'status-options' 会被当作 :id 截获
// ----------------------------------------------------------------
router.get(
  '/status-options',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  offlineOrderStatusOptionController.listStatusOptions
);
router.post(
  '/status-options',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  offlineOrderStatusOptionController.createStatusOption
);
router.delete(
  '/status-options/:id',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  offlineOrderStatusOptionController.deleteStatusOption
);

router.get('/metrics/summary', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.getOfflineOrderMetrics);

router.get('/', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.listOfflineOrders);

router.get('/:id', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.getOfflineOrderById);

router.patch('/:id/stage', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.updateOfflineOrderStage);

// 修复：PATCH /:id 需要支持 FormData（用于更新订单时上传文件）
// 使用 multer 中间件处理可能的文件上传（assets = 订单级附件，positionAssets = 印刷位置设计图）
router.patch(
  '/:id',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  adminUpload.fields([
    { name: 'assets', maxCount: adminMaxFilesPerField },
    { name: 'positionAssets', maxCount: adminMaxFilesPerField }
  ]),
  offlineOrderController.updateOfflineOrder
);

router.post('/:id/notes', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.addOfflineOrderNote);

router.post(
  '/:id/assets',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  adminUpload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.uploadOfflineOrderAssets
);

router.patch(
  '/:id/assets/:assetId',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  offlineOrderController.updateOfflineOrderAssetComment
);

router.delete(
  '/:id/assets/:assetId',
  authorizeRoles(...ORDER_MANAGEMENT_ROLES),
  offlineOrderController.deleteOfflineOrderAsset
);

router.post('/:id/production', authorizeRoles(...ORDER_MANAGEMENT_ROLES), offlineOrderController.createOrUpdateProductionWorkOrder);

// 删除订单 - 仅限 ADMIN
router.delete('/:id', authorizeRoles('ADMIN'), offlineOrderController.deleteOfflineOrder);

module.exports = router;


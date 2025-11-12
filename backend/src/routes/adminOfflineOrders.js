// [2025-11-08 06:57:02] Admin routes for offline POD orders
const express = require('express');
const multer = require('multer');
const offlineOrderController = require('../controllers/offlineOrderController');
const { ensureOfflineUploadRoot, getAllowedExtensions, isExtensionAllowed } = require('../utils/offlineUpload');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

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

router.get('/config/stages', offlineOrderController.getOfflineWorkflowStages);

router.put('/config/stages', offlineOrderController.updateOfflineWorkflowStages);

router.get('/metrics/summary', offlineOrderController.getOfflineOrderMetrics);

router.get('/', offlineOrderController.listOfflineOrders);

router.get('/:id', offlineOrderController.getOfflineOrderById);

router.patch('/:id/stage', offlineOrderController.updateOfflineOrderStage);

router.patch('/:id', offlineOrderController.updateOfflineOrder);

router.post('/:id/notes', offlineOrderController.addOfflineOrderNote);

router.post(
  '/:id/assets',
  adminUpload.array('assets', parseInt(process.env.OFFLINE_ORDER_MAX_FILES || '10', 10)),
  offlineOrderController.uploadOfflineOrderAssets
);

router.post('/:id/production', offlineOrderController.createOrUpdateProductionWorkOrder);

module.exports = router;


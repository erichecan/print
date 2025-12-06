// [2025-11-11 23:19:40] 后台商品管理路由
// [2025-01-27 13:50:00] Added inventory management routes
const express = require('express');
const multer = require('multer');
const controller = require('../controllers/adminProductController');
const inventoryController = require('../controllers/inventoryController');
const { requireAdmin } = require('../middleware/auth');
const {
  ensureProductUploadRoot,
  getAllowedImageExtensions,
  isImageExtensionAllowed,
} = require('../utils/productUpload');

const router = express.Router();

router.use(requireAdmin);

const productUploadRoot = ensureProductUploadRoot(); // [2025-01-27 15:02:45] Ensure product upload directory exists

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, productUploadRoot);
  },
  filename: (_req, file, cb) => {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
    cb(null, `${timestamp}-${safeName}`);
  },
});

const fileFilter = (_req, file, cb) => {
  if (!isImageExtensionAllowed(file.originalname)) {
    const error = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
    error.message = `Unsupported file type: ${file.originalname}. Allowed extensions: ${getAllowedImageExtensions().join(', ')}`;
    return cb(error);
  }
  cb(null, true);
};

const maxFileSizeMb = parseInt(process.env.PRODUCT_IMAGE_MAX_FILE_MB || '10', 10);
const maxFiles = parseInt(process.env.PRODUCT_IMAGE_MAX_FILES || '10', 10);

const productImageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMb * 1024 * 1024,
    files: maxFiles,
  },
});

// Inventory management routes (must be before /:id routes)
router.get('/low-stock', inventoryController.getLowStockProducts);
router.get('/out-of-stock', inventoryController.getOutOfStockProducts);
// [2025-12-06 16:00:00] Inventory alert routes
router.get('/variants/:id/low-stock-threshold', inventoryController.getLowStockThreshold);
router.patch('/variants/:id/low-stock-threshold', inventoryController.updateLowStockThreshold);

router.get('/', controller.listProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.archiveProduct);
router.patch('/:id/status', controller.updateProductStatus);
router.post(
  '/:id/images',
  productImageUpload.array('images', maxFiles),
  controller.uploadProductImages
);
router.delete('/:productId/images/:imageId', controller.deleteProductImage);

module.exports = router;



// 后台商品管理路由
// Added inventory management routes
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

// Seeding route (Bypassing Admin Auth for Deployment Script)
// TODO: Add API Key protection if needed
router.post('/seed/design-lab', controller.seedDesignLabProduct);

router.use(requireAdmin);

const storage = multer.memoryStorage();

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
// Inventory alert routes
router.get('/variants/:id/low-stock-threshold', inventoryController.getLowStockThreshold);
router.patch('/variants/:id/low-stock-threshold', inventoryController.updateLowStockThreshold);

router.patch('/batch/status', controller.batchUpdateStatus);
router.delete('/batch', controller.batchDelete);

router.get('/', controller.listProducts);
router.get('/:id', controller.getProductById);
router.post('/', controller.createProduct);
router.put('/:id', controller.updateProduct);
router.delete('/:id', controller.deleteProduct);
router.patch('/:id/status', controller.updateProductStatus);
router.post(
  '/:id/images',
  productImageUpload.array('images', maxFiles),
  controller.uploadProductImages
);
router.delete('/:productId/images/:imageId', controller.deleteProductImage);

module.exports = router;



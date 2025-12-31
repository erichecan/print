// Supplier management routes for Issue #89
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);

// Supplier CRUD
router.get('/', supplierController.listSuppliers);
router.get('/sync-status', supplierController.getSyncStatus);
router.get('/:id', supplierController.getSupplier);
router.post('/', supplierController.createSupplier);
router.patch('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

// Sync operations
router.post('/:id/sync', supplierController.syncInventory);
router.get('/:id/sync-history', supplierController.getSyncHistory);

module.exports = router;


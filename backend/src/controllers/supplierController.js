/**
 * Supplier Controller
 * [2025-12-06 17:10:00] Supplier management controller for Issue #89
 */
const supplierService = require('../services/supplierService');
const inventorySyncService = require('../services/inventorySyncService');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * GET /api/admin/suppliers - List all suppliers
 * [2025-12-06 17:10:00]
 */
exports.listSuppliers = async (req, res) => {
  try {
    const suppliers = await supplierService.getActiveSuppliers();
    res.json({ suppliers });
  } catch (error) {
    logger.error('[Admin] Error listing suppliers:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to list suppliers',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/suppliers/:id - Get supplier by ID
 * [2025-12-06 17:10:00]
 */
exports.getSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const supplier = await supplierService.getSupplierById(id);
    res.json({ supplier });
  } catch (error) {
    if (error.isOperational && error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('[Admin] Error getting supplier:', {
      error: error.message,
      supplierId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to get supplier',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/suppliers - Create supplier
 * [2025-12-06 17:10:00]
 */
exports.createSupplier = async (req, res) => {
  try {
    const { name, apiUrl, apiKey, apiSecret, syncInterval, isActive, config } = req.body || {};

    if (!name || !apiUrl || !apiKey) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'apiUrl', 'apiKey'],
      });
    }

    const supplier = await supplierService.upsertSupplier({
      name,
      apiUrl,
      apiKey,
      apiSecret,
      syncInterval,
      isActive,
      config,
    });

    res.status(201).json({ supplier });
  } catch (error) {
    logger.error('[Admin] Error creating supplier:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to create supplier',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * PATCH /api/admin/suppliers/:id - Update supplier
 * [2025-12-06 17:10:00]
 */
exports.updateSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, apiUrl, apiKey, apiSecret, syncInterval, isActive, config } = req.body || {};

    // Verify supplier exists
    await supplierService.getSupplierById(id);

    const supplier = await supplierService.upsertSupplier({
      id,
      name,
      apiUrl,
      apiKey,
      apiSecret,
      syncInterval,
      isActive,
      config,
    });

    res.json({ supplier });
  } catch (error) {
    if (error.isOperational && error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('[Admin] Error updating supplier:', {
      error: error.message,
      supplierId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to update supplier',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * DELETE /api/admin/suppliers/:id - Delete supplier
 * [2025-12-06 17:10:00]
 */
exports.deleteSupplier = async (req, res) => {
  try {
    const { id } = req.params;
    const prisma = require('../lib/prisma');

    // Verify supplier exists
    await supplierService.getSupplierById(id);

    // Delete supplier (cascade will delete syncs)
    await prisma.supplier.delete({
      where: { id },
    });

    logger.info('Supplier deleted', {
      supplierId: id,
      actorId: req.user?.id,
    });

    res.json({ success: true });
  } catch (error) {
    if (error.isOperational && error.statusCode === 404) {
      return res.status(404).json({ error: error.message });
    }
    logger.error('[Admin] Error deleting supplier:', {
      error: error.message,
      supplierId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to delete supplier',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/suppliers/:id/sync - Trigger inventory sync
 * [2025-12-06 17:10:00]
 */
exports.syncInventory = async (req, res) => {
  try {
    const { id } = req.params;
    const { force = false, dryRun = false } = req.body || {};

    const result = await inventorySyncService.syncInventoryFromSupplier(id, {
      force,
      dryRun,
    });

    res.json(result);
  } catch (error) {
    logger.error('[Admin] Error syncing inventory:', {
      error: error.message,
      supplierId: req.params.id,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to sync inventory',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/suppliers/:id/sync-history - Get sync history
 * [2025-12-06 17:10:00]
 */
exports.getSyncHistory = async (req, res) => {
  try {
    const { id } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    const history = await inventorySyncService.getSyncHistory(id, {
      limit,
      offset,
    });

    res.json(history);
  } catch (error) {
    logger.error('[Admin] Error getting sync history:', {
      error: error.message,
      supplierId: req.params.id,
    });
    res.status(500).json({
      error: 'Failed to get sync history',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/suppliers/sync-status - Get sync status for all suppliers
 * [2025-12-06 17:10:00]
 */
exports.getSyncStatus = async (req, res) => {
  try {
    const status = await inventorySyncService.getAllSuppliersSyncStatus();
    res.json({ suppliers: status });
  } catch (error) {
    logger.error('[Admin] Error getting sync status:', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to get sync status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


/**
 * Inventory Sync Service
* Inventory synchronization service for Issue #89
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');
const supplierService = require('./supplierService');
const inventoryService = require('./inventoryService');

/**
 * Sync inventory from a supplier
 * @param {string} supplierId - Supplier ID
 * @param {Object} options - Sync options
 * @returns {Promise<Object>} Sync result
 */
async function syncInventoryFromSupplier(supplierId, options = {}) {
  const { force = false, dryRun = false } = options;
  const timestamp = new Date().toISOString();

  try {
    // Get supplier
    const supplier = await supplierService.getSupplierById(supplierId);

    // Check if sync is needed (unless forced)
    if (!force && supplier.lastSyncAt) {
      const lastSyncTime = new Date(supplier.lastSyncAt).getTime();
      const syncInterval = supplier.syncInterval * 1000; // Convert to milliseconds
      const timeSinceLastSync = Date.now() - lastSyncTime;

      if (timeSinceLastSync < syncInterval) {
        logger.info('Sync skipped - too soon since last sync', {
          timestamp,
          supplierId,
          timeSinceLastSync,
          syncInterval,
        });
        return {
          success: false,
          skipped: true,
          message: 'Sync skipped - too soon since last sync',
        };
      }
    }

    // Create sync record
    const syncRecord = await prisma.inventorySync.create({
      data: {
        supplierId,
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        itemsProcessed: 0,
        itemsUpdated: 0,
        itemsFailed: 0,
      },
    });

    logger.info('Starting inventory sync', {
      timestamp,
      syncId: syncRecord.id,
      supplierId,
      supplierName: supplier.name,
      dryRun,
    });

    let itemsProcessed = 0;
    let itemsUpdated = 0;
    let itemsFailed = 0;
    const errors = [];

    try {
      // Fetch inventory from supplier
      const supplierInventory = await supplierService.fetchSupplierInventory(supplier);

      // Process each item
      for (const supplierItem of supplierInventory) {
        itemsProcessed++;

        try {
          // Map supplier item to internal format
          const inventoryData = supplierService.mapSupplierItemToInventory(supplierItem, supplier);

          if (!inventoryData.sku) {
            itemsFailed++;
            errors.push({
              item: supplierItem,
              error: 'Missing SKU',
            });
            continue;
          }

          // Find variant by SKU
          const variant = await prisma.variant.findUnique({
            where: { sku: inventoryData.sku },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          });

          if (!variant) {
            itemsFailed++;
            errors.push({
              sku: inventoryData.sku,
              error: 'Variant not found',
            });
            logger.warn('Variant not found during sync', {
              sku: inventoryData.sku,
              supplierId,
            });
            continue;
          }

          // Update inventory if not dry run
          if (!dryRun) {
            const oldQuantity = variant.stockQuantity;
            await inventoryService.updateStockQuantity(variant.id, inventoryData.quantity);

            if (oldQuantity !== inventoryData.quantity) {
              itemsUpdated++;
              logger.debug('Inventory updated during sync', {
                variantId: variant.id,
                sku: inventoryData.sku,
                oldQuantity,
                newQuantity: inventoryData.quantity,
              });
            }
          } else {
            // Dry run - just log what would be updated
            if (variant.stockQuantity !== inventoryData.quantity) {
              itemsUpdated++;
              logger.debug('Dry run: Would update inventory', {
                variantId: variant.id,
                sku: inventoryData.sku,
                currentQuantity: variant.stockQuantity,
                newQuantity: inventoryData.quantity,
              });
            }
          }
        } catch (itemError) {
          itemsFailed++;
          errors.push({
            item: supplierItem,
            error: itemError.message,
          });
          logger.warn('Error processing inventory item', {
            error: itemError.message,
            supplierItem,
          });
        }
      }

      // Determine sync status
      let syncStatus = 'SUCCESS';
      if (itemsFailed > 0 && itemsUpdated === 0) {
        syncStatus = 'FAILED';
      } else if (itemsFailed > 0) {
        syncStatus = 'PARTIAL';
      }

      // Update sync record
      const completedSync = await prisma.inventorySync.update({
        where: { id: syncRecord.id },
        data: {
          status: syncStatus,
          completedAt: new Date(),
          itemsProcessed,
          itemsUpdated,
          itemsFailed,
          errorMessage: errors.length > 0 ? JSON.stringify(errors.slice(0, 10)) : null, // Limit error message size
          metadata: {
            dryRun,
            timestamp,
            totalItems: supplierInventory.length,
          },
        },
      });

      // Update supplier sync status
      await supplierService.updateSupplierSyncStatus(supplierId, syncStatus);

      logger.info('Inventory sync completed', {
        timestamp,
        syncId: syncRecord.id,
        supplierId,
        supplierName: supplier.name,
        status: syncStatus,
        itemsProcessed,
        itemsUpdated,
        itemsFailed,
        dryRun,
      });

      return {
        success: syncStatus !== 'FAILED',
        syncId: syncRecord.id,
        status: syncStatus,
        itemsProcessed,
        itemsUpdated,
        itemsFailed,
        errors: errors.slice(0, 10), // Return first 10 errors
        dryRun,
      };
    } catch (syncError) {
      // Update sync record with error
      await prisma.inventorySync.update({
        where: { id: syncRecord.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
          errorMessage: syncError.message,
        },
      });

      await supplierService.updateSupplierSyncStatus(supplierId, 'FAILED', syncError);

      logger.error('Inventory sync failed', {
        timestamp,
        syncId: syncRecord.id,
        supplierId,
        error: syncError.message,
        stack: syncError.stack,
      });

      throw syncError;
    }
  } catch (error) {
    logger.error('Error in inventory sync', {
      timestamp,
      supplierId,
      error: error.message,
      stack: error.stack,
    });

    if (error.isOperational) {
      throw error;
    }

    throw new BadRequestError(`Failed to sync inventory: ${error.message}`);
  }
}

/**
 * Get sync history for a supplier
 */
async function getSyncHistory(supplierId, options = {}) {
  const { limit = 50, offset = 0 } = options;

  try {
    const syncs = await prisma.inventorySync.findMany({
      where: { supplierId },
      orderBy: { startedAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await prisma.inventorySync.count({
      where: { supplierId },
    });

    return {
      syncs,
      total,
      limit,
      offset,
    };
  } catch (error) {
    logger.error('Error fetching sync history', {
      error: error.message,
      supplierId,
    });
    throw error;
  }
}

/**
 * Get sync status for all suppliers
 */
async function getAllSuppliersSyncStatus() {
  try {
    const suppliers = await prisma.supplier.findMany({
      include: {
        syncs: {
          orderBy: { startedAt: 'desc' },
          take: 1, // Get latest sync
        },
      },
    });

    return suppliers.map((supplier) => ({
      id: supplier.id,
      name: supplier.name,
      isActive: supplier.isActive,
      lastSyncAt: supplier.lastSyncAt,
      lastSyncStatus: supplier.lastSyncStatus,
      latestSync: supplier.syncs[0] || null,
    }));
  } catch (error) {
// 增强错误日志
    logger.error('Error fetching suppliers sync status', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      error: error.message,
    });
    throw error;
  }
}

module.exports = {
  syncInventoryFromSupplier,
  getSyncHistory,
  getAllSuppliersSyncStatus,
};


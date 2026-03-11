/**
 * Supplier Service
* Supplier API integration service for Issue #89
 */
const axios = require('axios');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, NotFoundError } = require('../utils/errors');

/**
 * Fetch inventory data from supplier API
 * @param {Object} supplier - Supplier record from database
 * @returns {Promise<Array>} Array of inventory items from supplier
 */
async function fetchSupplierInventory(supplier) {
  const timestamp = new Date().toISOString();
  try {
    if (!supplier.isActive) {
      throw new BadRequestError(`Supplier ${supplier.name} is not active`);
    }

    if (!supplier.apiUrl || !supplier.apiKey) {
      throw new BadRequestError(`Supplier ${supplier.name} is missing API configuration`);
    }

    logger.info('Fetching inventory from supplier', {
      timestamp,
      supplierId: supplier.id,
      supplierName: supplier.name,
      apiUrl: supplier.apiUrl,
    });

    // Build request config
    const config = {
      method: 'GET',
      url: supplier.apiUrl,
      headers: {
        'Authorization': `Bearer ${supplier.apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds
    };

    // Add API secret if provided
    if (supplier.apiSecret) {
      config.headers['X-API-Secret'] = supplier.apiSecret;
    }

    // Add custom headers from config if available
    if (supplier.config && supplier.config.headers) {
      Object.assign(config.headers, supplier.config.headers);
    }

    // Make API request
    const response = await axios(config);

    // Parse response based on supplier config
    let inventoryData = [];
    if (supplier.config && supplier.config.responsePath) {
      // Use custom response path (e.g., data.items, results.inventory)
      const pathParts = supplier.config.responsePath.split('.');
      let data = response.data;
      for (const part of pathParts) {
        data = data?.[part];
      }
      inventoryData = Array.isArray(data) ? data : [];
    } else {
      // Default: assume response.data is an array or response.data.items is an array
      inventoryData = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.items || response.data?.inventory || []);
    }

    logger.info('Successfully fetched inventory from supplier', {
      timestamp,
      supplierId: supplier.id,
      supplierName: supplier.name,
      itemCount: inventoryData.length,
    });

    return inventoryData;
  } catch (error) {
    logger.error('Error fetching supplier inventory', {
      timestamp,
      supplierId: supplier.id,
      supplierName: supplier.name,
      error: error.message,
      stack: error.stack,
      response: error.response?.data || null,
    });

    if (error.response) {
      throw new BadRequestError(
        `Supplier API error: ${error.response.status} - ${error.response.statusText}`
      );
    }

    throw error;
  }
}

/**
 * Map supplier SKU to internal variant SKU
 * @param {Object} supplierItem - Item from supplier API
 * @param {Object} supplier - Supplier configuration
 * @returns {Object} Mapped inventory data
 */
function mapSupplierItemToInventory(supplierItem, supplier) {
  const mapping = supplier.config?.fieldMapping || {};
  
  return {
    sku: supplierItem[mapping.sku || 'sku'] || supplierItem.sku,
    quantity: parseInt(supplierItem[mapping.quantity || 'quantity'] || supplierItem.quantity || 0),
    price: parseFloat(supplierItem[mapping.price || 'price'] || supplierItem.price || 0),
    // Additional fields if needed
    supplierSku: supplierItem[mapping.supplierSku || 'supplierSku'] || supplierItem.supplierSku,
    metadata: {
      supplierItem,
      mappedAt: new Date().toISOString(),
    },
  };
}

/**
 * Get all active suppliers
 * 容错：生产环境若未执行 schema 同步（suppliers 表不存在）则返回空数组，避免 500
 * 2026-03-10 根因修复：/api/admin/suppliers 500
 */
async function getActiveSuppliers() {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });

    return suppliers;
  } catch (error) {
    const msg = (error && error.message) ? String(error.message) : '';
    const code = error && error.code;
    const isMissingTable =
      code === 'P2021' ||
      /relation.*does not exist|table.*suppliers.*does not exist|relation "suppliers" does not exist/i.test(msg);

    if (isMissingTable) {
      logger.warn('Suppliers table or relation missing (schema sync required). Returning empty list.', {
        hint: 'Set AUTO_MIGRATE=true and redeploy, or run: npx prisma db push',
      });
      return [];
    }

    logger.error('Error fetching active suppliers', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Get supplier by ID
 */
async function getSupplierById(supplierId) {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      throw new NotFoundError('Supplier not found');
    }

    return supplier;
  } catch (error) {
    if (error.isOperational) {
      throw error;
    }
    logger.error('Error fetching supplier', {
      error: error.message,
      supplierId,
    });
    throw error;
  }
}

/**
 * Create or update supplier
 */
async function upsertSupplier(data) {
  try {
    const supplierData = {
      name: data.name,
      apiUrl: data.apiUrl,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret || null,
      syncInterval: data.syncInterval || 3600,
      isActive: data.isActive !== undefined ? data.isActive : true,
      config: data.config || null,
    };

    if (data.id) {
      // Update existing supplier
      const supplier = await prisma.supplier.update({
        where: { id: data.id },
        data: supplierData,
      });

      logger.info('Supplier updated', {
        supplierId: supplier.id,
        supplierName: supplier.name,
      });

      return supplier;
    } else {
      // Create new supplier
      const supplier = await prisma.supplier.create({
        data: supplierData,
      });

      logger.info('Supplier created', {
        supplierId: supplier.id,
        supplierName: supplier.name,
      });

      return supplier;
    }
  } catch (error) {
    logger.error('Error upserting supplier', {
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Update supplier sync status
 */
async function updateSupplierSyncStatus(supplierId, status, error = null) {
  try {
    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        lastSyncAt: new Date(),
        lastSyncStatus: status,
      },
    });

    if (error) {
      logger.warn('Supplier sync status updated with error', {
        supplierId,
        status,
        error: error.message,
      });
    } else {
      logger.info('Supplier sync status updated', {
        supplierId,
        status,
      });
    }
  } catch (error) {
    logger.error('Error updating supplier sync status', {
      error: error.message,
      supplierId,
    });
    // Don't throw - this is a non-critical operation
  }
}

module.exports = {
  fetchSupplierInventory,
  mapSupplierItemToInventory,
  getActiveSuppliers,
  getSupplierById,
  upsertSupplier,
  updateSupplierSyncStatus,
};


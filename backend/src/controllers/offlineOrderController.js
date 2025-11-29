// [2025-11-08 06:56:10] Offline POD order controller
const path = require('path');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  getStageConfig,
  updateStageConfig,
  findStageByKey,
  getInitialStage
} = require('../services/offlineWorkflowService');
const { ensureOfflineUploadRoot } = require('../utils/offlineUpload');

const UPLOADS_PUBLIC_PREFIX = '/uploads';
ensureOfflineUploadRoot();

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    return ['true', '1', 'on', 'yes'].includes(value.toLowerCase());
  }
  return false;
};

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const safeJsonParse = (value) => {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const generateOrderCode = () => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `OFF-${datePart}-${randomPart}`;
};

const generateWorkOrderCode = () => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WO-${datePart}-${randomPart}`;
};

const buildAssetPayload = (file) => {
  const storageKey = path.join('offline-orders', file.filename).replace(/\\/g, '/');
  return {
    fileName: file.originalname,
    fileSize: file.size,
    contentType: file.mimetype,
    storageKey,
    url: `${UPLOADS_PUBLIC_PREFIX}/${storageKey}`
  };
};

const mapProductionWorkOrder = (workOrder) => {
  if (!workOrder) return null;
  return {
    id: workOrder.id,
    workOrderCode: workOrder.workOrderCode,
    status: workOrder.status,
    priority: workOrder.priority,
    startDate: workOrder.startDate,
    dueDate: workOrder.dueDate,
    completedDate: workOrder.completedDate,
    assignee: workOrder.assigneeName
      ? {
          id: workOrder.assigneeId,
          name: workOrder.assigneeName
        }
      : null,
    notes: workOrder.notes,
    metadata: workOrder.metadata,
    events: Array.isArray(workOrder.events)
      ? workOrder.events.map((event) => ({
          id: event.id,
          status: event.status,
          actorId: event.actorId,
          actorName: event.actorName,
          note: event.note,
          createdAt: event.createdAt
        }))
      : []
  };
};

const mapOrder = (order) => ({
  id: order.id,
  orderCode: order.orderCode,
  projectName: order.projectName,
  primaryProduct: order.primaryProduct,
  quantity: order.quantity,
  deliveryDate: order.deliveryDate,
  description: order.description,
  requiresMockups: order.requiresMockups,
  requiresProof: order.requiresProof,
  rushOrder: order.rushOrder,
  stage: {
    key: order.stageKey,
    label: order.stageLabel,
    position: order.stagePosition
  },
  status: order.status,
  contact: {
    name: order.contactName,
    company: order.company,
    email: order.email,
    phone: order.phone
  },
  configuration: order.configuration,
  metadata: order.metadata,
  assets: (order.assets || []).map((asset) => ({
    id: asset.id,
    fileName: asset.fileName,
    fileSize: asset.fileSize,
    contentType: asset.contentType,
    url: asset.url,
    uploadedAt: asset.uploadedAt,
    uploadedBy: asset.uploadedBy
  })),
  histories: (order.histories || []).map((history) => ({
    id: history.id,
    fromStageKey: history.fromStageKey,
    toStageKey: history.toStageKey,
    actorId: history.actorId,
    actorName: history.actorName,
    note: history.note,
    createdAt: history.createdAt
  })),
  productionWorkOrder: mapProductionWorkOrder(order.productionWorkOrder),
  createdAt: order.createdAt,
  updatedAt: order.updatedAt
});

/**
 * POST /api/offline-orders
 * Create offline POD order
 * [2025-11-08 06:56:10]
 */
exports.createOfflineOrder = async (req, res) => {
  try {
    // [2025-11-28 16:00:00] 添加详细日志用于调试
    logger.info('[offlineOrderController] Creating offline order...');
    logger.info('[offlineOrderController] Request body keys:', Object.keys(req.body || {}));
    logger.info('[offlineOrderController] Request body:', JSON.stringify(req.body, null, 2));
    logger.info('[offlineOrderController] Request files:', req.files ? `Files count: ${req.files.length}` : 'No files');
    logger.info('[offlineOrderController] Content-Type:', req.headers['content-type']);
    
    const {
      projectName,
      primaryProduct,
      quantity,
      deliveryDate,
      artworkNotes,
      company,
      contactName,
      email,
      phone,
      requiresMockups,
      requiresProof,
      rushOrder,
      configuration
    } = req.body;

    // [2025-11-28 16:00:00] 改进验证错误信息
    const missingFields = [];
    if (!projectName) missingFields.push('projectName');
    if (!contactName) missingFields.push('contactName');
    if (!email) missingFields.push('email');
    
    if (missingFields.length > 0) {
      logger.warn('[offlineOrderController] Validation failed. Missing fields:', missingFields);
      logger.warn('[offlineOrderController] Request body received:', {
        projectName: projectName || 'MISSING',
        contactName: contactName || 'MISSING',
        email: email || 'MISSING',
      });
      return res.status(400).json({
        error: 'Validation Error',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        missingFields,
      });
    }

    // [2025-01-28 19:20:00] 获取初始阶段，确保不为 undefined
    const initialStage = await getInitialStage();
    
    // [2025-01-28 19:20:00] 验证 initialStage 是否有效
    if (!initialStage || !initialStage.key || !initialStage.label) {
      logger.error('[offlineOrderController] Invalid initial stage:', initialStage);
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to get initial stage configuration. Please contact administrator.',
      });
    }

    const orderPayload = {
      orderCode: generateOrderCode(),
      projectName: projectName.trim(),
      primaryProduct: primaryProduct?.trim() || null,
      quantity: quantity ? parseInt(quantity, 10) || null : null,
      deliveryDate: parseDate(deliveryDate),
      description: artworkNotes?.trim() || null,
      requiresMockups: parseBoolean(requiresMockups),
      requiresProof: parseBoolean(requiresProof),
      rushOrder: parseBoolean(rushOrder),
      stageKey: initialStage.key,
      stageLabel: initialStage.label,
      stagePosition: initialStage.position ?? 0,
      status: 'ACTIVE',
      contactName: contactName.trim(),
      company: company?.trim() || null,
      email: email.trim(),
      phone: phone?.trim() || null,
      configuration: safeJsonParse(configuration) || {
        source: 'web-intake',
        artworkNotes: artworkNotes?.trim() || null
      },
      metadata: {
        submittedFrom: 'offline-pod-intake',
        userAgent: req.headers['user-agent'] || null,
        ip: req.ip || req.connection?.remoteAddress || null,
        submittedByUserId: req.user?.id || null
      }
    };

    const files = Array.isArray(req.files) ? req.files : [];
    const assetPayloads = files.map(buildAssetPayload);

    const order = await prisma.$transaction(async (tx) => {
      let uniqueCode = orderPayload.orderCode;
      let exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
      while (exists) {
        uniqueCode = generateOrderCode();
        exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
      }

      const createdOrder = await tx.offlineOrder.create({
        data: {
          ...orderPayload,
          orderCode: uniqueCode,
          assets: assetPayloads.length
            ? {
                create: assetPayloads.map((asset) => ({
                  fileName: asset.fileName,
                  fileSize: asset.fileSize,
                  contentType: asset.contentType,
                  storageKey: asset.storageKey,
                  url: asset.url,
                  uploadedBy: req.user?.id || null
                }))
              }
            : undefined,
          histories: {
            create: {
              fromStageKey: null,
              toStageKey: initialStage.key,
              actorId: req.user?.id || null,
              actorName: req.user
                ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
                : 'Customer',
              note: 'Order created via intake form'
            }
          }
        },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });

      return createdOrder;
    });

    res.status(201).json({
      success: true,
      order: mapOrder(order)
    });
  } catch (error) {
    // [2025-01-28 09:00:00] 增强错误日志，输出详细错误信息
    logger.error('[offlineOrderController] Failed to create offline order:', error);
    logger.error('[offlineOrderController] Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      name: error.name,
      stack: error.stack?.split('\n').slice(0, 10).join('\n'),
    });
    logger.error('[offlineOrderController] Request body:', JSON.stringify(req.body, null, 2));
    logger.error('[offlineOrderController] Request files:', req.files ? `Files count: ${req.files.length}` : 'No files');
    
    // [2025-11-28 16:00:00] 返回更详细的错误信息，帮助前端调试
    const errorResponse = {
      error: 'Server Error',
      message: 'Failed to create offline order',
    };
    
    // 在非生产环境或开发环境返回详细信息
    if (process.env.NODE_ENV !== 'production') {
      errorResponse.details = error.message;
      errorResponse.code = error.code;
      errorResponse.meta = error.meta;
      if (error.stack) {
        errorResponse.stack = error.stack.split('\n').slice(0, 5).join('\n');
      }
    }
    
    // 对于已知的错误类型，始终返回详细信息
    if (error.code === 'P2002') {
      errorResponse.message = 'Duplicate order code. Please try again.';
      errorResponse.details = error.meta?.target || error.message;
    } else if (error.code === 'P2003') {
      errorResponse.message = 'Invalid reference. Please check your data.';
      errorResponse.details = error.meta?.field_name || error.message;
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * GET /api/admin/offline-orders
 * [2025-11-08 06:56:10]
 */
exports.listOfflineOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);
    const skip = (page - 1) * limit;

    const stageFilter = req.query.stageKey ? req.query.stageKey.toString() : null;
    const statusFilter = req.query.status ? req.query.status.toString().toUpperCase() : null;
    const rushFilter = req.query.rush === 'true' ? true : req.query.rush === 'false' ? false : null;
    const search = req.query.search?.toString().trim();

    const where = {
      AND: []
    };

    if (stageFilter) {
      where.AND.push({ stageKey: stageFilter });
    }

    if (statusFilter && ['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(statusFilter)) {
      where.AND.push({ status: statusFilter });
    }

    if (rushFilter !== null) {
      where.AND.push({ rushOrder: rushFilter });
    }

    if (search) {
      where.AND.push({
        OR: [
          { projectName: { contains: search, mode: 'insensitive' } },
          { orderCode: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } }
        ]
      });
    }

    const [orders, total, stages] = await Promise.all([
      prisma.offlineOrder.findMany({
        where: where.AND.length ? where : undefined,
        skip,
        take: limit,
        orderBy: [
          { stagePosition: 'asc' },
          { createdAt: 'asc' }
        ],
        include: {
          assets: {
            orderBy: { uploadedAt: 'asc' },
            take: 1
          },
          productionWorkOrder: true
        }
      }),
      prisma.offlineOrder.count({
        where: where.AND.length ? where : undefined
      }),
      getStageConfig()
    ]);

    res.json({
      success: true,
      orders: orders.map((order) =>
        mapOrder({
          ...order,
          histories: []
        })
      ),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stages
    });
  } catch (error) {
    logger.error('Failed to list offline orders', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to list offline orders'
    });
  }
};

/**
 * GET /api/admin/offline-orders/metrics/summary
 * [2025-11-08 06:56:10]
 */
exports.getOfflineOrderMetrics = async (req, res) => {
  try {
    const [stageCounts, statusCounts, rushCount, totalCount, stages] = await Promise.all([
      prisma.offlineOrder.groupBy({
        by: ['stageKey', 'stageLabel'],
        _count: { _all: true }
      }),
      prisma.offlineOrder.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.offlineOrder.count({
        where: { rushOrder: true, status: 'ACTIVE' }
      }),
      prisma.offlineOrder.count(),
      getStageConfig()
    ]);

    const stageCountMap = stageCounts.reduce((acc, item) => {
      acc[item.stageKey] = {
        count: item._count._all,
        label: item.stageLabel
      };
      return acc;
    }, {});

    const statusMap = statusCounts.reduce((acc, item) => {
      acc[item.status] = item._count._all;
      return acc;
    }, {});

    res.json({
      success: true,
      summary: {
        total: totalCount,
        active: statusMap.ACTIVE || 0,
        completed: statusMap.COMPLETED || 0,
        cancelled: statusMap.CANCELLED || 0,
        rushActive: rushCount
      },
      stages: stages.map((stage) => ({
        key: stage.key,
        label: stage.label,
        description: stage.description,
        count: stageCountMap[stage.key]?.count || 0
      }))
    });
  } catch (error) {
    logger.error('Failed to fetch offline order metrics', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch metrics'
    });
  }
};

/**
 * GET /api/admin/offline-orders/:id
 * [2025-11-08 06:56:10]
 */
exports.getOfflineOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    const order = await prisma.offlineOrder.findUnique({
      where: { id },
      include: {
        assets: {
          orderBy: { uploadedAt: 'desc' }
        },
        histories: {
          orderBy: { createdAt: 'desc' }
        },
        productionWorkOrder: {
          include: {
            events: {
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.json({
      success: true,
      order: mapOrder(order)
    });
  } catch (error) {
    logger.error('Failed to fetch offline order detail', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch offline order detail'
    });
  }
};

/**
 * PATCH /api/admin/offline-orders/:id/stage
 * [2025-11-08 06:56:10]
 */
exports.updateOfflineOrderStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { stageKey, note, position } = req.body;

    if (!stageKey) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'stageKey is required'
      });
    }

    const stage = await findStageByKey(stageKey);
    if (!stage) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid stage key'
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const parsedPosition =
      position !== undefined && position !== null && !Number.isNaN(Number(position))
        ? parseInt(position, 10)
        : null;

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: { stageKey: true }
      });

      if (!existing) {
        return null;
      }

      const order = await tx.offlineOrder.update({
        where: { id },
        data: {
          stageKey: stage.key,
          stageLabel: stage.label,
          stagePosition: parsedPosition ?? stage.position ?? null,
          histories: {
            create: {
              fromStageKey: existing.stageKey,
              toStageKey: stage.key,
              actorId: req.user?.id || null,
              actorName,
              note: note?.toString().trim() || null
            }
          }
        },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });

      return order;
    });

    if (!updatedOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.json({
      success: true,
      order: mapOrder(updatedOrder)
    });
  } catch (error) {
    logger.error('Failed to update offline order stage', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update offline order stage'
    });
  }
};

/**
 * PATCH /api/admin/offline-orders/:id
 * [2025-11-08 06:56:10]
 */
exports.updateOfflineOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      projectName,
      primaryProduct,
      quantity,
      deliveryDate,
      description,
      requiresMockups,
      requiresProof,
      rushOrder,
      contactName,
      company,
      email,
      phone,
      status,
      configuration,
      metadata,
      note
    } = req.body;

    const data = {};
    if (projectName !== undefined) data.projectName = projectName?.trim() || null;
    if (primaryProduct !== undefined) data.primaryProduct = primaryProduct?.trim() || null;
    if (quantity !== undefined) data.quantity = quantity ? parseInt(quantity, 10) || null : null;
    if (deliveryDate !== undefined) data.deliveryDate = parseDate(deliveryDate);
    if (description !== undefined) data.description = description?.trim() || null;
    if (requiresMockups !== undefined) data.requiresMockups = parseBoolean(requiresMockups);
    if (requiresProof !== undefined) data.requiresProof = parseBoolean(requiresProof);
    if (rushOrder !== undefined) data.rushOrder = parseBoolean(rushOrder);
    if (contactName !== undefined) {
      const trimmedName = contactName?.toString().trim();
      if (!trimmedName) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'contactName cannot be empty'
        });
      }
      data.contactName = trimmedName;
    }
    if (company !== undefined) data.company = company?.trim() || null;
    if (email !== undefined) {
      const trimmedEmail = email?.toString().trim();
      if (!trimmedEmail) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'email cannot be empty'
        });
      }
      data.email = trimmedEmail;
    }
    if (phone !== undefined) data.phone = phone?.trim() || null;
    if (configuration !== undefined) data.configuration = safeJsonParse(configuration) || configuration || null;
    if (metadata !== undefined) data.metadata = safeJsonParse(metadata) || metadata || null;

    if (status !== undefined) {
      const normalizedStatus = status?.toString().toUpperCase();
      if (!['ACTIVE', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid status value'
        });
      }
      data.status = normalizedStatus;
    }

    if (!Object.keys(data).length && !note) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'No valid fields to update'
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: {
          id: true,
          stageKey: true
        }
      });

      if (!existing) {
        return null;
      }

      const order = await tx.offlineOrder.update({
        where: { id },
        data: {
          ...data,
          histories: note
            ? {
                create: {
                  fromStageKey: existing.stageKey,
                  toStageKey: existing.stageKey,
                  actorId: req.user?.id || null,
                  actorName,
                  note: note?.toString().trim() || null
                }
              }
            : undefined
        },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });

      return order;
    });

    if (!updatedOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.json({
      success: true,
      order: mapOrder(updatedOrder)
    });
  } catch (error) {
    logger.error('Failed to update offline order', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update offline order'
    });
  }
};

/**
 * POST /api/admin/offline-orders/:id/notes
 * Append internal note without mutating other fields
 */
exports.addOfflineOrderNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { note } = req.body;

    const trimmedNote = note?.toString().trim();
    if (!trimmedNote) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'note is required'
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: { id: true, stageKey: true }
      });

      if (!existing) {
        return null;
      }

      await tx.offlineOrderStageHistory.create({
        data: {
          orderId: existing.id,
          fromStageKey: existing.stageKey,
          toStageKey: existing.stageKey,
          actorId: req.user?.id || null,
          actorName,
          note: trimmedNote
        }
      });

      return tx.offlineOrder.findUnique({
        where: { id },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });
    });

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.json({
      success: true,
      order: mapOrder(order)
    });
  } catch (error) {
    logger.error('Failed to append offline order note', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to append note'
    });
  }
};

/**
 * POST /api/admin/offline-orders/:id/assets
 * Upload additional assets from admin workflow
 */
exports.uploadOfflineOrderAssets = async (req, res) => {
  try {
    const { id } = req.params;
    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'At least one file is required'
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const order = await prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: { id: true, stageKey: true }
      });

      if (!existing) {
        return null;
      }

      const assetPayloads = files.map(buildAssetPayload);

      await tx.offlineOrder.update({
        where: { id },
        data: {
          assets: {
            create: assetPayloads.map((asset) => ({
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              contentType: asset.contentType,
              storageKey: asset.storageKey,
              url: asset.url,
              uploadedBy: req.user?.id || null
            }))
          },
          histories: {
            create: {
              fromStageKey: existing.stageKey,
              toStageKey: existing.stageKey,
              actorId: req.user?.id || null,
              actorName,
              note: `Uploaded ${assetPayloads.length} new asset${assetPayloads.length > 1 ? 's' : ''}`
            }
          }
        }
      });

      return tx.offlineOrder.findUnique({
        where: { id },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });
    });

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.status(201).json({
      success: true,
      order: mapOrder(order)
    });
  } catch (error) {
    logger.error('Failed to upload offline order assets', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to upload assets'
    });
  }
};

/**
 * POST /api/admin/offline-orders/:id/production
 * Create or update production work order linked to offline order
 */
exports.createOrUpdateProductionWorkOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      status,
      priority,
      startDate,
      dueDate,
      completedDate,
      assigneeId,
      assigneeName,
      notes,
      metadata,
      eventNote
    } = req.body;

    const normalizedStatus = status?.toString()?.toUpperCase();
    const allowedStatuses = [
      'PLANNING',
      'SCHEDULED',
      'IN_PROGRESS',
      'QUALITY_CONTROL',
      'SHIPPING',
      'COMPLETED',
      'CANCELLED'
    ];

    if (normalizedStatus && !allowedStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid production status value'
      });
    }

    const parsedPriority =
      priority === undefined || priority === null || Number.isNaN(Number(priority))
        ? undefined
        : parseInt(priority, 10);

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const order = await prisma.$transaction(async (tx) => {
      const existingOrder = await tx.offlineOrder.findUnique({
        where: { id },
        include: {
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });

      if (!existingOrder) {
        return null;
      }

      const baseWorkOrderData = {};
      if (normalizedStatus) baseWorkOrderData.status = normalizedStatus;
      if (parsedPriority !== undefined) baseWorkOrderData.priority = parsedPriority;
      if (startDate !== undefined) baseWorkOrderData.startDate = parseDate(startDate);
      if (dueDate !== undefined) baseWorkOrderData.dueDate = parseDate(dueDate);
      if (completedDate !== undefined) baseWorkOrderData.completedDate = parseDate(completedDate);
      if (assigneeId !== undefined) baseWorkOrderData.assigneeId = assigneeId?.toString().trim() || null;
      if (assigneeName !== undefined)
        baseWorkOrderData.assigneeName = assigneeName?.toString().trim() || null;
      if (notes !== undefined) baseWorkOrderData.notes = notes?.toString().trim() || null;
      if (metadata !== undefined) baseWorkOrderData.metadata = safeJsonParse(metadata) || metadata || null;

      const eventEntries = [];
      const createEvent = (statusValue, noteValue) => ({
        status: statusValue || (existingOrder.productionWorkOrder?.status ?? 'PLANNING'),
        actorId: req.user?.id || null,
        actorName,
        note: noteValue?.toString().trim() || null
      });

      if (normalizedStatus && normalizedStatus !== existingOrder.productionWorkOrder?.status) {
        eventEntries.push(createEvent(normalizedStatus, eventNote));
      } else if (eventNote) {
        eventEntries.push(createEvent(normalizedStatus, eventNote));
      }

      let workOrder;
      if (!existingOrder.productionWorkOrder) {
        let workOrderCode = generateWorkOrderCode();
        let collision = await tx.productionWorkOrder.findUnique({
          where: { workOrderCode }
        });
        while (collision) {
          workOrderCode = generateWorkOrderCode();
          collision = await tx.productionWorkOrder.findUnique({
            where: { workOrderCode }
          });
        }

        workOrder = await tx.productionWorkOrder.create({
          data: {
            workOrderCode,
            offlineOrderId: id,
            status: baseWorkOrderData.status || 'PLANNING',
            priority: baseWorkOrderData.priority ?? 0,
            startDate: baseWorkOrderData.startDate || null,
            dueDate: baseWorkOrderData.dueDate || null,
            completedDate: baseWorkOrderData.completedDate || null,
            assigneeId: baseWorkOrderData.assigneeId || null,
            assigneeName: baseWorkOrderData.assigneeName || null,
            notes: baseWorkOrderData.notes || null,
            metadata: baseWorkOrderData.metadata || null,
            events: {
              create: eventEntries.length
                ? eventEntries
                : [
                    {
                      status: baseWorkOrderData.status || 'PLANNING',
                      actorId: req.user?.id || null,
                      actorName,
                      note: eventNote?.toString().trim() || 'Production work order created'
                    }
                  ]
            }
          },
          include: {
            events: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      } else {
        workOrder = await tx.productionWorkOrder.update({
          where: { id: existingOrder.productionWorkOrder.id },
          data: {
            ...baseWorkOrderData,
            events: eventEntries.length
              ? {
                  create: eventEntries
                }
              : undefined
          },
          include: {
            events: {
              orderBy: { createdAt: 'desc' }
            }
          }
        });
      }

      return tx.offlineOrder.findUnique({
        where: { id },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' }
              }
            }
          }
        }
      });
    });

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    res.status(200).json({
      success: true,
      order: mapOrder(order)
    });
  } catch (error) {
    logger.error('Failed to create or update production work order', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to process production work order'
    });
  }
};

/**
 * GET /api/admin/offline-orders/config/stages
 * [2025-11-08 06:56:10]
 */
exports.getOfflineWorkflowStages = async (req, res) => {
  try {
    const stages = await getStageConfig();
    res.json({
      success: true,
      stages
    });
  } catch (error) {
    logger.error('Failed to fetch workflow stages', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to fetch workflow stages'
    });
  }
};

/**
 * PUT /api/admin/offline-orders/config/stages
 * [2025-11-08 06:56:10]
 */
exports.updateOfflineWorkflowStages = async (req, res) => {
  try {
    const { stages } = req.body;

    if (!Array.isArray(stages) || !stages.length) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'stages array is required'
      });
    }

    const updatedStages = await updateStageConfig(stages, req.user?.id || null);

    await prisma.$transaction(
      updatedStages.map((stage, index) =>
        prisma.offlineOrder.updateMany({
          where: { stageKey: stage.key },
          data: {
            stageLabel: stage.label,
            stagePosition: stage.position ?? index
          }
        })
      )
    );

    res.json({
      success: true,
      stages: updatedStages
    });
  } catch (error) {
    logger.error('Failed to update workflow stages', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update workflow stages'
    });
  }
};


// [2025-11-08 06:56:10] Offline POD order controller
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  getStageConfig,
  updateStageConfig,
  findStageByKey,
  getInitialStage
} = require('../services/offlineWorkflowService');

const UPLOADS_PUBLIC_PREFIX = '/uploads';
const OFFLINE_UPLOAD_DIR = path.join(__dirname, '../../uploads/offline-orders');

if (!fs.existsSync(OFFLINE_UPLOAD_DIR)) {
  fs.mkdirSync(OFFLINE_UPLOAD_DIR, { recursive: true });
}

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

    if (!projectName || !contactName || !email) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'projectName, contactName, and email are required'
      });
    }

    const initialStage = await getInitialStage();

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
      stagePosition: 0,
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
    logger.error('Failed to create offline order', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to create offline order'
    });
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
          }
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
          stagePosition: parsedPosition,
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
      updatedStages.map((stage) =>
        prisma.offlineOrder.updateMany({
          where: { stageKey: stage.key },
          data: { stageLabel: stage.label }
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


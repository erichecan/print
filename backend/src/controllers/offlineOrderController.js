// Offline POD order controller
// Enhanced with unified error handling
const path = require('path');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  getStageConfig,
  updateStageConfig,
  findStageByKey,
  getInitialStage
} = require('../services/offlineWorkflowService');
const { uploadBufferToGcs } = require('../utils/gcsStorage');
const { InternalServerError } = require('../utils/errors');


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

/**
 * 生成订单编号
* 修改规则：最后6位 = 前3位流水号（001开始递增）+ 后3位随机字母
 * @param {Object} tx - Prisma transaction 对象（可选）
 * @returns {Promise<string>} 订单编号
 */
const generateOrderCode = async (tx = null) => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');

  // 获取当天的最大流水号
  const prismaClient = tx || prisma;
  const todayStart = new Date(timestamp);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(timestamp);
  todayEnd.setHours(23, 59, 59, 999);

  // 查询当天所有订单编号，提取流水号
  const todayOrders = await prismaClient.offlineOrder.findMany({
    where: {
      orderCode: {
        startsWith: `OFF-${datePart}-`
      },
      createdAt: {
        gte: todayStart,
        lte: todayEnd
      }
    },
    select: {
      orderCode: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  // 提取流水号并找到最大值
  let maxSequence = 0;
  todayOrders.forEach(order => {
    // 订单编号格式：OFF-YYYYMMDD-XXXXXX
    // 提取最后6位，前3位是流水号
    const suffix = order.orderCode.split('-').pop() || '';
    if (suffix.length >= 3) {
      const sequenceStr = suffix.substring(0, 3);
      const sequence = parseInt(sequenceStr, 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });

  // 递增流水号（从001开始）
  const nextSequence = maxSequence + 1;
  const sequencePart = String(nextSequence).padStart(3, '0');

  // 生成3位随机字母
  const generateRandomLetters = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 3; i++) {
      result += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return result;
  };
  const randomPart = generateRandomLetters();

  return `OFF-${datePart}-${sequencePart}${randomPart}`;
};

const generateWorkOrderCode = () => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WO-${datePart}-${randomPart}`;
};

const processAssetUpload = async (file) => {
  const timestamp = Date.now();
  const safeName = file.originalname.replace(/[^a-z0-9.\-_]+/gi, '_');
  const filename = `${timestamp}-${safeName}`;
  const storageKey = `offline-orders/${filename}`;

  // Upload to GCS
  const url = await uploadBufferToGcs(file.buffer, storageKey, {
    contentType: file.mimetype
  });

  return {
    fileName: file.originalname,
    fileSize: file.size,
    contentType: file.mimetype,
    storageKey,
    url
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
 */
exports.createOfflineOrder = async (req, res) => {
  try {
    // 添加详细日志用于调试
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
      configuration,
      orderNotes, // PRD v2.0: 支持从orderNotes字段获取
      dstFileFee,
      paymentMethod,
      referenceNumber
    } = req.body;

    // PRD v2.0: 解析configuration以获取orderNotes（如果projectName不存在）
    const configData = safeJsonParse(configuration);

    // PRD v2.0: projectName现在是可选字段，如果不存在则从orderNotes或configuration中提取
    // 优先级：projectName > orderNotes > configuration.orderNotes > 订单编号（默认值）
    let finalProjectName = projectName?.trim() || null;
    if (!finalProjectName) {
      finalProjectName = orderNotes?.trim() ||
        configData?.orderNotes?.trim() ||
        null;
    }

    // PRD v2.0: 如果仍然没有projectName，使用订单编号作为默认值（在生成订单编号后设置）
    // 这里先设置为null，稍后在生成订单编号后设置默认值

    // PRD v2.0: 移除所有必填验证，所有字段都改为可选
    // 修复：移除 contactName 和 email 的必填验证，与前端保持一致
    // 只保留邮箱格式验证（如果提供了邮箱）
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        logger.warn('[offlineOrderController] Invalid email format:', email);
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid email format',
          field: 'email',
        });
      }
    }

    // 获取初始阶段，确保不为 undefined
    const initialStage = await getInitialStage();

    // 验证 initialStage 是否有效
    if (!initialStage || !initialStage.key || !initialStage.label) {
      logger.error('[offlineOrderController] Invalid initial stage:', initialStage);
      return res.status(500).json({
        error: 'Server Error',
        message: 'Failed to get initial stage configuration. Please contact administrator.',
      });
    }

    // PRD v2.0: 生成订单编号，如果projectName仍然为空，使用订单编号作为默认值
    // 注意：订单编号在事务中生成，这里先不生成
    let generatedOrderCode = null;

    const orderPayload = {
      orderCode: '', // 订单编号在事务中生成，这里先留空
      projectName: finalProjectName, // 使用处理后的projectName（可能来自orderNotes或订单编号）
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
      // 修复：contactName 和 email 改为可选字段，使用默认值或null
      contactName: contactName?.trim() || '未提供',
      company: company?.trim() || null,
      email: email?.trim() || null,
      phone: phone?.trim() || null,
      configuration: configData || {
        source: 'web-intake',
        artworkNotes: artworkNotes?.trim() || null,
        orderNotes: orderNotes?.trim() || null // PRD v2.0: 包含orderNotes到configuration
      },
      metadata: {
        ip: req.ip || req.connection?.remoteAddress || null,
        submittedByUserId: req.user?.id || null
      },
      // PRD v2.0: 显式保存新字段
      dst_file_fee: dstFileFee ? parseFloat(dstFileFee) : null,
      order_notes: orderNotes?.trim() || null,
      payment_method: paymentMethod?.trim() || null,
      reference_number: referenceNumber?.trim() || null
    };

    const files = Array.isArray(req.files) ? req.files : [];

    // Upload files to GCS
    const assetPayloads = await Promise.all(files.map(processAssetUpload));

    const order = await prisma.$transaction(async (tx) => {
      // 在事务中生成订单编号（使用流水号）
      let uniqueCode = await generateOrderCode(tx);
      let exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
      // 如果发生冲突（理论上不应该发生），重新生成
      let retryCount = 0;
      while (exists && retryCount < 10) {
        uniqueCode = await generateOrderCode(tx);
        exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
        retryCount++;
      }

      if (exists) {
        throw new Error('Failed to generate unique order code after multiple retries');
      }

      // 如果projectName仍然为空，使用订单编号作为默认值
      if (!finalProjectName) {
        finalProjectName = uniqueCode;
        logger.info('[offlineOrderController] projectName not provided, using orderCode as default:', finalProjectName);
      }

      const createdOrder = await tx.offlineOrder.create({
        data: {
          ...orderPayload,
          orderCode: uniqueCode,
          projectName: finalProjectName, // 使用处理后的projectName
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
    // 增强错误日志，输出详细错误信息
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

    // 返回更详细的错误信息，帮助前端调试
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
 */
exports.listOfflineOrders = async (req, res, next) => {
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
    next(new InternalServerError('无法获取线下订单列表，请稍后重试'));
  }
};

/**
 * GET /api/admin/offline-orders/metrics/summary
 */
exports.getOfflineOrderMetrics = async (req, res, next) => {
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
    // 修复：contactName 和 email 改为可选字段，允许为空或null
    if (contactName !== undefined) {
      const trimmedName = contactName?.toString().trim();
      data.contactName = trimmedName || null;
    }
    if (company !== undefined) data.company = company?.trim() || null;
    if (email !== undefined) {
      const trimmedEmail = email?.toString().trim();
      // 如果提供了邮箱，验证格式；如果为空，允许设置为null
      if (trimmedEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'Invalid email format',
            field: 'email',
          });
        }
        data.email = trimmedEmail;
      } else {
        data.email = null;
      }
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
            stageLabel: stage.labelZh || stage.labelEn || stage.label, // Use localized label as primary
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

/**
 * GET /api/offline-orders/config
* PRD v2.0: 获取订单创建所需的所有配置数据
* 重构：使用snake_case模型和字段名
 * 返回：产品列表、颜色列表、尺码费用配置、可用性配置等
 */
exports.getOrderConfig = async (req, res, next) => {
  try {
    let products = [];
    let colors = [];
    let sizeFees = [];
    let availability = [];

    // 调试：检查 Prisma Client 状态
    logger.info('[getOrderConfig] Starting getOrderConfig...');
    logger.info('[getOrderConfig] Prisma available:', !!prisma);
    if (prisma) {
      logger.info('[getOrderConfig] Prisma models:', Object.keys(prisma).filter(k => !k.startsWith('$') && !k.startsWith('_')).slice(0, 10));
      logger.info('[getOrderConfig] offline_order_products available:', !!(prisma.offline_order_products));
      logger.info('[getOrderConfig] offline_order_colors available:', !!(prisma.offline_order_colors));
    }

    // 尝试获取产品列表（仅返回激活的产品）
    try {
      logger.info('[getOrderConfig] Querying offline_order_products...');
      // 检查 prisma 对象是否可用
      if (!prisma) {
        logger.error('[getOrderConfig] prisma is null or undefined');
        throw new Error('Prisma Client is not available');
      }
      if (!prisma.offline_order_products) {
        logger.error('[getOrderConfig] prisma.offline_order_products is not available');
        logger.error('[getOrderConfig] Available models:', Object.keys(prisma).filter(k => k.includes('order') || k.includes('offline')).join(', '));
        throw new Error('Prisma Client model offline_order_products is not available');
      }
      products = await prisma.offline_order_products.findMany({
        where: {
          is_active: true,
        },
        orderBy: [
          { display_order: 'asc' },
          { name: 'asc' },
        ],
      });
      logger.info(`[getOrderConfig] Found ${products.length} active products`);
    } catch (error) {
      logger.error('[getOrderConfig] Error querying offline_order_products:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        prismaAvailable: !!prisma,
        modelAvailable: !!(prisma && prisma.offline_order_products),
      });
      products = [];
    }

    // 尝试获取颜色列表
    try {
      logger.info('[getOrderConfig] Querying offline_order_colors...');
      // 检查 prisma 对象是否可用
      if (!prisma || !prisma.offline_order_colors) {
        logger.error('[getOrderConfig] prisma.offline_order_colors is not available');
        throw new Error('Prisma Client model offline_order_colors is not available');
      }
      colors = await prisma.offline_order_colors.findMany({
        orderBy: { name: 'asc' },
      });
      logger.info(`[getOrderConfig] Found ${colors.length} colors`);
    } catch (error) {
      logger.error('[getOrderConfig] Error querying offline_order_colors:', {
        message: error.message,
        stack: error.stack,
        name: error.name,
        prismaAvailable: !!prisma,
        modelAvailable: !!(prisma && prisma.offline_order_colors),
      });
      colors = [];
    }

    // 尝试获取尺码费用配置
    try {
      sizeFees = await prisma.offline_order_size_fees.findMany({
        orderBy: { size: 'asc' },
      });
    } catch (error) {
      logger.warn('[getOrderConfig] offline_order_size_fees table not found, returning default values');
      // 返回默认值
      sizeFees = [
        { size: '2XL', additional_fee: 2.50 },
        { size: '3XL', additional_fee: 3.50 },
        { size: '4XL', additional_fee: 4.50 },
        { size: '5XL', additional_fee: 5.50 },
      ];
    }

    // 尝试获取可用性配置
    try {
      availability = await prisma.offline_order_product_color_sizes.findMany({
        where: { is_available: true },
      });
    } catch (error) {
      logger.warn('[getOrderConfig] offline_order_product_color_sizes table not found, returning empty array');
    }

    // 构建响应数据（转换为camelCase以匹配前端期望）
    const config = {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        imageUrl: p.image_url,
        isCustomerOwned: p.is_customer_owned,
      })),
      colors: colors.map(c => ({
        id: c.id,
        name: c.name,
        hexCode: c.hex_code,
      })),
      sizeFees: sizeFees.map(sf => ({
        size: sf.size,
        additionalFee: typeof sf.additional_fee === 'number' ? sf.additional_fee : Number(sf.additional_fee),
      })),
      availability: availability.map(a => ({
        productId: a.product_id,
        colorId: a.color_id,
        size: a.size,
        available: a.is_available,
      })),
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    logger.error('[getOrderConfig] Error fetching order config:', error);
    next(new InternalServerError('Failed to fetch order configuration'));
  }
};

/**
 * DELETE /api/admin/offline-orders/:id
* 删除线下订单
* 修复：使用事务手动删除关联数据，确保删除顺序正确
 */
exports.deleteOfflineOrder = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 检查订单是否存在
    const existing = await prisma.offlineOrder.findUnique({
      where: { id },
      select: {
        id: true,
        orderCode: true,
        productionWorkOrder: {
          select: { id: true }
        }
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '订单不存在',
      });
    }

    // 直接删除订单，依赖数据库的级联删除（Cascade Delete）处理关联数据
    await prisma.offlineOrder.delete({
      where: { id },
    });

    logger.info(`[deleteOfflineOrder] Order deleted: ${existing.orderCode} (${id})`);

    res.json({
      success: true,
      message: '订单已删除',
    });
  } catch (error) {
    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '订单不存在',
      });
    }
    // 增强错误日志，输出详细错误信息
    logger.error('[deleteOfflineOrder] Error deleting order:', {
      orderId: id,
      error: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    });
    next(new InternalServerError(`删除订单失败: ${error.message}`));
  }
};


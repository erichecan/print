// Offline POD order controller
// Enhanced with unified error handling
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
const { uploadBufferToGcs } = require('../utils/gcsStorage');
const { ensureOfflineUploadRoot } = require('../utils/offlineUpload');
const { InternalServerError } = require('../utils/errors');
const settingService = require('../services/settingService');


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
 * [2026-03-13 05:10:00] 计算线下订单成本快照（pricing.costTotal）
 * 成本定义：
 * - 基础成本：Σ(产品 unit_cost × 件数)
 * - 大码附加成本：Σ(大码附加费 additional_fee × 件数)
 * - 不包含：DST File Fee / Rush Fee / 印刷费用
 *
 * 数据来源：
 * - 配置中的 productItems/colors/sizes 结构
 * - DB 表 offline_order_products.unit_cost
 * - DB 表 offline_order_size_fees.additional_fee
 */
const computeCostTotalFromConfig = async (config) => {
  try {
    if (!config || !Array.isArray(config.productItems) || config.productItems.length === 0) {
      return 0;
    }

    const productIds = Array.from(
      new Set(
        config.productItems
          .map((item) => item && item.productId)
          .filter((id) => typeof id === 'string' && id.trim() !== ''),
      ),
    );

    if (productIds.length === 0) {
      return 0;
    }

    // 批量读取产品成本
    const products = await prisma.offline_order_products.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        unit_cost: true,
      },
    });
    const productCostMap = new Map(
      products.map((p) => [p.id, Number(p.unit_cost || 0)]),
    );

    // 读取大码附加费：优先使用配置中存储的 sizeFees（若有），否则从 DB 查询
    let sizeFees = Array.isArray(config.sizeFees) ? config.sizeFees : null;
    if (!sizeFees) {
      try {
        sizeFees = await prisma.offline_order_size_fees.findMany({
          where: { is_active: true },
        });
      } catch (dbError) {
        logger.warn('[offlineOrderController] Failed to fetch size fees for cost calc, defaulting to 0:', dbError.message);
        sizeFees = [];
      }
    }

    const sizeFeeMap = (sizeFees || []).reduce((acc, fee) => {
      const key = (fee.size || fee.sizeKey || '').toString().toUpperCase();
      if (!key) return acc;
      const value = fee.additional_fee != null ? fee.additional_fee : fee.additionalFee;
      acc[key] = Number(value || 0);
      return acc;
    }, {});

    let total = 0;

    for (const item of config.productItems) {
      if (!item) continue;
      const productId = item.productId;
      const baseCost = productCostMap.get(productId) || 0;

      const colors = Array.isArray(item.colors) ? item.colors : [];
      for (const color of colors) {
        const sizes = Array.isArray(color.sizes) ? color.sizes : [];
        for (const sz of sizes) {
          const qty = Number(sz?.quantity || 0);
          if (!qty) continue;
          const sizeKey = (sz.size || sz.sizeKey || '').toString().toUpperCase();
          const additional = sizeKey ? (sizeFeeMap[sizeKey] || 0) : 0;
          total += (baseCost + additional) * qty;
        }
      }
    }

    const normalized = Number(total.toFixed(2));
    return Number.isNaN(normalized) ? 0 : normalized;
  } catch (error) {
    logger.warn('[offlineOrderController] computeCostTotalFromConfig failed, skipping cost snapshot:', {
      message: error.message,
    });
    return 0;
  }
};

/**
 * 生成订单编号
 * 修改规则：最后6位 = 前3位流水号（001开始递增）+ 后3位随机字母
 * @param {Object} tx - Prisma transaction 对象（可选）
 * @param {Date} date - 订单日期（可选，默认为当前时间）
 * @returns {Promise<string>} 订单编号
 */
const generateOrderCode = async (tx = null, date = null) => {
  const timestamp = date || new Date(); // Use provided date or current time
  // YYMMDD 格式 (e.g., 2026-01-08 -> 260108)
  const fullDate = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const datePart = fullDate.substring(2);

  // 获取当天的最大流水号
  const prismaClient = tx || prisma;
  const todayStart = new Date(timestamp);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(timestamp);
  todayEnd.setHours(23, 59, 59, 999);

  // 查询当天所有订单编号，提取流水号
  // 同时兼容旧格式 OFF-YYYYMMDD- 和新格式 OFF-YYMMDD-
  const todayOrders = await prismaClient.offlineOrder.findMany({
    where: {
      OR: [
        { orderCode: { startsWith: `OFF-${datePart}-` } },
        { orderCode: { startsWith: `OFF-${fullDate}-` } }
      ],
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
    // 订单编号格式：OFF-YYYYMMDD-XXXXXX 或 OFF-YYMMDD-XX
    const parts = order.orderCode.split('-');
    const suffix = parts.pop() || '';

    // 对于旧格式 OFF-YYYYMMDD-001ABC，提取前3位作为序号
    // 对于新格式 OFF-YYMMDD-01，直接提取全部作为序号
    let sequenceStr = '';
    if (parts[1] && parts[1].length === 8) {
      // 旧格式 YYYYMMDD
      sequenceStr = suffix.substring(0, 3);
    } else {
      // 新格式 YYMMDD
      sequenceStr = suffix;
    }

    const sequence = parseInt(sequenceStr, 10);
    if (!isNaN(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  });

  // 递增流水号（从01开始）
  const nextSequence = maxSequence + 1;
  const sequencePart = String(nextSequence).padStart(2, '0');

  return `OFF-${datePart}-${sequencePart}`;
};

const generateWorkOrderCode = () => {
  const timestamp = new Date();
  const datePart = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 7).toUpperCase();
  return `WO-${datePart}-${randomPart}`;
};

/**
 * 上传单个文件到 GCS，返回 asset 载荷。若 GCS 未配置或失败则抛出，由调用方统一处理。
 */
const processAssetUpload = async (file) => {
  const timestamp = Date.now();
  const safeName = (file.originalname || 'file').replace(/[^a-z0-9.\-_]+/gi, '_');
  const filename = `${timestamp}-${safeName}`;
  const storageKey = `offline-orders/${filename}`;

  if (!file.buffer) {
    throw new Error('File buffer is missing. Use multer.memoryStorage() for uploads.');
  }

  let url;

  // 优先尝试上传到 GCS，失败则自动回退到本地磁盘存储，避免前端 400 Upload Error
  try {
    if (process.env.GCP_IMAGE_BUCKET) {
      url = await uploadBufferToGcs(file.buffer, storageKey, {
        contentType: file.mimetype || 'application/octet-stream',
      });
    } else {
      throw new Error('GCP_IMAGE_BUCKET is not configured');
    }
  } catch (gcsError) {
    logger.warn('[offlineOrderController] GCS upload failed, falling back to local storage.', {
      message: gcsError.message,
    });
    const root = ensureOfflineUploadRoot();
    const localPath = path.join(root, filename);
    await fs.promises.writeFile(localPath, file.buffer);
    url = `/uploads/offline-orders/${filename}`;
  }

  return {
    fileName: file.originalname || filename,
    fileSize: file.size || 0,
    contentType: file.mimetype || 'application/octet-stream',
    storageKey,
    url,
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
  rushFee: order.rush_fee ? parseFloat(order.rush_fee) : 0,
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
  payment: {
    method: order.payment_method,
    referenceNumber: order.reference_number,
    depositAmount: order.deposit_amount ? parseFloat(order.deposit_amount) : 0,
    dstFileFee: order.dst_file_fee ? parseFloat(order.dst_file_fee) : 0,
  },
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
    logger.info('[offlineOrderController] Payment Info Debug:', {
      paymentMethod: req.body.paymentMethod,
      referenceNumber: req.body.referenceNumber,
      depositAmount: req.body.depositAmount,
      configuration: req.body.configuration ? 'Present' : 'Missing'
    });

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
      rushFee,
      configuration,
      orderNotes, // PRD v2.0: 支持从orderNotes字段获取
      dstFileFee,
      paymentMethod,
      referenceNumber,
      startDate, // New: Optional start date for historical imports
      status, // New: Optional status override (e.g., COMPLETED)
      dueDate // New: Optional explicit due date
    } = req.body;

    logger.info('[offlineOrderController] Creating order with payload:', { startDate, status, dueDate, deliveryDate });

    // PRD v2.0: 解析configuration以获取orderNotes（如果projectName不存在）
    let configData = safeJsonParse(configuration);

    // [2026-03-13 05:15:00] 创建订单时计算并写入成本快照 pricing.costTotal（不随后续产品成本变动）
    if (configData) {
      const costTotal = await computeCostTotalFromConfig(configData);
      if (!configData.pricing) {
        configData.pricing = {};
      }
      configData.pricing.costTotal = costTotal;
    }

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
      status: status ? status.toUpperCase() : 'ACTIVE', // Support status override
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
      rush_fee: rushFee ? parseFloat(rushFee) : null,
      order_notes: orderNotes?.trim() || null,
      payment_method: paymentMethod?.trim() || null,
      reference_number: referenceNumber?.trim() || null,
      deposit_amount: req.body.depositAmount ? parseFloat(req.body.depositAmount) : null,
      createdAt: startDate ? parseDate(startDate) : undefined, // Override created_at if startDate is provided
    };

    const files = Array.isArray(req.files) ? req.files : [];

    let assetPayloads = [];
    if (files.length > 0) {
      try {
        assetPayloads = await Promise.all(files.map(processAssetUpload));
      } catch (uploadErr) {
        logger.error('[offlineOrderController] Asset upload failed:', uploadErr);
        const msg = uploadErr.code === 'P2002' || uploadErr.code === 'P2003'
          ? uploadErr.message
          : (process.env.GCP_IMAGE_BUCKET ? 'File upload failed. Please try again or contact support.' : 'File storage is not configured (GCP_IMAGE_BUCKET). Contact administrator.');
        return res.status(400).json({
          error: 'Upload Error',
          message: msg,
          details: process.env.NODE_ENV !== 'production' ? uploadErr.message : undefined
        });
      }
    }

    const orderDate = startDate ? parseDate(startDate) : new Date();

    const order = await prisma.$transaction(async (tx) => {
      // 在事务中生成订单编号（使用流水号）
      let uniqueCode = await generateOrderCode(tx, orderDate);
      let exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
      // 如果发生冲突（理论上不应该发生），重新生成
      let retryCount = 0;
      while (exists && retryCount < 10) {
        uniqueCode = await generateOrderCode(tx, orderDate);
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

      // Critical: Create ProductionWorkOrder immediately if startDate or dueDate is provided, or always?
      // The previous code didn't strictly create it in proper separate call?
      // Wait, `productionWorkOrder` is a relation. The previous code didn't CREATE it in the data payload?
      // Ah, I missed where productionWorkOrder is created. It seems it wasn't created in the main create call payload?
      // Let's check the schema. It's a 1:1 relation. 
      // If it's missing in `data`, it won't be created. 
      // Checking line 374-401... I don't see `productionWorkOrder` being created!
      // This means current `createOfflineOrder` doesn't create a production work order!
      // But `mapOrder` expects it.
      // If I want to set startDate/dueDate, I MUST create it.

      // Let's create it now.
      if (!createdOrder.productionWorkOrder) {
        // Determine work order status based on order status
        let workOrderStatus = 'PLANNING';
        const orderStatus = status ? status.toUpperCase() : 'ACTIVE';

        if (orderStatus === 'COMPLETED') {
          workOrderStatus = 'COMPLETED';
        } else if (orderStatus === 'CANCELLED') {
          workOrderStatus = 'CANCELLED';
        }

        await tx.productionWorkOrder.create({
          data: {
            offlineOrderId: createdOrder.id,
            workOrderCode: generateWorkOrderCode(),
            status: workOrderStatus,
            startDate: startDate ? parseDate(startDate) : null,
            dueDate: dueDate ? parseDate(dueDate) : (deliveryDate ? parseDate(deliveryDate) : null),
          }
        });
      }

      // Re-fetch to include the production work order
      const finalOrder = await tx.offlineOrder.findUnique({
        where: { id: createdOrder.id },
        include: {
          assets: true,
          histories: { orderBy: { createdAt: 'desc' } },
          productionWorkOrder: { include: { events: { orderBy: { createdAt: 'desc' } } } }
        }
      });

      return finalOrder;
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
    const paymentMethod = req.query.paymentMethod?.toString().trim();
    const paymentStatus = req.query.paymentStatus?.toString().toUpperCase();
    const dateFilter = req.query.date?.toString().trim();

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

    if (paymentMethod) {
      where.AND.push({ payment_method: paymentMethod });
    }

    if (paymentStatus === 'PAID') {
      where.AND.push({
        deposit_amount: {
          gt: 0
        }
      });
    } else if (paymentStatus === 'UNPAID') {
      where.AND.push({
        OR: [
          { deposit_amount: { equals: 0 } },
          { deposit_amount: null }
        ]
      });
    }

    if (dateFilter) {
      const startDate = new Date(dateFilter);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(dateFilter);
      endDate.setHours(23, 59, 59, 999);

      if (!isNaN(startDate.getTime())) {
        where.AND.push({
          createdAt: {
            gte: startDate,
            lte: endDate
          }
        });
      }
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
 * Query: scope=all|mine, startDate (ISO), endDate (ISO), primaryProduct, creatorId
 * 2026-03-10: 经营分析增强 — 支持按产品/创建人筛选，返回库存消耗、平均单价
 */
function buildMetricsWhere(req) {
  const where = {};
  const scope = (req.query.scope || 'all').toLowerCase();
  const creatorId = req.query.creatorId?.trim() || null;
  if (creatorId) {
    where.metadata = { path: ['submittedByUserId'], equals: creatorId };
  } else if (scope === 'mine' && req.user?.id) {
    where.metadata = { path: ['submittedByUserId'], equals: req.user.id };
  }
  const startDate = parseDate(req.query.startDate);
  const endDate = parseDate(req.query.endDate);
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  const primaryProduct = req.query.primaryProduct?.trim() || null;
  if (primaryProduct) {
    where.primaryProduct = { contains: primaryProduct, mode: 'insensitive' };
  }
  return where;
}

  /** 为 raw SQL 生成 WHERE 条件与参数（与 buildMetricsWhere 一致） */
function buildRawWhereConditions(baseWhere, req, dateOverride = null) {
  const conditions = [];
  const params = [];
  if (baseWhere.metadata?.equals) {
    conditions.push(`(metadata->>'submittedByUserId') = $${params.length + 1}`);
    params.push(baseWhere.metadata.equals);
  }
  const createdAt = dateOverride ? dateOverride.createdAt : baseWhere.createdAt;
  if (createdAt) {
    if (createdAt.gte) {
      conditions.push(`created_at >= $${params.length + 1}`);
      params.push(createdAt.gte);
    }
    if (createdAt.lte) {
      conditions.push(`created_at <= $${params.length + 1}`);
      params.push(createdAt.lte);
    }
  }
  const primaryProduct = req?.query?.primaryProduct?.trim() || null;
  if (primaryProduct) {
    conditions.push(`primary_product ILIKE $${params.length + 1}`);
    params.push(`%${primaryProduct}%`);
  }
  return { conditions, params };
}

/** [2026-03-11] 多表查询时给 offline_orders 的列加别名 o.，避免 created_at 等歧义 */
function rawConditionsWithTableAlias(conditions, alias = 'o') {
  if (!conditions || conditions.length === 0) return conditions;
  return conditions.map((c) =>
    c
      .replace(/\bcreated_at\b/g, `${alias}.created_at`)
      .replace(/\bmetadata\b/g, `${alias}.metadata`)
      .replace(/\bprimary_product\b/g, `${alias}.primary_product`)
  );
}

/** [2026-03-14] 根据当前周期计算上一周期起止日期（用于环比） */
function getPreviousPeriodBounds(startDate, endDate) {
  if (!startDate || !endDate) return null;
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) return null;
  const diffMs = end.getTime() - start.getTime();
  const endPrev = new Date(start);
  endPrev.setDate(endPrev.getDate() - 1);
  endPrev.setHours(23, 59, 59, 999);
  const startPrev = new Date(endPrev.getTime() - diffMs);
  startPrev.setHours(0, 0, 0, 0);
  return {
    startDatePrev: startPrev.toISOString().slice(0, 10),
    endDatePrev: endPrev.toISOString().slice(0, 10),
    createdAtPrev: {
      gte: startPrev,
      lte: endPrev
    }
  };
}

exports.getOfflineOrderMetrics = async (req, res, next) => {
  try {
    const baseWhere = buildMetricsWhere(req);

    // 销售与经营维度：仅订单数、总营收，不按状态/阶段拆分（2026-03-10）
    const [totalCount] = await Promise.all([
      prisma.offlineOrder.count({ where: baseWhere })
    ]);

    const { conditions: rawConditions, params: rawParams } = buildRawWhereConditions(baseWhere, req);

    // 营收汇总：仅总营收，不按订单状态拆分
    let revenueTotal = 0;
    const pricingConditions = ["(configuration->'pricing'->>'total') IS NOT NULL", "(configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'"];
    const revenueWhere = [...pricingConditions, ...rawConditions].join(' AND ');
    try {
      const result = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM((configuration->'pricing'->>'total')::numeric), 0)::float as revenue_total
         FROM offline_orders WHERE ${revenueWhere}`,
        ...rawParams
      );
      if (result && result[0]) {
        revenueTotal = Number(result[0].revenue_total) || 0;
      }
    } catch (revErr) {
      logger.warn('Offline order revenue aggregation skipped', revErr.message);
    }

    const averageOrderValue = totalCount > 0 ? revenueTotal / totalCount : 0;

    // 库存消耗：从 configuration.productItems[].totalQuantity 或 quantity 汇总（2026-03-11 兼容 quantity）
    let inventoryConsumed = 0;
    const invQtyExpr = "COALESCE(NULLIF(elem->>'totalQuantity', '')::int, NULLIF(elem->>'quantity', '')::int, 0)";
    try {
      const invWhere = rawConditions.length ? rawConditions.join(' AND ') : '1=1';
      const invResult = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM(${invQtyExpr}), 0)::bigint AS qty
         FROM offline_orders o,
         LATERAL jsonb_array_elements(CASE WHEN o.configuration->'productItems' IS NOT NULL AND jsonb_typeof(o.configuration->'productItems') = 'array' THEN o.configuration->'productItems' ELSE '[]'::jsonb END) elem
         WHERE ${invWhere}`,
        ...rawParams
      );
      if (invResult && invResult[0] && invResult[0].qty != null) {
        inventoryConsumed = Number(invResult[0].qty) || 0;
      }
    } catch (invErr) {
      logger.warn('Offline order inventory consumed aggregation skipped', invErr.message);
    }
    const averageUnitPrice = inventoryConsumed > 0 ? revenueTotal / inventoryConsumed : 0;

    // [2026-03-13 05:40:00] 经营维度：按负责人聚合（submittedByUserId），并关联 users 获取姓名/邮箱
    let byCreator = [];
    try {
      const creatorWhere = rawConditions.length ? rawConditions.join(' AND ') : '1=1';
      const creatorResult = await prisma.$queryRawUnsafe(
        `SELECT 
           COALESCE(o.metadata->>'submittedByUserId', 'unknown') AS creator_id,
           COALESCE(u."firstName", '') AS first_name,
           COALESCE(u."lastName", '') AS last_name,
           u.email AS email,
           COUNT(*)::int AS order_count,
           COALESCE(SUM(
             CASE 
               WHEN (o.configuration->'pricing'->>'total') IS NOT NULL 
                    AND (o.configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
               THEN (o.configuration->'pricing'->>'total')::numeric 
               ELSE 0 
             END
           ), 0)::float AS revenue,
           COALESCE(SUM(
             CASE 
               WHEN (o.configuration->'pricing'->>'costTotal') IS NOT NULL 
                    AND (o.configuration->'pricing'->>'costTotal') ~ '^-?[0-9]+\\.?[0-9]*$'
               THEN (o.configuration->'pricing'->>'costTotal')::numeric 
               ELSE 0 
             END
           ), 0)::float AS cost
         FROM offline_orders o
         LEFT JOIN users u
           ON (o.metadata->>'submittedByUserId') IS NOT NULL
          AND (o.metadata->>'submittedByUserId') <> ''
          AND u.id::text = o.metadata->>'submittedByUserId'
         WHERE ${creatorWhere}
         GROUP BY COALESCE(o.metadata->>'submittedByUserId', 'unknown'), u."firstName", u."lastName", u.email
         ORDER BY revenue DESC`,
        ...rawParams
      );

      if (creatorResult && creatorResult.length) {
        byCreator = creatorResult.map((row) => {
          const revenueNum = Number(row.revenue) || 0;
          const costNum = Number(row.cost) || 0;
          const margin = revenueNum - costNum;
          const marginPercent = revenueNum > 0 ? (margin / revenueNum) * 100 : 0;
          const firstName = (row.first_name || '').trim();
          const lastName = (row.last_name || '').trim();
          const email = (row.email || '').trim();
          const displayName = (firstName || lastName)
            ? `${firstName} ${lastName}`.trim()
            : (email || 'Unknown');
          return {
            creatorId: row.creator_id || 'unknown',
            creatorName: displayName,
            orderCount: Number(row.order_count) || 0,
            revenue: revenueNum,
            cost: costNum,
            margin,
            marginPercent,
          };
        });
      }
    } catch (creatorErr) {
      logger.warn('Offline order byCreator aggregation skipped', creatorErr.message);
    }

    // [2026-03-13 05:40:00] 按产品线聚合：基于 configuration.productItems[].productId / productName + offline_order_products.category
    let byProductLine = [];
    try {
      const productResult = await prisma.$queryRawUnsafe(
        `SELECT 
           sub.product_id,
           sub.product_name,
           sub.order_count,
           sub.revenue,
           sub.cost,
           p.category
         FROM (
           SELECT 
             (pi->>'productId') AS product_id,
             COALESCE(NULLIF(pi->>'productName', ''), NULLIF(o.primary_product, '')) AS product_name,
             COUNT(DISTINCT o.id)::int AS order_count,
             COALESCE(SUM(
               CASE 
                 WHEN (o.configuration->'pricing'->>'total') IS NOT NULL 
                      AND (o.configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
                 THEN (o.configuration->'pricing'->>'total')::numeric 
                 ELSE 0 
               END
             ), 0)::float AS revenue,
             COALESCE(SUM(
               CASE 
                 WHEN (o.configuration->'pricing'->>'costTotal') IS NOT NULL 
                      AND (o.configuration->'pricing'->>'costTotal') ~ '^-?[0-9]+\\.?[0-9]*$'
                 THEN (o.configuration->'pricing'->>'costTotal')::numeric 
                 ELSE 0 
               END
             ), 0)::float AS cost
           FROM offline_orders o,
             LATERAL jsonb_array_elements(
               CASE 
                 WHEN o.configuration->'productItems' IS NOT NULL 
                      AND jsonb_typeof(o.configuration->'productItems') = 'array' 
                 THEN o.configuration->'productItems' 
                 ELSE '[]'::jsonb 
               END
             ) AS pi
           WHERE ${rawConditions.length ? rawConditions.join(' AND ') : '1=1'}
           GROUP BY (pi->>'productId'), COALESCE(NULLIF(pi->>'productName', ''), NULLIF(o.primary_product, ''))
         ) sub
         LEFT JOIN offline_order_products p ON sub.product_id = p.id
         ORDER BY sub.revenue DESC
        `,
        ...rawParams
      );

      if (productResult && productResult.length) {
        byProductLine = productResult.map((row) => {
          const revenueNum = Number(row.revenue) || 0;
          const costNum = Number(row.cost) || 0;
          const margin = revenueNum - costNum;
          const marginPercent = revenueNum > 0 ? (margin / revenueNum) * 100 : 0;
          return {
            productName: row.product_name || '—',
            category: row.category || '',
            orderCount: Number(row.order_count) || 0,
            revenue: revenueNum,
            cost: costNum,
            margin,
            marginPercent,
          };
        });
      }
    } catch (productErr) {
      logger.warn('Offline order byProductLine aggregation skipped', productErr.message);
    }

    // 2026-03-06 10:05:00: 基于 configuration.pricing.costTotal 计算成本/毛利（若存在）
    let costTotal = 0;
    let marginTotal = revenueTotal;
    let marginPercent = revenueTotal > 0 ? 100 : 0;

    try {
      const costConditions = [
        "(configuration->'pricing'->>'costTotal') IS NOT NULL",
        "(configuration->'pricing'->>'costTotal') ~ '^-?[0-9]+\\.?[0-9]*$'",
      ];
      const costWhere = [...costConditions, ...rawConditions].join(' AND ');
      const costResult = await prisma.$queryRawUnsafe(
        `SELECT COALESCE(SUM((configuration->'pricing'->>'costTotal')::numeric), 0)::float as cost_total
         FROM offline_orders WHERE ${costWhere}`,
        ...rawParams
      );
      if (costResult && costResult[0]) {
        costTotal = Number(costResult[0].cost_total) || 0;
        marginTotal = revenueTotal - costTotal;
        marginPercent = revenueTotal > 0 ? (marginTotal / revenueTotal) * 100 : 0;
      }
    } catch (costErr) {
      logger.warn('Offline order cost aggregation skipped', costErr.message);
    }

    // [2026-03-14] 上一周期汇总（用于环比）
    let previousPeriod = null;
    const prevBounds = getPreviousPeriodBounds(req.query.startDate, req.query.endDate);
    if (prevBounds && baseWhere.createdAt?.gte && baseWhere.createdAt?.lte) {
      try {
        const baseWherePrev = { ...baseWhere, createdAt: prevBounds.createdAtPrev };
        const { conditions: condPrev, params: paramsPrev } = buildRawWhereConditions(baseWherePrev, req, { createdAt: prevBounds.createdAtPrev });
        const wherePrev = condPrev.length ? condPrev.join(' AND ') : '1=1';

        const revWherePrev = [
          "(configuration->'pricing'->>'total') IS NOT NULL",
          "(configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'",
          ...condPrev
        ].join(' AND ');
        const [countPrev, revPrev, costPrevRes] = await Promise.all([
          prisma.offlineOrder.count({ where: baseWherePrev }),
          prisma.$queryRawUnsafe(
            `SELECT COALESCE(SUM((configuration->'pricing'->>'total')::numeric), 0)::float as v FROM offline_orders WHERE ${revWherePrev}`,
            ...paramsPrev
          ).then((r) => (r && r[0]) ? Number(r[0].v) || 0 : 0),
          prisma.$queryRawUnsafe(
            `SELECT COALESCE(SUM((configuration->'pricing'->>'costTotal')::numeric), 0)::float as v FROM offline_orders WHERE (configuration->'pricing'->>'costTotal') IS NOT NULL AND (configuration->'pricing'->>'costTotal') ~ '^-?[0-9]+\\.?[0-9]*$' AND ${wherePrev}`,
            ...paramsPrev
          ).then((r) => (r && r[0]) ? Number(r[0].v) || 0 : 0)
        ]);
        const revPrevNum = Number(revPrev) || 0;
        const costPrevNum = Number(costPrevRes) || 0;
        const marginPrev = revPrevNum - costPrevNum;
        previousPeriod = {
          orderCount: countPrev,
          revenueTotal: revPrevNum,
          costTotal: costPrevNum,
          marginTotal: marginPrev,
          marginPercent: revPrevNum > 0 ? (marginPrev / revPrevNum) * 100 : 0,
          averageOrderValue: countPrev > 0 ? revPrevNum / countPrev : 0
        };
      } catch (prevErr) {
        logger.warn('Offline order previousPeriod aggregation skipped', prevErr.message);
      }
    }

    // 简单时间趋势：仅在有日期范围(start/end)时返回，按日统计订单数和营收
    let timeSeries = [];
    let timeSeriesPrev = [];
    if (baseWhere.createdAt?.gte && baseWhere.createdAt?.lte) {
      try {
        const tsWhere = rawConditions.join(' AND ');
        const tsResult = await prisma.$queryRawUnsafe(
          `SELECT date(created_at) as day, COUNT(*)::int as order_count,
           COALESCE(SUM(CASE WHEN (configuration->'pricing'->>'total') IS NOT NULL 
                                AND (configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
             THEN (configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float as revenue
           FROM offline_orders WHERE ${tsWhere}
           GROUP BY date(created_at) ORDER BY day`,
          ...rawParams
        );
        if (tsResult && tsResult.length) {
          timeSeries = tsResult.map((row) => ({
            date: row.day ? String(row.day).slice(0, 10) : '',
            orderCount: Number(row.order_count) || 0,
            revenue: Number(row.revenue) || 0
          }));
        }

        if (prevBounds) {
          const { conditions: tsCondPrev, params: tsParamsPrev } = buildRawWhereConditions(
            { ...baseWhere, createdAt: prevBounds.createdAtPrev },
            req,
            { createdAt: prevBounds.createdAtPrev }
          );
          const tsWherePrev = tsCondPrev.length ? tsCondPrev.join(' AND ') : '1=1';
          const tsPrevResult = await prisma.$queryRawUnsafe(
            `SELECT date(created_at) as day, COUNT(*)::int as order_count,
             COALESCE(SUM(CASE WHEN (configuration->'pricing'->>'total') IS NOT NULL 
                                  AND (configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
               THEN (configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float as revenue
             FROM offline_orders WHERE ${tsWherePrev}
             GROUP BY date(created_at) ORDER BY day`,
            ...tsParamsPrev
          );
          if (tsPrevResult && tsPrevResult.length) {
            timeSeriesPrev = tsPrevResult.map((row) => ({
              date: row.day ? String(row.day).slice(0, 10) : '',
              orderCount: Number(row.order_count) || 0,
              revenue: Number(row.revenue) || 0
            }));
          }
        }
      } catch (tsErr) {
        logger.warn('Offline order timeSeries aggregation skipped', tsErr.message);
      }
    }

    // [2026-03-14] P&L 简表、畅销榜、按类目、按支付方式
    const plStatement = {
      salePrice: revenueTotal,
      totalCosts: costTotal,
      netProfit: marginTotal
    };

    let bestSellers = [];
    let byCategory = [];
    let byPaymentMode = [];
    // [2026-03-11] debug=1 时把 catch 错误塞进 _debug，便于接口直接看到报错
    let bestSellersError = null;
    let byCategoryError = null;
    // 2026-03-11: 数量字段兼容 totalQuantity 与 quantity，便于排查生产环境为空
    const qtyExpr = "COALESCE(NULLIF(pi->>'totalQuantity', '')::int, NULLIF(pi->>'quantity', '')::int, 0)";
    const whereWithAlias = rawConditionsWithTableAlias(rawConditions);
    const baseWhereStr = whereWithAlias.length ? whereWithAlias.join(' AND ') : '1=1';
    try {
      const bestRes = await prisma.$queryRawUnsafe(
        `SELECT 
           (pi->>'productId') AS product_id,
           COALESCE(NULLIF(pi->>'productName', ''), p.name, '—') AS product_name,
           SUM(${qtyExpr})::int AS quantity
         FROM offline_orders o,
           LATERAL jsonb_array_elements(CASE WHEN o.configuration->'productItems' IS NOT NULL AND jsonb_typeof(o.configuration->'productItems') = 'array' THEN o.configuration->'productItems' ELSE '[]'::jsonb END) AS pi
         LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
         WHERE ${baseWhereStr}
         GROUP BY (pi->>'productId'), pi->>'productName', p.name
         HAVING SUM(${qtyExpr}) > 0
         ORDER BY quantity DESC
         LIMIT 8`,
        ...rawParams
      );
      if (bestRes && bestRes.length) {
        bestSellers = bestRes.map((row) => ({
          productName: row.product_name || '—',
          quantity: Number(row.quantity) || 0
        }));
      }
    } catch (e) {
      bestSellersError = e?.message ?? String(e);
      logger.warn('Offline order bestSellers skipped', bestSellersError);
    }
    try {
      const catRes = await prisma.$queryRawUnsafe(
        `SELECT 
           COALESCE(c.name, 'Uncategorized') AS category,
           SUM(${qtyExpr})::int AS quantity
         FROM offline_orders o,
           LATERAL jsonb_array_elements(CASE WHEN o.configuration->'productItems' IS NOT NULL AND jsonb_typeof(o.configuration->'productItems') = 'array' THEN o.configuration->'productItems' ELSE '[]'::jsonb END) AS pi
         LEFT JOIN offline_order_products p ON p.id = pi->>'productId'
         LEFT JOIN categories c ON c.id = p.category_id
         WHERE ${baseWhereStr}
         GROUP BY c.id, c.name
         HAVING SUM(${qtyExpr}) > 0
         ORDER BY quantity DESC`,
        ...rawParams
      );
      if (catRes && catRes.length) {
        byCategory = catRes.map((row) => ({
          category: row.category || 'Uncategorized',
          quantity: Number(row.quantity) || 0
        }));
      }
    } catch (e) {
      byCategoryError = e?.message ?? String(e);
      logger.warn('Offline order byCategory skipped', byCategoryError);
    }
    try {
      const payRes = await prisma.$queryRawUnsafe(
        `SELECT 
           COALESCE(NULLIF(TRIM(payment_method), ''), 'Other') AS payment_mode,
           COUNT(*)::int AS order_count,
           COALESCE(SUM(CASE WHEN (configuration->'pricing'->>'total') IS NOT NULL AND (configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$' THEN (configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float AS revenue
         FROM offline_orders
         WHERE ${rawConditions.length ? rawConditions.join(' AND ') : '1=1'}
         GROUP BY payment_method
         ORDER BY revenue DESC`,
        ...rawParams
      );
      if (payRes && payRes.length) {
        byPaymentMode = payRes.map((row) => ({
          paymentMode: row.payment_mode || 'Other',
          orderCount: Number(row.order_count) || 0,
          revenue: Number(row.revenue) || 0
        }));
      }
    } catch (e) {
      logger.warn('Offline order byPaymentMode skipped', e.message);
    }

    // [2026-03-11] 诊断：?debug=1 时返回 bestSellers/byCategory 为空的原因
    let _debug;
    if (req.query.debug === '1') {
      try {
        const dw = whereWithAlias.length ? whereWithAlias.join(' AND ') : '1=1';
        const countWithItems = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*)::int AS cnt FROM offline_orders o
           WHERE ${dw}
             AND o.configuration->'productItems' IS NOT NULL
             AND jsonb_typeof(o.configuration->'productItems') = 'array'
             AND jsonb_array_length(o.configuration->'productItems') > 0`,
          ...rawParams
        );
        const sampleRow = await prisma.$queryRawUnsafe(
          `SELECT o.configuration->'productItems'->0 AS first_item
           FROM offline_orders o
           WHERE ${dw}
             AND o.configuration->'productItems' IS NOT NULL
             AND jsonb_typeof(o.configuration->'productItems') = 'array'
             AND jsonb_array_length(o.configuration->'productItems') > 0
           LIMIT 1`,
          ...rawParams
        );
        const firstItem = sampleRow?.[0]?.first_item;
        _debug = {
          ordersInRange: totalCount,
          ordersWithNonEmptyProductItems: countWithItems?.[0]?.cnt ?? 0,
          sampleFirstItemKeys: firstItem && typeof firstItem === 'object' ? Object.keys(firstItem) : null,
          sampleFirstItem: firstItem
        };
        if (bestSellersError) _debug.bestSellersError = bestSellersError;
        if (byCategoryError) _debug.byCategoryError = byCategoryError;
      } catch (debugErr) {
        _debug = { error: debugErr.message };
        if (bestSellersError) _debug.bestSellersError = bestSellersError;
        if (byCategoryError) _debug.byCategoryError = byCategoryError;
      }
    }

    // 仅返回销售与经营维度，不返回订单状态/阶段（2026-03-10）；含库存消耗与平均单价
    const payload = {
      success: true,
      sales: {
        orderCount: totalCount,
        revenueTotal,
        averageOrderValue,
        inventoryConsumed,
        averageUnitPrice
      },
      cost: { costTotal, marginTotal, marginPercent },
      previousPeriod,
      plStatement,
      bestSellers,
      byCategory,
      byPaymentMode,
      byCreator,
      byProductLine,
      timeSeries,
      timeSeriesPrev
    };
    if (_debug) payload._debug = _debug;
    res.json(payload);
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
    if (req.body.rushFee !== undefined) data.rush_fee = req.body.rushFee ? parseFloat(req.body.rushFee) : null;
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
    if (configuration !== undefined) {
      // [2026-03-13 05:15:30] 编辑订单时若更新配置，同步重算成本快照 pricing.costTotal
      const configData = safeJsonParse(configuration) || configuration || null;
      if (configData && typeof configData === 'object') {
        const costTotal = await computeCostTotalFromConfig(configData);
        if (!configData.pricing) {
          configData.pricing = {};
        }
        configData.pricing.costTotal = costTotal;
      }
      data.configuration = configData;
    }
    if (metadata !== undefined) data.metadata = safeJsonParse(metadata) || metadata || null;

    // Payment updates
    if (req.body.paymentMethod !== undefined) data.payment_method = req.body.paymentMethod?.trim() || null;
    if (req.body.referenceNumber !== undefined) data.reference_number = req.body.referenceNumber?.trim() || null;
    if (req.body.depositAmount !== undefined) data.deposit_amount = req.body.depositAmount ? parseFloat(req.body.depositAmount) : null;

    if (status !== undefined) {
      const normalizedStatus = status?.toString().toUpperCase();
      if (!['ACTIVE', 'PRINTED', 'COMPLETED', 'CANCELLED'].includes(normalizedStatus)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid status value'
        });
      }
      data.status = normalizedStatus;
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const files = Array.isArray(req.files) ? req.files : [];
    let newAssetPayloads = [];
    if (files.length > 0) {
      try {
        newAssetPayloads = await Promise.all(files.map(processAssetUpload));
      } catch (uploadErr) {
        logger.error('[updateOfflineOrder] Asset upload failed:', uploadErr);
        // 2025-02-20: 400 响应增加 details 便于非生产环境排查
        const msg = process.env.GCP_IMAGE_BUCKET ? 'File upload failed.' : 'File storage is not configured (GCP_IMAGE_BUCKET).';
        return res.status(400).json({
          error: 'Upload Error',
          message: msg,
          details: process.env.NODE_ENV !== 'production' ? uploadErr?.message : undefined
        });
      }
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: {
          id: true,
          stageKey: true,
          status: true,
        }
      });

      if (!existing) {
        return null;
      }

      // 核心逻辑：如果修改了配置（添加了新产品等）且当前状态是已完成，则状态自动回退到进行中
      if (configuration !== undefined && existing.status === 'COMPLETED' && status === undefined) {
        data.status = 'ACTIVE';
        logger.info(`[OfflineOrder] Order ${id} configuration updated. Reverting status from COMPLETED to ACTIVE.`);
      }

      const order = await tx.offlineOrder.update({
        where: { id },
        data: {
          ...data,
          ...(newAssetPayloads.length > 0
            ? {
              assets: {
                create: newAssetPayloads.map((asset) => ({
                  fileName: asset.fileName,
                  fileSize: asset.fileSize,
                  contentType: asset.contentType,
                  storageKey: asset.storageKey,
                  url: asset.url,
                  uploadedBy: req.user?.id || null
                }))
              }
            }
            : {}),
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

    let assetPayloads;
    try {
      assetPayloads = await Promise.all(files.map(processAssetUpload));
    } catch (uploadErr) {
      logger.error('[uploadOfflineOrderAssets] Upload failed:', uploadErr);
      // 2025-02-20: 400 响应增加 details 便于非生产环境排查
      const msg = process.env.GCP_IMAGE_BUCKET ? 'File upload failed.' : 'File storage is not configured (GCP_IMAGE_BUCKET).';
      return res.status(400).json({
        error: 'Upload Error',
        message: msg,
        details: process.env.NODE_ENV !== 'production' ? uploadErr?.message : undefined
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

    // 尝试获取颜色列表 (使用 site.colorMappings 设置)
    try {
      logger.info('[getOrderConfig] Fetching site.colorMappings setting...');
      // 获取设置值，默认为空数组
      const colorMappings = await settingService.getSettingValue('site.colorMappings', []);

      // 映射到前端期望的格式 (id, name, hexCode)
      // 注意：site.colorMappings 中的格式是 { id, name, hex, ... }
      // 前端 offlineOrders/page.tsx 期望 hexCode 字段 (line 1457 in original file: hexCode: c.hex_code)
      // 而数据库 offline_order_colors 字段为 hex_code
      // 我们统一映射为 hex_code 以匹配下方的 response mapping
      colors = colorMappings.map(c => ({
        id: c.id,
        name: c.name || c.productColor, // Support both old 'name' and new 'productColor' keys
        hex_code: c.hex || (Array.isArray(c.values) ? c.values[0] : null), // Map 'hex' or 'values[0]' to 'hex_code'
        ...c
      }));

      logger.info(`[getOrderConfig] Found ${colors.length} colors from settings`);
    } catch (error) {
      logger.error('[getOrderConfig] Error fetching site.colorMappings:', error);
      colors = [];
    }

    // 尝试获取尺码费用配置
    // [2026-01-06] 修复：按 display_order 排序，而不是按字母顺序
    try {
      sizeFees = await prisma.offline_order_size_fees.findMany({
        where: {
          is_active: true, // 只返回启用的尺码
        },
        orderBy: [
          { display_order: 'asc' },
          { size: 'asc' },
        ],
      });
    } catch (error) {
      logger.warn('[getOrderConfig] offline_order_size_fees table not found, returning default values');
      // 返回默认值
      sizeFees = [
        { size: '2XL', additional_fee: 2.50, size_type: 'Adult', display_order: 9, is_active: true },
        { size: '3XL', additional_fee: 3.50, size_type: 'Adult', display_order: 10, is_active: true },
        { size: '4XL', additional_fee: 4.50, size_type: 'Adult', display_order: 11, is_active: true },
        { size: '5XL', additional_fee: 5.50, size_type: 'Adult', display_order: 12, is_active: true },
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
        sizeType: sf.size_type || 'Adult',
        additionalFee: typeof sf.additional_fee === 'number' ? sf.additional_fee : Number(sf.additional_fee),
        displayOrder: sf.display_order || 0,
        isActive: sf.is_active !== false,
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


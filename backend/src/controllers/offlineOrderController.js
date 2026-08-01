// Offline POD order controller
// Enhanced with unified error handling
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const {
  getStageConfig,
  updateStageConfig,
  findStageByKey,
  getInitialStage
} = require('../services/offlineWorkflowService');
const { uploadBufferToGcs, deleteFromGcs } = require('../utils/gcsStorage');
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

// [2026-07-31] 订单类别：烫印服装（正常产品/服装订单）vs DTF打印film（客户仅来打印转印膜，不烫印上衣）
const ORDER_CATEGORY_VALUES = ['烫印服装', 'DTF打印film'];

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
 * [2026-07-29] 把印刷位置设计图上传后的 asset id/url 回写进 configuration JSON 里对应的位置。
 * mapEntry 来自前端 positionAssetMap：{ productItemId, colorGroupId, positionId, positionKey }。
 * positionId 优先匹配（web 端每个位置都有稳定 uuid）；没有 positionId 时按 positionKey 匹配
 * （mobile 端同一颜色组内 positionKey 唯一，可以安全地作为兜底匹配键）。
 */
const applyDesignAssetToConfig = (configData, mapEntry, assetId, url) => {
  if (!configData || !mapEntry) return;
  const groups = configData?.colorGroupsByProduct?.[mapEntry.productItemId];
  if (!Array.isArray(groups)) return;
  const group = groups.find((g) => g.id === mapEntry.colorGroupId);
  if (!group || !Array.isArray(group.positions)) return;
  const position = mapEntry.positionId
    ? group.positions.find((p) => p.id === mapEntry.positionId)
    : group.positions.find((p) => p.positionKey === mapEntry.positionKey);
  if (!position) return;
  position.designAssetId = assetId;
  position.designAssetUrl = url;
};

/**
 * [2026-07-29] 上传印刷位置设计图并把结果关联回 configData 里对应的位置。
 * 复用 processAssetUpload 的存储逻辑，但预先生成 asset id（而不是让 Prisma 自动生成），
 * 这样才能在同一次事务写入订单前，把 id 提前写进 configuration JSON。
 */
const processPositionAssetUploads = async (positionFiles, positionAssetMap, configData) => {
  if (!positionFiles.length) return [];
  return Promise.all(
    positionFiles.map(async (file, index) => {
      const uploaded = await processAssetUpload(file);
      const assetId = uuidv4();
      applyDesignAssetToConfig(configData, positionAssetMap[index], assetId, uploaded.url);
      return { ...uploaded, id: assetId };
    })
  );
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
/**
 * 生成线下订单编号 (Format: creator-YYMMDD-XXX)
 * 其中 XXX 是当天该创建者的流水号，从 001 开始
 *
 * 2026-04-21: 日期段由 YYYYMMDD 改为 YYMMDD（更短更好看）
 *
 * @param {Object} tx - Prisma transaction 对象（可选）
 * @param {Date} date - 订单日期（可选，默认为当前时间）
 * @param {Object} user - 创建者对象（可选）
 * @returns {Promise<string>} 订单编号
 */
const generateOrderCode = async (tx = null, date = null, user = null) => {
  const timestamp = date || new Date();
  // YYYYMMDD 格式 (e.g., 20260401) — 仅用于兼容旧数据扫描
  const fullDate = timestamp.toISOString().slice(0, 10).replace(/-/g, '');
  // YYMMDD 格式 (e.g., 260401) — 新编号使用该格式
  const shortDate = fullDate.substring(2);

  // 提取创建者名称前缀
  let creatorPrefix = 'OFF';

  if (user) {
    logger.info('[offlineOrderController] generateOrderCode user context', {
      userId: user.id || 'N/A',
      email: user.email || 'N/A',
      firstName: user.firstName || 'N/A',
      lastName: user.lastName || 'N/A'
    });

    if (user.firstName) {
      creatorPrefix = user.firstName.toLowerCase();
    } else if (user.email) {
      creatorPrefix = user.email.split('@')[0].toLowerCase();
    }
  } else {
    logger.warn('[offlineOrderController] generateOrderCode called WITHOUT user context, using fallback OFF');
  }

  // 清洗前缀：只保留字母数字
  creatorPrefix = creatorPrefix.replace(/[^a-z0-9]/gi, '').slice(0, 10) || 'OFF';

  // 获取当天的最大流水号
  const prismaClient = tx || prisma;

  // 新编号 prefix（YYMMDD 格式）
  const prefix = `${creatorPrefix}-${shortDate}-`;

  // 扫描时把新旧两种日期格式都算进来，避免同日切换格式导致流水号重复
  const todayOrders = await prismaClient.offlineOrder.findMany({
    where: {
      OR: [
        { orderCode: { startsWith: `${creatorPrefix}-${shortDate}-` } },
        { orderCode: { startsWith: `${creatorPrefix}-${fullDate}-` } },
      ],
    },
    select: {
      orderCode: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // 兼容旧 OFF 格式（没有创建者前缀的情况已经不会发生，但保留扫描）
  if (todayOrders.length === 0 && creatorPrefix === 'OFF') {
    const oldOrders = await prismaClient.offlineOrder.findMany({
      where: {
        OR: [
          { orderCode: { startsWith: `OFF-${shortDate}-` } },
          { orderCode: { startsWith: `OFF-${fullDate}-` } },
        ],
      },
      select: { orderCode: true },
      orderBy: { createdAt: 'desc' },
    });
    todayOrders.push(...oldOrders);
  }

  // 提取最高流水号
  let maxSequence = 0;
  todayOrders.forEach((order) => {
    const parts = order.orderCode.split('-');
    const suffix = parts.pop() || '';

    // 尝试提取数字部分 (处理可能带随机后缀的情况)
    const sequenceMatch = suffix.match(/^\d+/);
    if (sequenceMatch) {
      const sequence = parseInt(sequenceMatch[0], 10);
      if (!isNaN(sequence) && sequence > maxSequence) {
        maxSequence = sequence;
      }
    }
  });

  // 递增流水号（从 001 开始）
  const nextSequence = maxSequence + 1;
  const sequencePart = String(nextSequence).padStart(3, '0');
  const finalCode = `${prefix}${sequencePart}`;

  logger.info('[offlineOrderController] Final generated order code', {
    shortDate,
    creatorPrefix,
    nextSequence,
    finalCode,
  });

  return finalCode;
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

const AUDITABLE_FIELDS = {
  createdAt: '订单日期',
  projectName: '项目名称',
  primaryProduct: '主产品',
  quantity: '数量',
  deliveryDate: '交货日期',
  description: '描述/备注',
  requiresMockups: '需要样稿',
  requiresProof: '需要打样',
  rushOrder: '加急',
  rush_fee: '加急费',
  contactName: '联系人',
  company: '公司',
  email: '邮箱',
  phone: '电话',
  status: '订单状态',
  type: '印花类型',
  orderCategory: '订单类别',
  invoiceStatus: '发票状态',
  totalAmount: '订单金额',
  payment_method: '付款方式',
  reference_number: '参考号',
  deposit_amount: '定金',
};

const AUDITABLE_WO_FIELDS = {
  status: '工单状态',
  assigneeName: '负责人',
  startDate: '开始日期',
  dueDate: '计划完成日期',
  completedDate: '完成日期',
  priority: '优先级',
  notes: '工单备注',
};

const serializeAuditValue = (v) => {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
};

const writeAuditLogs = async (tx, orderId, actorId, actorName, entries) => {
  if (!entries || entries.length === 0) return;
  await tx.offlineOrderAuditLog.createMany({
    data: entries.map((e) => ({
      orderId,
      action: e.action,
      field: e.field ?? null,
      oldValue: e.oldValue != null ? String(e.oldValue) : null,
      newValue: e.newValue != null ? String(e.newValue) : null,
      actorId: actorId ?? null,
      actorName: actorName ?? null,
      metadata: e.metadata ?? null,
    }))
  });
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
  // 2026-04-20: 列表改造新增三列（Prisma JS 字段：type / invoiceStatus / totalAmount）
  type: order.type ?? null,
  // [2026-07-31] 订单类别：烫印服装 / DTF打印film
  orderCategory: order.orderCategory ?? null,
  invoiceStatus: order.invoiceStatus || 'No',
  totalAmount: order.totalAmount != null ? parseFloat(order.totalAmount) : null,
  // 2026-04-24: 备货/订货情况
  stockingStatus: order.stockingStatus ?? null,
  purchaseStatus: order.purchaseStatus ?? null,
  // [2026-07-31] 手动"从报表排除"开关
  excludeFromReports: order.excludeFromReports ?? false,
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
    uploadedBy: asset.uploadedBy,
    comment: asset.comment ?? null
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
  auditLogs: (order.auditLogs || []).map((log) => ({
    id: log.id,
    action: log.action,
    field: log.field,
    oldValue: log.oldValue,
    newValue: log.newValue,
    actorId: log.actorId,
    actorName: log.actorName,
    metadata: log.metadata,
    createdAt: log.createdAt
  })),
  payment: {
    method: order.payment_method,
    referenceNumber: order.reference_number,
    depositAmount: order.deposit_amount ? parseFloat(order.deposit_amount) : 0,
    dstFileFee: order.dst_file_fee ? parseFloat(order.dst_file_fee) : 0,
  },
  productionWorkOrder: mapProductionWorkOrder(order.productionWorkOrder),
  creator: order._creator ? {
    id: order._creator.id,
    email: order._creator.email,
    name: [order._creator.firstName, order._creator.lastName].filter(Boolean).join(' ') || order._creator.email
  } : null,
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
      description: descriptionInput, // 2026-04-21: 列表 inline 新增行「备注」字段
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
      status, // New: Optional status override, 2026-04-20 起为中文文本
      dueDate, // New: Optional explicit due date
      // 2026-04-20: 列表改造新增三列 + inline 新增行支持
      type,
      invoiceStatus,
      totalAmount,
      // [2026-07-31] 订单类别：烫印服装 / DTF打印film
      orderCategory,
      // [2026-07-31] 手动"从报表排除"开关，创建时默认 false（未传即为 false）
      excludeFromReports
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
      description: (descriptionInput?.trim() || artworkNotes?.trim() || null),
      requiresMockups: parseBoolean(requiresMockups),
      requiresProof: parseBoolean(requiresProof),
      rushOrder: parseBoolean(rushOrder),
      excludeFromReports: parseBoolean(excludeFromReports),
      stageKey: initialStage.key,
      stageLabel: initialStage.label,
      stagePosition: initialStage.position ?? 0,
      // 2026-04-20: 默认中文状态；兼容旧的 UPPERCASE 枚举 → 映射到中文
      status: (() => {
        const raw = status?.toString().trim();
        if (!raw) return '待确认订单';
        const legacyMap = {
          ACTIVE: '待确认订单',
          PRINTED: '待取货',
          COMPLETED: '已完成',
          CANCELLED: '已取消',
          REMINDER: '需通知'
        };
        return legacyMap[raw.toUpperCase()] || raw;
      })(),
      // 2026-04-20: 列表改造新三列
      type: type?.toString().trim() || null,
      // [2026-07-31] 订单类别：前端下拉必选，后端兜底默认"烫印服装"（老流程/异常提交时不至于留空）
      orderCategory: ORDER_CATEGORY_VALUES.includes(orderCategory?.toString().trim())
        ? orderCategory.toString().trim()
        : '烫印服装',
      invoiceStatus: (() => {
        const v = invoiceStatus?.toString().trim();
        return v && ['No', 'Require', 'Sent'].includes(v) ? v : 'No';
      })(),
      totalAmount:
        totalAmount !== undefined && totalAmount !== null && totalAmount !== ''
          ? (Number.isNaN(parseFloat(totalAmount)) ? null : parseFloat(totalAmount))
          : null,
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

    // upload.fields([{name:'assets'},{name:'positionAssets'}]) 下 req.files 是按字段名分组的对象；
    // 兼容旧的 upload.array('assets') 场景（req.files 是扁平数组）
    const filesByField = Array.isArray(req.files) ? { assets: req.files } : (req.files || {});
    const files = filesByField.assets || [];
    const positionFiles = filesByField.positionAssets || [];
    const positionAssetMap = safeJsonParse(req.body.positionAssetMap) || [];

    let assetPayloads = [];
    let positionAssetPayloads = [];
    try {
      if (files.length > 0) {
        assetPayloads = await Promise.all(files.map(processAssetUpload));
      }
      if (positionFiles.length > 0) {
        positionAssetPayloads = await processPositionAssetUploads(positionFiles, positionAssetMap, configData);
      }
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
    const allAssetPayloads = [...assetPayloads, ...positionAssetPayloads];

    const orderDate = startDate ? parseDate(startDate) : new Date();

    const order = await prisma.executeWithRetry(() => prisma.$transaction(async (tx) => {
      // 在事务中生成订单编号（使用流水号）
      let uniqueCode = await generateOrderCode(tx, orderDate, req.user);
      let exists = await tx.offlineOrder.findUnique({ where: { orderCode: uniqueCode } });
      // 如果发生冲突（理论上不应该发生），重新生成
      let retryCount = 0;
      while (exists && retryCount < 10) {
        uniqueCode = await generateOrderCode(tx, orderDate, req.user);
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
          assets: allAssetPayloads.length
            ? {
              create: allAssetPayloads.map((asset) => ({
                ...(asset.id ? { id: asset.id } : {}),
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
        // 2026-04-20: status 已改为中文文本 / 兼容旧枚举
        let workOrderStatus = 'PLANNING';
        const finalStatus = createdOrder.status; // 已经过 status 默认/映射处理

        if (finalStatus === '已完成' || finalStatus === 'COMPLETED') {
          workOrderStatus = 'COMPLETED';
        } else if (finalStatus === '已取消' || finalStatus === 'CANCELLED') {
          workOrderStatus = 'CANCELLED';
        }

        await tx.productionWorkOrder.create({
          data: {
            offlineOrderId: createdOrder.id,
            workOrderCode: generateWorkOrderCode(),
            status: workOrderStatus,
            startDate: startDate ? parseDate(startDate) : new Date(),
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
          auditLogs: { orderBy: { createdAt: 'desc' } },
          productionWorkOrder: { include: { events: { orderBy: { createdAt: 'desc' } } } }
        }
      });

      return finalOrder;
    }));

    if (order) {
      const createActorName = req.user
        ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
        : 'Customer';
      try {
        await writeAuditLogs(prisma, order.id, req.user?.id, createActorName, [
          { action: 'ORDER_CREATED', metadata: { orderCode: order.orderCode } }
        ]);
      } catch (auditErr) {
        logger.warn('[createOfflineOrder] Audit log write failed:', auditErr.message);
      }
    }

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
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 1000);
    const skip = (page - 1) * limit;

    const stageFilter = req.query.stageKey ? req.query.stageKey.toString() : null;
    // 支持多选 status（逗号分隔），兼容旧版单个 status 参数
    const statusesFilter = req.query.statuses
      ? req.query.statuses.split(',').map(s => s.trim()).filter(Boolean)
      : req.query.status
        ? [req.query.status.toString().trim()]
        : null;
    const rushFilter = req.query.rush === 'true' ? true : req.query.rush === 'false' ? false : null;
    const search = req.query.search?.toString().trim();
    const paymentMethod = req.query.paymentMethod?.toString().trim();
    const paymentStatus = req.query.paymentStatus?.toString().toUpperCase();
    const dateFilter = req.query.date?.toString().trim();

    // 日期范围（productionWorkOrder.startDate 和 dueDate）
    const startFrom = parseDate(req.query.startFrom);
    const startTo = parseDate(req.query.startTo);
    const dueFrom = parseDate(req.query.dueFrom);
    const dueTo = parseDate(req.query.dueTo);

    // 数量和金额范围
    const qtyMin = req.query.qtyMin != null && req.query.qtyMin !== '' ? parseInt(req.query.qtyMin, 10) : null;
    const qtyMax = req.query.qtyMax != null && req.query.qtyMax !== '' ? parseInt(req.query.qtyMax, 10) : null;
    const totalMin = req.query.totalMin != null && req.query.totalMin !== '' ? parseFloat(req.query.totalMin) : null;
    const totalMax = req.query.totalMax != null && req.query.totalMax !== '' ? parseFloat(req.query.totalMax) : null;
    const depositMin = req.query.depositMin != null && req.query.depositMin !== '' ? parseFloat(req.query.depositMin) : null;
    const depositMax = req.query.depositMax != null && req.query.depositMax !== '' ? parseFloat(req.query.depositMax) : null;

    const where = {
      AND: []
    };

    if (stageFilter) {
      where.AND.push({ stageKey: stageFilter });
    }

    if (statusesFilter && statusesFilter.length > 0) {
      where.AND.push({ status: { in: statusesFilter } });
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
          { company: { contains: search, mode: 'insensitive' } },
          { contactName: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ]
      });
    }

    // productionWorkOrder 日期范围
    if (startFrom || startTo) {
      const cond = {};
      if (startFrom) cond.gte = startFrom;
      if (startTo) { const e = new Date(startTo); e.setHours(23, 59, 59, 999); cond.lte = e; }
      where.AND.push({ productionWorkOrder: { startDate: cond } });
    }

    if (dueFrom || dueTo) {
      const cond = {};
      if (dueFrom) cond.gte = dueFrom;
      if (dueTo) { const e = new Date(dueTo); e.setHours(23, 59, 59, 999); cond.lte = e; }
      where.AND.push({ productionWorkOrder: { dueDate: cond } });
    }

    // 数量范围
    if (qtyMin !== null && !Number.isNaN(qtyMin)) where.AND.push({ quantity: { gte: qtyMin } });
    if (qtyMax !== null && !Number.isNaN(qtyMax)) where.AND.push({ quantity: { lte: qtyMax } });

    // 总金额范围
    if (totalMin !== null && !Number.isNaN(totalMin)) where.AND.push({ totalAmount: { gte: totalMin } });
    if (totalMax !== null && !Number.isNaN(totalMax)) where.AND.push({ totalAmount: { lte: totalMax } });

    // 预付款范围
    if (depositMin !== null && !Number.isNaN(depositMin)) where.AND.push({ deposit_amount: { gte: depositMin } });
    if (depositMax !== null && !Number.isNaN(depositMax)) where.AND.push({ deposit_amount: { lte: depositMax } });

    const [orders, total, stages] = await Promise.all([
      prisma.offlineOrder.findMany({
        where: where.AND.length ? where : undefined,
        skip,
        take: limit,
        // 2026-04-20: 排序改造 —
        // 已完成订单沉底由应用层处理（Prisma 不能直接表达 CASE WHEN），
        // 先按 productionWorkOrder.dueDate ASC，再按 createdAt DESC 兜底。
        orderBy: [
          { stagePosition: 'asc' },
          { createdAt: 'desc' }
        ],
        include: {
          // 列表需要全部资产：首张 image 用作缩略图，其余供下载浮层
          assets: {
            orderBy: { uploadedAt: 'asc' }
          },
          productionWorkOrder: true
        }
      }),
      prisma.offlineOrder.count({
        where: where.AND.length ? where : undefined
      }),
      getStageConfig()
    ]);

    // 批量查询创建者信息（metadata.submittedByUserId）
    const creatorIds = [...new Set(
      orders
        .map((o) => o.metadata?.submittedByUserId)
        .filter(Boolean)
    )];
    const creatorMap = {};
    if (creatorIds.length > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: creatorIds } },
        select: { id: true, firstName: true, lastName: true, email: true }
      });
      users.forEach((u) => { creatorMap[u.id] = u; });
    }

    res.json({
      success: true,
      orders: orders.map((order) => {
        const creatorUser = creatorMap[order.metadata?.submittedByUserId] || null;
        return mapOrder({
          ...order,
          histories: [],
          _creator: creatorUser
        });
      }),
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
  // [2026-07-31] Dashboard 统计口径排除规则：已取消订单 / DTF打印film订单 / 手动标记排除的订单
  where.status = { notIn: ['已取消', 'CANCELLED'] };
  where.orderCategory = { not: 'DTF打印film' };
  where.excludeFromReports = false;
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
  // [2026-07-31] Dashboard 统计口径排除规则，与 buildMetricsWhere 保持一致
  // status 用中文/旧英文双值匹配；orderCategory 用 IS DISTINCT FROM 处理 NULL
  // （NULL != 'DTF打印film' 在 SQL 里恒为 NULL/false，会导致 orderCategory 为空的订单被误排除）
  conditions.push(`status NOT IN ('已取消', 'CANCELLED')`);
  conditions.push(`order_category IS DISTINCT FROM 'DTF打印film'`);
  conditions.push(`exclude_from_reports = false`);
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
      const creatorWhereRaw = rawConditionsWithTableAlias(rawConditions, 'o');
      const creatorWhere = creatorWhereRaw.length ? creatorWhereRaw.join(' AND ') : '1=1';
      const creatorResult = await prisma.$queryRawUnsafe(
        `SELECT
           COALESCE(o.metadata->>'submittedByUserId', 'unknown') AS creator_id,
           MAX(COALESCE(u.first_name, '')) AS first_name,
           MAX(COALESCE(u.last_name, '')) AS last_name,
           MAX(u.email) AS email,
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
         GROUP BY COALESCE(o.metadata->>'submittedByUserId', 'unknown')
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
           p.category_id
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
           WHERE ${rawConditionsWithTableAlias(rawConditions, 'o').length ? rawConditionsWithTableAlias(rawConditions, 'o').join(' AND ') : '1=1'}
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
            category: row.category_id || '',
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
          `SELECT date(o.created_at) as day, COUNT(*)::int as order_count,
           COALESCE(SUM(CASE WHEN (o.configuration->'pricing'->>'total') IS NOT NULL 
                                AND (o.configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
             THEN (o.configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float as revenue
           FROM offline_orders o WHERE ${tsWhere}
           GROUP BY date(o.created_at) ORDER BY day`,
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
            `SELECT date(o.created_at) as day, COUNT(*)::int as order_count,
             COALESCE(SUM(CASE WHEN (o.configuration->'pricing'->>'total') IS NOT NULL 
                                  AND (o.configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$'
               THEN (o.configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float as revenue
             FROM offline_orders o WHERE ${tsWherePrev}
             GROUP BY date(o.created_at) ORDER BY day`,
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
           COALESCE(NULLIF(TRIM(o.payment_method), ''), 'Other') AS payment_mode,
           COUNT(*)::int AS order_count,
           COALESCE(SUM(CASE WHEN (o.configuration->'pricing'->>'total') IS NOT NULL AND (o.configuration->'pricing'->>'total') ~ '^-?[0-9]+\\.?[0-9]*$' THEN (o.configuration->'pricing'->>'total')::numeric ELSE 0 END), 0)::float AS revenue
         FROM offline_orders o
         WHERE ${whereWithAlias.length ? whereWithAlias.join(' AND ') : '1=1'}
         GROUP BY o.payment_method
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

    // [2026-03-29] 状态与工作流维度：满足前端 Kanban 统计需求 (active, rushActive, completed, cancelled)
    // 2026-04-20: status 改为中文自由文本；
    //   - completed = '已完成'
    //   - cancelled = '已取消'
    //   - active     = 除上两者之外的所有订单
    const [activeCount, rushActiveCount, completedCount, cancelledCount] = await Promise.all([
      prisma.offlineOrder.count({
        where: { ...baseWhere, status: { notIn: ['已完成', '已取消'] } }
      }),
      prisma.offlineOrder.count({
        where: { ...baseWhere, status: { notIn: ['已完成', '已取消'] }, rushOrder: true }
      }),
      prisma.offlineOrder.count({ where: { ...baseWhere, status: '已完成' } }),
      prisma.offlineOrder.count({ where: { ...baseWhere, status: '已取消' } })
    ]);

    const summary = {
      active: activeCount,
      rushActive: rushActiveCount,
      completed: completedCount,
      cancelled: cancelledCount
    };

    // 仅返回销售与经营维度，不返回订单状态/阶段（2026-03-10）；含库存消耗与平均单价
    const payload = {
      success: true,
      summary, // 修复：恢复 summary 以支持前端看板
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
        auditLogs: {
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

    let prevStageKey = null;
    const updatedOrder = await prisma.executeWithRetry(() => prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: { stageKey: true }
      });

      if (!existing) {
        return null;
      }

      prevStageKey = existing.stageKey;

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
          auditLogs: {
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
    }));

    if (!updatedOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    try {
      await writeAuditLogs(prisma, id, req.user?.id, actorName, [
        {
          action: 'STAGE_CHANGED',
          field: '阶段',
          oldValue: prevStageKey,
          newValue: stage.key,
          metadata: note ? { note: note.toString().trim() } : null
        }
      ]);
    } catch (auditErr) {
      logger.warn('[updateOfflineOrderStage] Audit log write failed:', auditErr.message);
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
      note,
      // 2026-04-20: 列表改造新增三列
      type,
      invoiceStatus,
      totalAmount,
      // [2026-07-31] 订单类别：烫印服装 / DTF打印film
      orderCategory,
      // [2026-07-31] 手动"从报表排除"开关
      excludeFromReports,
      // 2026-04-21: 列表 inline 编辑开始/交期 - 同步到 ProductionWorkOrder
      startDate,
      dueDate,
      // 2026-04-24: 备货/订货情况
      stockingStatus,
      purchaseStatus,
      // [2026-07-31] 订单日期：修正已有订单的 created_at，用于修正销售统计的月份归属；
      // 故意用独立字段名，不复用 startDate（那个改的是 ProductionWorkOrder.startDate，语义完全不同）
      orderDate,
    } = req.body;

    const data = {};
    if (projectName !== undefined) data.projectName = projectName?.trim() || null;
    if (primaryProduct !== undefined) data.primaryProduct = primaryProduct?.trim() || null;
    if (quantity !== undefined) data.quantity = quantity ? parseInt(quantity, 10) || null : null;
    if (deliveryDate !== undefined) data.deliveryDate = parseDate(deliveryDate);
    // [2026-07-31] 订单日期：补录/修正历史订单时用，直接覆盖 created_at（销售统计按此字段筛选月份）
    if (orderDate !== undefined) {
      const parsedOrderDate = orderDate ? parseDate(orderDate) : null;
      if (orderDate && !parsedOrderDate) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'Invalid orderDate',
          field: 'orderDate',
        });
      }
      if (parsedOrderDate) {
        data.createdAt = parsedOrderDate;
      }
    }
    if (description !== undefined) data.description = description?.trim() || null;
    if (requiresMockups !== undefined) data.requiresMockups = parseBoolean(requiresMockups);
    if (requiresProof !== undefined) data.requiresProof = parseBoolean(requiresProof);
    if (rushOrder !== undefined) data.rushOrder = parseBoolean(rushOrder);
    if (excludeFromReports !== undefined) data.excludeFromReports = parseBoolean(excludeFromReports);
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
    // [2026-07-29] 提到 if 块外部：印刷位置设计图上传后需要回写 designAssetId/designAssetUrl 到这个对象里
    let configData = null;
    if (configuration !== undefined) {
      // [2026-03-13 05:15:30] 编辑订单时若更新配置，同步重算成本快照 pricing.costTotal
      configData = safeJsonParse(configuration) || configuration || null;
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
      // 2026-04-20: status 改成自由文本（含用户自定义选项），不再做枚举校验
      const trimmedStatus = status?.toString().trim();
      if (!trimmedStatus) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'status cannot be empty'
        });
      }
      data.status = trimmedStatus;
    }

    // 2026-04-20: 新三列
    if (type !== undefined) {
      const t = type?.toString().trim();
      data.type = t || null;
    }
    // [2026-07-31] 订单类别：烫印服装 / DTF打印film
    if (orderCategory !== undefined) {
      const oc = orderCategory?.toString().trim();
      if (oc && !ORDER_CATEGORY_VALUES.includes(oc)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: `orderCategory must be one of: ${ORDER_CATEGORY_VALUES.join(' / ')}`,
          field: 'orderCategory',
        });
      }
      data.orderCategory = oc || null;
    }
    if (invoiceStatus !== undefined) {
      const v = invoiceStatus?.toString().trim();
      if (v && !['No', 'Require', 'Sent'].includes(v)) {
        return res.status(400).json({
          error: 'Validation Error',
          message: 'invoiceStatus must be one of: No / Require / Sent'
        });
      }
      data.invoiceStatus = v || 'No';
    }
    if (totalAmount !== undefined) {
      if (totalAmount === null || totalAmount === '') {
        data.totalAmount = null;
      } else {
        const amt = parseFloat(totalAmount);
        if (Number.isNaN(amt) || amt < 0) {
          return res.status(400).json({
            error: 'Validation Error',
            message: 'totalAmount must be a non-negative number'
          });
        }
        data.totalAmount = amt;
      }
    }

    // 2026-04-24: 备货/订货情况
    if (stockingStatus !== undefined) {
      data.stockingStatus = stockingStatus?.toString().trim() || null;
    }
    if (purchaseStatus !== undefined) {
      data.purchaseStatus = purchaseStatus?.toString().trim() || null;
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const filesByField = Array.isArray(req.files) ? { assets: req.files } : (req.files || {});
    const files = filesByField.assets || [];
    const positionFiles = filesByField.positionAssets || [];
    const positionAssetMap = safeJsonParse(req.body.positionAssetMap) || [];

    let newAssetPayloads = [];
    let positionAssetPayloads = [];
    try {
      if (files.length > 0) {
        newAssetPayloads = await Promise.all(files.map(processAssetUpload));
      }
      if (positionFiles.length > 0) {
        positionAssetPayloads = await processPositionAssetUploads(positionFiles, positionAssetMap, configData);
      }
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
    newAssetPayloads = [...newAssetPayloads, ...positionAssetPayloads];

    // positionAssetPayloads 已经把 designAssetId/designAssetUrl 写回 configData（引用类型，同一对象）；
    // 若本次请求带了新的位置设计图但没有一并提交 configuration，需要把回写结果补进 data.configuration
    if (positionAssetPayloads.length > 0 && configData && data.configuration === undefined) {
      data.configuration = configData;
    }

    let capturedUpdateAuditEntries = [];
    const updatedOrder = await prisma.executeWithRetry(() => {
      capturedUpdateAuditEntries = [];
      return prisma.$transaction(async (tx) => {
      const existing = await tx.offlineOrder.findUnique({
        where: { id },
        select: {
          id: true,
          stageKey: true,
          status: true,
          createdAt: true,
          projectName: true,
          primaryProduct: true,
          quantity: true,
          deliveryDate: true,
          description: true,
          requiresMockups: true,
          requiresProof: true,
          rushOrder: true,
          rush_fee: true,
          contactName: true,
          company: true,
          email: true,
          phone: true,
          type: true,
          invoiceStatus: true,
          totalAmount: true,
          payment_method: true,
          reference_number: true,
          deposit_amount: true,
          productionWorkOrder: {
            select: { id: true, startDate: true, dueDate: true, assigneeName: true }
          }
        }
      });

      if (!existing) {
        return null;
      }

      // 2026-04-21: 列表 inline 编辑开始/交期 → upsert 到 ProductionWorkOrder
      // 2026-04-27: 任意字段 PATCH 时，若 productionWorkOrder.startDate 为空则自动补今天
      const shouldUpsertWorkOrder =
        startDate !== undefined ||
        dueDate !== undefined ||
        (!existing.productionWorkOrder?.startDate && Object.keys(data).length > 0);

      logger.info('[autoStartDate] debug', {
        orderId: id,
        dataKeys: Object.keys(data),
        startDate,
        dueDate,
        existingWorkOrder: existing.productionWorkOrder
          ? { id: existing.productionWorkOrder.id, startDate: existing.productionWorkOrder.startDate }
          : null,
        shouldUpsertWorkOrder,
      });

      if (shouldUpsertWorkOrder) {
        const workOrderData = {};
        if (startDate !== undefined) workOrderData.startDate = parseDate(startDate);
        if (dueDate !== undefined) workOrderData.dueDate = parseDate(dueDate);

        // 自动补 startDate：仅当调用方未明确提供 startDate，且当前无 startDate 时
        if (startDate === undefined && !existing.productionWorkOrder?.startDate) {
          workOrderData.startDate = new Date();
          logger.info('[autoStartDate] auto-filling startDate', { orderId: id, startDate: workOrderData.startDate });
        }

        if (existing.productionWorkOrder) {
          await tx.productionWorkOrder.update({
            where: { id: existing.productionWorkOrder.id },
            data: workOrderData
          });
        } else {
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
          await tx.productionWorkOrder.create({
            data: {
              workOrderCode,
              offlineOrderId: id,
              status: 'PLANNING',
              priority: 0,
              ...workOrderData,
              events: {
                create: [
                  {
                    status: 'PLANNING',
                    actorId: req.user?.id || null,
                    actorName,
                    note: 'Production work order auto-created from inline date edit'
                  }
                ]
              }
            }
          });
          capturedUpdateAuditEntries.push({
            action: 'WORK_ORDER_AUTO_CREATED',
            metadata: {
              workOrderCode,
              startDate: workOrderData.startDate?.toISOString?.() ?? null,
              dueDate: workOrderData.dueDate?.toISOString?.() ?? null,
              trigger: Object.keys(data).join(', ')
            }
          });
        }
      }

      // 2026-04-20: status 改成中文自由文本。
      //   如果修改了配置（添加了新产品等）且当前状态是"已完成"，自动回退到"待确认订单"
      if (
        configuration !== undefined &&
        (existing.status === '已完成' || existing.status === 'COMPLETED') &&
        status === undefined
      ) {
        data.status = '待确认订单';
        logger.info(
          `[OfflineOrder] Order ${id} configuration updated. Reverting status from 已完成 to 待确认订单.`
        );
      }

      const fieldAuditEntries = [];
      for (const [key, newVal] of Object.entries(data)) {
        const fieldLabel = AUDITABLE_FIELDS[key];
        if (!fieldLabel) continue;
        const oldStr = serializeAuditValue(existing[key]);
        const newStr = serializeAuditValue(newVal);
        if (oldStr !== newStr) {
          fieldAuditEntries.push({
            action: 'FIELD_UPDATED',
            field: fieldLabel,
            oldValue: oldStr,
            newValue: newStr,
          });
        }
      }

      const order = await tx.offlineOrder.update({
        where: { id },
        data: {
          ...data,
          ...(newAssetPayloads.length > 0
            ? {
              assets: {
                create: newAssetPayloads.map((asset) => ({
                  ...(asset.id ? { id: asset.id } : {}),
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
          auditLogs: {
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

      if (fieldAuditEntries.length > 0 || note) {
        const noteEntry = note
          ? [{ action: 'NOTE_ADDED', newValue: note.toString().trim() }]
          : [];
        capturedUpdateAuditEntries.push(...fieldAuditEntries, ...noteEntry);
      }

      return order;
    });
    });

    if (!updatedOrder) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    if (capturedUpdateAuditEntries.length > 0) {
      try {
        await writeAuditLogs(prisma, id, req.user?.id, actorName, capturedUpdateAuditEntries);
      } catch (auditErr) {
        logger.warn('[updateOfflineOrder] Audit log write failed:', auditErr.message);
      }
    }

    res.json({
      success: true,
      order: mapOrder(updatedOrder)
    });
  } catch (error) {
    logger.error('Failed to update offline order', error);
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update offline order',
      ...(process.env.NODE_ENV !== 'production' && {
        debug: error?.message,
        code: error?.code,
        meta: error?.meta,
        stack: error?.stack?.split('\n').slice(0,5),
      }),
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

    const order = await prisma.executeWithRetry(() => prisma.$transaction(async (tx) => {
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
          auditLogs: {
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
    }));

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    try {
      await writeAuditLogs(prisma, id, req.user?.id, actorName, [
        { action: 'NOTE_ADDED', newValue: trimmedNote }
      ]);
    } catch (auditErr) {
      logger.warn('[addOfflineOrderNote] Audit log write failed:', auditErr.message);
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

    // comments[i] corresponds to files[i]; sent as JSON string or repeated field
    let commentsRaw = req.body?.comments;
    let comments;
    if (typeof commentsRaw === 'string') {
      try { comments = JSON.parse(commentsRaw); } catch { comments = [commentsRaw]; }
    } else if (Array.isArray(commentsRaw)) {
      comments = commentsRaw;
    } else {
      comments = [];
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

    const order = await prisma.executeWithRetry(() => prisma.$transaction(async (tx) => {
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
            create: assetPayloads.map((asset, i) => ({
              fileName: asset.fileName,
              fileSize: asset.fileSize,
              contentType: asset.contentType,
              storageKey: asset.storageKey,
              url: asset.url,
              uploadedBy: req.user?.id || null,
              comment: comments[i] || null
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
          auditLogs: {
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
    }));

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    try {
      await writeAuditLogs(prisma, id, req.user?.id, actorName,
        assetPayloads.map((asset) => ({
          action: 'FILE_UPLOADED',
          newValue: asset.fileName,
          metadata: { fileSize: asset.fileSize, contentType: asset.contentType }
        }))
      );
    } catch (auditErr) {
      logger.warn('[uploadOfflineOrderAssets] Audit log write failed:', auditErr.message);
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
 * DELETE /api/admin/offline-orders/:id/assets/:assetId
 * 删除订单附件（从 DB + GCS 同时删除）
 */
exports.updateOfflineOrderAssetComment = async (req, res) => {
  try {
    const { id, assetId } = req.params;
    const { comment } = req.body;

    const asset = await prisma.offlineOrderAsset.findFirst({
      where: { id: assetId, orderId: id },
      select: { id: true, comment: true, fileName: true }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Not Found', message: 'Asset not found' });
    }

    const newComment = typeof comment === 'string' ? comment.slice(0, 100) : null;
    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    const [updated] = await Promise.all([
      prisma.offlineOrderAsset.update({
        where: { id: assetId },
        data: { comment: newComment },
        select: { id: true, comment: true }
      }),
      prisma.offlineOrderAuditLog.create({
        data: {
          orderId: id,
          action: 'ASSET_COMMENT_UPDATED',
          field: asset.fileName,
          oldValue: asset.comment ?? null,
          newValue: newComment,
          actorId: req.user?.id || null,
          actorName,
        }
      })
    ]);

    res.json(updated);
  } catch (error) {
    logger.error('[updateOfflineOrderAssetComment] Failed:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to update comment' });
  }
};

exports.deleteOfflineOrderAsset = async (req, res) => {
  try {
    const { id, assetId } = req.params;

    const asset = await prisma.offlineOrderAsset.findFirst({
      where: { id: assetId, orderId: id },
      select: { id: true, storageKey: true, fileName: true }
    });

    if (!asset) {
      return res.status(404).json({ error: 'Not Found', message: 'Asset not found' });
    }

    await prisma.offlineOrderAsset.delete({ where: { id: assetId } });

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    await prisma.offlineOrderAuditLog.create({
      data: {
        orderId: id,
        action: 'FILE_DELETED',
        oldValue: asset.fileName,
        actorId: req.user?.id || null,
        actorName,
      }
    });

    try {
      await deleteFromGcs(asset.storageKey);
    } catch (gcsErr) {
      logger.warn('[deleteOfflineOrderAsset] GCS delete failed (DB already deleted):', gcsErr?.message);
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('[deleteOfflineOrderAsset] Failed:', error);
    res.status(500).json({ error: 'Server Error', message: 'Failed to delete asset' });
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

    let capturedWorkOrderAuditEntries = [];
    const order = await prisma.executeWithRetry(() => prisma.$transaction(async (tx) => {
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

        capturedWorkOrderAuditEntries.push({
          action: 'WORK_ORDER_CREATED',
          metadata: {
            workOrderCode,
            status: baseWorkOrderData.status || 'PLANNING',
            assigneeName: baseWorkOrderData.assigneeName || null,
            dueDate: baseWorkOrderData.dueDate?.toISOString?.() ?? null,
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

        const woAuditEntries = [];
        const existingWO = existingOrder.productionWorkOrder;
        for (const [key, label] of Object.entries(AUDITABLE_WO_FIELDS)) {
          if (!(key in baseWorkOrderData)) continue;
          const oldStr = serializeAuditValue(existingWO[key]);
          const newStr = serializeAuditValue(baseWorkOrderData[key]);
          if (oldStr !== newStr) {
            woAuditEntries.push({
              action: key === 'assigneeName' ? 'ASSIGNEE_CHANGED' : 'WORK_ORDER_UPDATED',
              field: label,
              oldValue: oldStr,
              newValue: newStr,
            });
          }
        }
        if (woAuditEntries.length > 0) {
          capturedWorkOrderAuditEntries.push(...woAuditEntries);
        }
      }

      return tx.offlineOrder.findUnique({
        where: { id },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' }
          },
          auditLogs: {
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
    }));

    if (!order) {
      return res.status(404).json({
        error: 'Not Found',
        message: 'Offline order not found'
      });
    }

    if (capturedWorkOrderAuditEntries.length > 0) {
      try {
        await writeAuditLogs(prisma, id, req.user?.id, actorName, capturedWorkOrderAuditEntries);
      } catch (auditErr) {
        logger.warn('[createOrUpdateProductionWorkOrder] Audit log write failed:', auditErr.message);
      }
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

    await Promise.all(
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
        projectName: true,
        status: true,
        stageKey: true,
        quantity: true,
        totalAmount: true,
        createdAt: true,
        _count: { select: { assets: true, histories: true, auditLogs: true } },
        productionWorkOrder: { select: { id: true, status: true } }
      },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: '订单不存在',
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Admin';

    // 级联删除会同时清除 auditLogs，在删除前用结构化日志保留完整痕迹
    logger.info('[deleteOfflineOrder] ORDER_DELETED', {
      orderId: id,
      orderCode: existing.orderCode,
      projectName: existing.projectName,
      status: existing.status,
      stageKey: existing.stageKey,
      quantity: existing.quantity,
      totalAmount: existing.totalAmount,
      createdAt: existing.createdAt,
      assetCount: existing._count.assets,
      historyCount: existing._count.histories,
      auditLogCount: existing._count.auditLogs,
      hasWorkOrder: !!existing.productionWorkOrder,
      workOrderStatus: existing.productionWorkOrder?.status ?? null,
      deletedBy: req.user?.id ?? null,
      deletedByName: actorName,
      deletedAt: new Date().toISOString(),
    });

    // 直接删除订单，依赖数据库的级联删除（Cascade Delete）处理关联数据
    await prisma.offlineOrder.delete({
      where: { id },
    });

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


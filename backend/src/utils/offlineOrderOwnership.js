/**
 * 线下订单归属（owner）判定与写操作守卫
 *
 * [2026-08-18] 需求：线下销售管理模块此前任何 SALES / SALES_MANAGER / ADMIN 都能改任何人的订单。
 * 新规则：**所有人一视同仁**（含 ADMIN），对「别人创建的订单」只能改 status，其余字段只读预览。
 *
 * 归属来源：OfflineOrder.metadata.submittedByUserId（表上没有独立的 owner 列，
 * 该字段由 createOfflineOrder 写入，列表统计的 creatorId 也用它）。
 *
 * 历史订单可能没有这个字段（无归属）。这类订单**保持所有人可编辑**——
 * 否则旧数据会被永久锁死，只能改数据库才能修正。
 */
const prisma = require('../lib/prisma');
const logger = require('./logger');

/** 非创建者在 PATCH /:id 上被允许提交的字段（其余一律 403） */
const NON_OWNER_WRITABLE_FIELDS = new Set(['status', 'note']);

const getOfflineOrderCreatorId = (order) => {
  const metadata = order?.metadata;
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const id = metadata.submittedByUserId;
  return typeof id === 'string' && id.trim() ? id.trim() : null;
};

/** 无归属的历史订单视为所有人可编辑；有归属时仅创建者本人可编辑 */
const isOfflineOrderEditableBy = (order, userId) => {
  const creatorId = getOfflineOrderCreatorId(order);
  if (!creatorId) return true;
  return Boolean(userId) && creatorId === userId;
};

const loadOwnershipRecord = (orderId) =>
  prisma.offlineOrder.findUnique({
    where: { id: orderId },
    select: { id: true, metadata: true },
  });

const forbidden = (res) =>
  res.status(403).json({
    error: 'Forbidden',
    code: 'OFFLINE_ORDER_NOT_OWNER',
    message: '该订单由其他同事创建，你只能查看并修改 Status，无法修改其它内容。',
  });

const notFound = (res) =>
  res.status(404).json({
    error: 'Not Found',
    message: 'Offline order not found',
  });

/**
 * 中间件：整个写操作仅限订单创建者
 * 用于 阶段变更 / 附件上传删除改备注 / 生产工单
 */
const requireOfflineOrderOwner = async (req, res, next) => {
  try {
    const order = await loadOwnershipRecord(req.params.id);
    if (!order) return notFound(res);
    if (!isOfflineOrderEditableBy(order, req.user?.id)) return forbidden(res);
    return next();
  } catch (error) {
    logger.error('[requireOfflineOrderOwner] ownership check failed', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify offline order ownership',
    });
  }
};

/**
 * 中间件：PATCH /:id 的字段级守卫
 * 创建者本人放行全部字段；非创建者只允许提交 status（可带 note），且不允许上传文件。
 * 必须挂在 multer 之后，否则 multipart 请求读不到 req.body / req.files。
 */
const restrictNonOwnerUpdateToStatus = async (req, res, next) => {
  try {
    const order = await loadOwnershipRecord(req.params.id);
    if (!order) return notFound(res);
    // 供 controller 使用：本人编辑时 metadata 会被整体覆盖，需要把原始 submittedByUserId 保回去，
    // 否则一次编辑就会让订单变成「无归属」，权限规则随之失效
    req.offlineOrderCreatorId = getOfflineOrderCreatorId(order);
    if (isOfflineOrderEditableBy(order, req.user?.id)) return next();

    const submittedFields = Object.keys(req.body || {});
    const disallowed = submittedFields.filter((field) => !NON_OWNER_WRITABLE_FIELDS.has(field));
    const fileFields = req.files
      ? (Array.isArray(req.files) ? ['files'] : Object.keys(req.files))
      : [];

    if (disallowed.length > 0 || fileFields.length > 0) {
      return forbidden(res);
    }
    return next();
  } catch (error) {
    logger.error('[restrictNonOwnerUpdateToStatus] ownership check failed', error);
    return res.status(500).json({
      error: 'Server Error',
      message: 'Failed to verify offline order ownership',
    });
  }
};

module.exports = {
  NON_OWNER_WRITABLE_FIELDS,
  getOfflineOrderCreatorId,
  isOfflineOrderEditableBy,
  requireOfflineOrderOwner,
  restrictNonOwnerUpdateToStatus,
};

/**
 * Sales Offline Order Controller
 * [2025-12-02 04:47:00] 为 Sales/Sales Manager 提供线下订单列表和详情接口
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

// [2025-12-02 04:47:00] Sales 订单映射函数
// [2025-01-28 21:30:00] 添加 configuration 和其他字段支持详情页面显示
const mapSalesOfflineOrder = (order, includeDetails = false) => {
  const base = {
    id: order.id,
    orderCode: order.orderCode,
    projectName: order.projectName,
    primaryProduct: order.primaryProduct,
    quantity: order.quantity,
    deliveryDate: order.deliveryDate,
    status: order.status,
    rushOrder: order.rushOrder,
    stage: {
      key: order.stageKey,
      label: order.stageLabel,
      position: order.stagePosition,
    },
    contact: {
      name: order.contactName,
      company: order.company,
      email: order.email,
      phone: order.phone,
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };

  // [2025-01-28 21:30:00] 详情接口包含完整配置信息
  if (includeDetails) {
    return {
      ...base,
      description: order.description, // 设计说明
      requiresMockups: order.requiresMockups,
      requiresProof: order.requiresProof,
      configuration: order.configuration, // 包含 productItems, printPositions, pricing, invoiceInfo 等
      metadata: order.metadata,
    };
  }

  return base;
};

/**
 * GET /api/sales/orders
 * [2025-12-02 04:47:00] Sales 订单列表
 */
exports.listSalesOrders = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;

    const roleRaw = req.user?.role || '';
    const role = String(roleRaw).toUpperCase();
    const isManager = role === 'SALES_MANAGER' || role === 'ADMIN';
    const userId = req.user?.id;

    logger.info('[SalesOrders] listSalesOrders', {
      timestamp,
      userId,
      role,
      isManager,
      page,
      limit,
    });

    const where = {};

    // [2025-12-02 04:47:00] 普通 Sales 只看自己提交的订单（通过 metadata.submittedByUserId）
    if (!isManager && userId) {
      where.metadata = {
        path: ['submittedByUserId'],
        equals: userId,
      };
    }

    const [orders, total] = await prisma.$transaction([
      prisma.offlineOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { orderCode: 'desc' },
        ],
      }),
      prisma.offlineOrder.count({ where }),
    ]);

    res.json({
      data: orders.map(mapSalesOfflineOrder),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('[SalesOrders] listSalesOrders error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to list sales orders' });
  }
};

/**
 * GET /api/sales/orders/:id
 * [2025-12-02 04:47:00] Sales 订单详情
 */
exports.getSalesOrderById = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const roleRaw = req.user?.role || '';
    const role = String(roleRaw).toUpperCase();
    const isManager = role === 'SALES_MANAGER' || role === 'ADMIN';
    const userId = req.user?.id;

    logger.info('[SalesOrders] getSalesOrderById', {
      timestamp,
      id,
      userId,
      role,
      isManager,
    });

    const order = await prisma.offlineOrder.findUnique({
      where: { id },
      include: {
        assets: true,
        histories: true,
        productionWorkOrder: {
          include: {
            events: true,
          },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Offline order not found' });
    }

    // [2025-12-02 04:47:00] 普通 Sales 只能访问自己提交的订单
    const submittedByUserId = order.metadata?.submittedByUserId || order.metadata?.submitted_by_user_id || null;
    if (!isManager && userId && submittedByUserId && submittedByUserId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to view this order' });
    }

    // [2025-01-28 21:30:00] 详情接口包含完整配置信息
    res.json({
      order: {
        ...mapSalesOfflineOrder(order, true), // 传入 true 包含详情字段
        assets: order.assets || [],
        histories: order.histories || [],
        productionWorkOrder: order.productionWorkOrder || null,
      },
    });
  } catch (error) {
    logger.error('[SalesOrders] getSalesOrderById error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch sales order detail' });
  }
};

/**
 * PATCH /api/sales/orders/:id/stage
 * [2025-12-07 03:00:00] Sales 更新订单阶段
 */
exports.updateSalesOrderStage = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { stageKey, note } = req.body;

    if (!stageKey) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'stageKey is required'
      });
    }

    const roleRaw = req.user?.role || '';
    const role = String(roleRaw).toUpperCase();
    const isManager = role === 'SALES_MANAGER' || role === 'ADMIN';
    const userId = req.user?.id;

    logger.info('[SalesOrders] updateSalesOrderStage', {
      timestamp,
      id,
      userId,
      role,
      isManager,
      stageKey,
    });

    // 获取订单并检查权限
    const order = await prisma.offlineOrder.findUnique({
      where: { id },
      select: {
        id: true,
        stageKey: true,
        metadata: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Offline order not found' });
    }

    // [2025-12-07 03:00:00] 普通 Sales 只能修改自己提交的订单
    const submittedByUserId = order.metadata?.submittedByUserId || order.metadata?.submitted_by_user_id || null;
    if (!isManager && userId && submittedByUserId && submittedByUserId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this order' });
    }

    // 获取阶段配置（复用workflow service的逻辑）
    const { findStageByKey } = require('../services/offlineWorkflowService');
    const stage = await findStageByKey(stageKey);
    if (!stage) {
      return res.status(400).json({
        error: 'Validation Error',
        message: 'Invalid stage key'
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Sales';

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
          stagePosition: stage.position ?? null,
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

    logger.info('[SalesOrders] updateSalesOrderStage success', {
      timestamp,
      id,
      userId,
      fromStage: order.stageKey,
      toStage: stageKey,
    });

    res.json({
      success: true,
      order: mapSalesOfflineOrder(updatedOrder, true),
    });
  } catch (error) {
    logger.error('[SalesOrders] updateSalesOrderStage error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update sales order stage'
    });
  }
};



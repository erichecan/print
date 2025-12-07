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

    // [2025-12-07 04:50:00] 查询订单时，同时获取创建者信息（用于销售主管查看）
    const [orders, total] = await prisma.$transaction([
      prisma.offlineOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: [
          { createdAt: 'desc' },
          { orderCode: 'desc' },
        ],
        include: {
          // [2025-12-07 04:50:00] 通过 metadata.submittedByUserId 查找创建者
          // 注意：这里需要手动查询用户信息，因为 Prisma 不支持通过 JSON 字段关联
        },
      }),
      prisma.offlineOrder.count({ where }),
    ]);

    // [2025-12-07 04:50:00] 获取所有订单的创建者信息
    const submittedByUserIds = orders
      .map(order => order.metadata?.submittedByUserId || order.metadata?.submitted_by_user_id)
      .filter(Boolean);
    
    const creators = submittedByUserIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: submittedByUserIds } },
          select: { id: true, email: true, firstName: true, lastName: true },
        })
      : [];
    
    const creatorMap = new Map(creators.map(u => [u.id, u]));

    res.json({
      data: orders.map(order => {
        const mapped = mapSalesOfflineOrder(order);
        // [2025-12-07 04:50:00] 添加创建者信息
        const submittedByUserId = order.metadata?.submittedByUserId || order.metadata?.submitted_by_user_id;
        if (submittedByUserId && creatorMap.has(submittedByUserId)) {
          const creator = creatorMap.get(submittedByUserId);
          mapped.creator = {
            id: creator.id,
            email: creator.email,
            name: creator.firstName && creator.lastName 
              ? `${creator.firstName} ${creator.lastName}` 
              : creator.email.split('@')[0],
          };
        }
        return mapped;
      }),
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

/**
 * PATCH /api/sales/orders/:id/status
 * [2025-12-07 05:15:00] Sales 更新订单状态（ACTIVE, COMPLETED, CANCELLED）
 * [2025-12-07 05:25:00] 支持同时更新加急状态（rushOrder）
 */
exports.updateSalesOrderStatus = async (req, res) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { status, rushOrder } = req.body;

    const roleRaw = req.user?.role || '';
    const role = String(roleRaw).toUpperCase();
    const isManager = role === 'SALES_MANAGER' || role === 'ADMIN';
    const userId = req.user?.id;

    logger.info('[SalesOrders] updateSalesOrderStatus', {
      timestamp,
      id,
      userId,
      role,
      isManager,
      newStatus: status,
    });

    // [2025-12-07 05:15:00] 验证状态值
    const validStatuses = ['ACTIVE', 'COMPLETED', 'CANCELLED'];
    const normalizedStatus = status ? String(status).toUpperCase() : null;
    if (!normalizedStatus || !validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({
        error: 'Validation Error',
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    // [2025-12-07 05:15:00] 查找订单并验证权限
    // [2025-12-07 08:00:00] 修复：包含 rushOrder 字段用于比较
    const order = await prisma.offlineOrder.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        rushOrder: true,
        metadata: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Offline order not found' });
    }

    // [2025-12-07 05:15:00] 普通 Sales 只能修改自己提交的订单
    const submittedByUserId = order.metadata?.submittedByUserId || order.metadata?.submitted_by_user_id || null;
    if (!isManager && userId && submittedByUserId && submittedByUserId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to update this order' });
    }

    // [2025-12-07 05:15:00] 检查是否需要更新
    const statusUnchanged = order.status === normalizedStatus;
    const rushOrderNeedsUpdate = rushOrder !== undefined && order.rushOrder !== Boolean(rushOrder);
    
    // [2025-12-07 05:30:00] 如果状态和加急标记都没有变化，直接返回
    if (statusUnchanged && !rushOrderNeedsUpdate) {
      const currentOrder = await prisma.offlineOrder.findUnique({
        where: { id },
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' },
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });
      return res.json({
        success: true,
        order: mapSalesOfflineOrder(currentOrder, true),
      });
    }

    const actorName = req.user
      ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email
      : 'Sales';

    // [2025-12-07 05:15:00] 更新订单状态
    // [2025-12-07 05:25:00] 如果提供了 rushOrder，同时更新加急状态
    const updateData = {
      status: normalizedStatus,
      histories: {
        create: {
          fromStageKey: null,
          toStageKey: null,
          actorId: req.user?.id || null,
          actorName,
          note: `Status changed from ${order.status} to ${normalizedStatus}${rushOrder !== undefined ? (rushOrder ? ' (Rush)' : ' (Normal)') : ''}`,
        },
      },
    };

    // [2025-12-07 05:25:00] 如果提供了 rushOrder 参数，更新加急状态
    if (rushOrder !== undefined) {
      updateData.rushOrder = Boolean(rushOrder);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      const order = await tx.offlineOrder.update({
        where: { id },
        data: updateData,
        include: {
          assets: true,
          histories: {
            orderBy: { createdAt: 'desc' },
          },
          productionWorkOrder: {
            include: {
              events: {
                orderBy: { createdAt: 'desc' },
              },
            },
          },
        },
      });

      return order;
    });

    logger.info('[SalesOrders] updateSalesOrderStatus success', {
      timestamp,
      id,
      userId,
      fromStatus: order.status,
      toStatus: normalizedStatus,
    });

    res.json({
      success: true,
      order: mapSalesOfflineOrder(updatedOrder, true),
    });
  } catch (error) {
    logger.error('[SalesOrders] updateSalesOrderStatus error', {
      timestamp,
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Server Error',
      message: 'Failed to update sales order status',
    });
  }
};



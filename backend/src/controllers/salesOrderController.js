/**
 * Sales Offline Order Controller
 * [2025-12-02 04:47:00] 为 Sales/Sales Manager 提供线下订单列表和详情接口
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');

const mapSalesOfflineOrder = (order) => ({
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
});

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

    res.json({
      order: {
        ...mapSalesOfflineOrder(order),
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



/**
 * Unified Order Controller
 * [2025-12-08] 统一订单管理：合并线上订单（Order）和线下订单（OfflineOrder）
 * 提供统一的查询、筛选、排序、分页和导出功能
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { InternalServerError } = require('../utils/errors');

// 统一状态枚举（用于前端展示）
const UNIFIED_STATUSES = {
  // 线上订单状态映射
  PENDING: 'pending',
  PROCESSING: 'processing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
  // 线下订单状态映射
  ACTIVE: 'processing', // 线下订单的ACTIVE映射为processing
  COMPLETED: 'completed',
};

// 线下订单状态到统一状态的映射
const OFFLINE_STATUS_MAP = {
  ACTIVE: 'processing',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

// 统一状态到线上订单状态的映射（用于筛选）
const UNIFIED_TO_ONLINE_STATUS = {
  pending: 'PENDING',
  processing: 'PROCESSING',
  shipped: 'SHIPPED',
  delivered: 'DELIVERED',
  cancelled: 'CANCELLED',
  refunded: 'REFUNDED',
};

// 统一状态到线下订单状态的映射（用于筛选）
const UNIFIED_TO_OFFLINE_STATUS = {
  processing: 'ACTIVE',
  completed: 'COMPLETED',
  cancelled: 'CANCELLED',
};

/**
 * 将线上订单映射为统一DTO
 */
const mapOnlineOrderToDTO = (order) => {
  const shippingAddress = order.shippingAddress || {};
  const shippingAddressSummary = shippingAddress.address
    ? `${shippingAddress.address}, ${shippingAddress.city || ''} ${shippingAddress.province || ''} ${shippingAddress.postalCode || ''}`.trim()
    : null;

  return {
    id: order.id,
    compositeId: `online-${order.id}`,
    type: 'online',
    status: UNIFIED_STATUSES[order.status] || order.status.toLowerCase(),
    orderNo: order.orderNumber,
    customerName: shippingAddress.name || order.email?.split('@')[0] || '—',
    customerPhone: shippingAddress.phone || null,
    customerEmail: order.email,
    totalAmount: Number(order.total),
    currency: order.currency || 'CAD',
    itemsCount: order._count?.items || order.items?.length || 0,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString() || order.createdAt.toISOString(),
    channelInfo: {
      channel: 'web',
      source: 'online',
    },
    shippingAddressSummary,
    notes: null, // 线上订单暂无notes字段
    paymentStatus: order.paymentStatus?.toLowerCase() || 'pending',
    trackingNumber: order.trackingNumber,
    carrier: order.carrier,
  };
};

/**
 * 将线下订单映射为统一DTO
 */
const mapOfflineOrderToDTO = (order) => {
  // 从metadata中提取信息
  const metadata = order.metadata || {};
  const configuration = order.configuration || {};

  // 计算总金额（如果有配置信息）
  let totalAmount = 0;
  if (configuration.totalAmount) {
    totalAmount = Number(configuration.totalAmount);
  } else if (order.dst_file_fee) {
    totalAmount = Number(order.dst_file_fee);
  }

  // 获取商品数量
  const itemsCount = order.quantity || 1;

  // 获取地址信息（如果有）
  const shippingAddress = configuration.shippingAddress || {};
  const shippingAddressSummary = shippingAddress.address
    ? `${shippingAddress.address}, ${shippingAddress.city || ''} ${shippingAddress.province || ''} ${shippingAddress.postalCode || ''}`.trim()
    : null;

  return {
    id: order.id,
    compositeId: `offline-${order.id}`,
    type: 'offline',
    status: OFFLINE_STATUS_MAP[order.status] || 'processing',
    orderNo: order.orderCode,
    customerName: order.contactName || '—',
    customerPhone: order.phone || null,
    customerEmail: order.email || null, // [2025-12-18 16:30:00] email 可能为 null
    totalAmount,
    currency: configuration.currency || 'CAD',
    itemsCount,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt?.toISOString() || order.createdAt.toISOString(),
    channelInfo: {
      channel: metadata.channel || 'manual',
      source: 'offline',
    },
    shippingAddressSummary,
    notes: order.order_notes || order.description || null,
    stageKey: order.stageKey,
    stageLabel: order.stageLabel,
    projectName: order.projectName,
  };
};

/**
 * 合并并分页结果
 */
const mergeAndPaginate = (onlineResults, offlineResults, query) => {
  const { sortBy = 'createdAt', sortOrder = 'desc', page = 1, pageSize = 20 } = query;

  // 合并结果
  const allOrders = [...onlineResults, ...offlineResults];

  // 排序
  allOrders.sort((a, b) => {
    let aValue = a[sortBy];
    let bValue = b[sortBy];

    // 处理日期类型
    if (sortBy === 'createdAt' || sortBy === 'updatedAt') {
      aValue = new Date(aValue).getTime();
      bValue = new Date(bValue).getTime();
    }

    // 处理数字类型
    if (sortBy === 'totalAmount' || sortBy === 'itemsCount') {
      aValue = Number(aValue) || 0;
      bValue = Number(bValue) || 0;
    }

    // 处理字符串类型
    if (typeof aValue === 'string') {
      aValue = aValue.toLowerCase();
    }
    if (typeof bValue === 'string') {
      bValue = bValue.toLowerCase();
    }

    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
    } else {
      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
    }
  });

  // 分页
  const total = allOrders.length;
  const totalPages = Math.ceil(total / pageSize);
  const skip = (page - 1) * pageSize;
  const paginatedOrders = allOrders.slice(skip, skip + pageSize);

  return {
    data: paginatedOrders,
    pagination: {
      page: parseInt(page),
      pageSize: parseInt(pageSize),
      total,
      totalPages,
    },
  };
};

/**
 * 构建线上订单查询条件
 */
const buildOnlineOrderWhere = (query) => {
  const { status, search, dateFrom, dateTo, email } = query;
  const where = {};

  // 状态筛选
  if (status && status !== 'all') {
    const onlineStatus = UNIFIED_TO_ONLINE_STATUS[status];
    if (onlineStatus) {
      where.status = onlineStatus;
    }
  }

  // 搜索条件
  if (search && search.length >= 2) {
    where.OR = [
      { orderNumber: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];

    // 如果搜索条件可能是订单号，也尝试匹配
    if (search.match(/^[A-Z0-9-]+$/i)) {
      where.OR.push({ orderNumber: { contains: search, mode: 'insensitive' } });
    }
  }

  // 邮箱筛选
  if (email) {
    where.email = { contains: email, mode: 'insensitive' };
  }

  // 日期范围
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      where.createdAt.lte = new Date(dateTo);
    }
  }

  return where;
};

/**
 * 构建线下订单查询条件
 */
const buildOfflineOrderWhere = (query) => {
  const { status, search, dateFrom, dateTo, email } = query;
  const where = {
    AND: [],
  };

  // 状态筛选
  if (status && status !== 'all') {
    const offlineStatus = UNIFIED_TO_OFFLINE_STATUS[status];
    if (offlineStatus) {
      where.AND.push({ status: offlineStatus });
    }
  }

  // 搜索条件
  if (search && search.length >= 2) {
    where.AND.push({
      OR: [
        { orderCode: { contains: search, mode: 'insensitive' } },
        { projectName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { order_notes: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  // 邮箱筛选
  if (email) {
    where.AND.push({ email: { contains: email, mode: 'insensitive' } });
  }

  // 日期范围
  if (dateFrom || dateTo) {
    const dateFilter = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      dateFilter.lte = new Date(dateTo);
    }
    where.AND.push({ createdAt: dateFilter });
  }

  return where.AND.length > 0 ? where : undefined;
};

/**
 * GET /api/admin/all-orders
 * 统一订单列表查询
 */
exports.listAllOrders = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    // 解析查询参数
    const {
      page = 1,
      pageSize = 20,
      type = 'all', // 'all' | 'online' | 'offline'
      status,
      search,
      dateFrom,
      dateTo,
      email,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    // 参数验证
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const pageSizeNum = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 200); // 最大200

    if (search && search.length < 2) {
      return res.status(400).json({
        error: 'Search term must be at least 2 characters',
      });
    }

    const query = {
      page: pageNum,
      pageSize: pageSizeNum,
      type,
      status,
      search: search?.trim(),
      dateFrom,
      dateTo,
      email: email?.trim(),
      sortBy,
      sortOrder: sortOrder.toLowerCase() === 'asc' ? 'asc' : 'desc',
    };

    logger.info('[UnifiedOrders] listAllOrders', {
      timestamp,
      query,
      userId: req.user?.id,
    });

    const warnings = [];
    let onlineOrders = [];
    let offlineOrders = [];

    // 查询线上订单
    if (type === 'all' || type === 'online') {
      try {
        const onlineWhere = buildOnlineOrderWhere(query);
        const orders = await prisma.order.findMany({
          where: onlineWhere,
          include: {
            items: {
              take: 1,
            },
            _count: {
              select: {
                items: true,
              },
            },
          },
        });

        onlineOrders = orders.map(mapOnlineOrderToDTO);
        logger.info('[UnifiedOrders] Online orders fetched', {
          count: onlineOrders.length,
        });
      } catch (error) {
        logger.error('[UnifiedOrders] Failed to fetch online orders', {
          error: error.message,
          stack: error.stack,
        });
        warnings.push('onlineQueryFailed');
        // 继续执行，返回部分数据
      }
    }

    // 查询线下订单
    if (type === 'all' || type === 'offline') {
      try {
        const offlineWhere = buildOfflineOrderWhere(query);
        const orders = await prisma.offlineOrder.findMany({
          where: offlineWhere,
          include: {
            assets: {
              take: 1,
            },
          },
        });

        offlineOrders = orders.map(mapOfflineOrderToDTO);
        logger.info('[UnifiedOrders] Offline orders fetched', {
          count: offlineOrders.length,
        });
      } catch (error) {
        logger.error('[UnifiedOrders] Failed to fetch offline orders', {
          error: error.message,
          stack: error.stack,
        });
        warnings.push('offlineQueryFailed');
        // 继续执行，返回部分数据
      }
    }

    // 合并和分页
    const result = mergeAndPaginate(onlineOrders, offlineOrders, query);

    res.json({
      success: true,
      data: result.data,
      pagination: result.pagination,
      meta: {
        aggregated: true,
        warnings: warnings.length > 0 ? warnings : undefined,
      },
    });
  } catch (error) {
    logger.error('[UnifiedOrders] Error listing all orders', {
      timestamp,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    next(new InternalServerError('无法获取订单列表，请稍后重试'));
  }
};

/**
 * GET /api/admin/all-orders/export
 * 导出统一订单列表为CSV
 */
exports.exportAllOrders = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const {
      type = 'all',
      status,
      search,
      dateFrom,
      dateTo,
      email,
    } = req.query;

    const query = {
      type,
      status,
      search: search?.trim(),
      dateFrom,
      dateTo,
      email: email?.trim(),
    };

    logger.info('[UnifiedOrders] exportAllOrders', {
      timestamp,
      query,
      userId: req.user?.id,
    });

    let onlineOrders = [];
    let offlineOrders = [];

    // 查询线上订单（不限制数量，用于导出）
    if (type === 'all' || type === 'online') {
      try {
        const onlineWhere = buildOnlineOrderWhere(query);
        const orders = await prisma.order.findMany({
          where: onlineWhere,
          include: {
            _count: {
              select: {
                items: true,
              },
            },
          },
          take: 10000, // 限制最大导出数量
        });
        onlineOrders = orders.map(mapOnlineOrderToDTO);
      } catch (error) {
        logger.error('[UnifiedOrders] Failed to fetch online orders for export', {
          error: error.message,
        });
      }
    }

    // 查询线下订单
    if (type === 'all' || type === 'offline') {
      try {
        const offlineWhere = buildOfflineOrderWhere(query);
        const orders = await prisma.offlineOrder.findMany({
          where: offlineWhere,
          take: 10000, // 限制最大导出数量
        });
        offlineOrders = orders.map(mapOfflineOrderToDTO);
      } catch (error) {
        logger.error('[UnifiedOrders] Failed to fetch offline orders for export', {
          error: error.message,
        });
      }
    }

    // 合并结果（按创建时间倒序）
    const allOrders = [...onlineOrders, ...offlineOrders].sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    // 生成CSV
    const csvHeaders = [
      'Order Type',
      'Order Number',
      'Customer Name',
      'Email',
      'Phone',
      'Status',
      'Total Amount',
      'Currency',
      'Items Count',
      'Created At',
      'Shipping Address',
      'Notes',
    ];

    const csvRows = allOrders.map((order) => {
      return [
        order.type === 'online' ? 'Online' : 'Offline',
        order.orderNo,
        order.customerName || '—',
        order.customerEmail || '—',
        order.customerPhone || '—',
        order.status,
        order.totalAmount.toFixed(2),
        order.currency,
        order.itemsCount.toString(),
        new Date(order.createdAt).toISOString(),
        order.shippingAddressSummary || '—',
        order.notes || '—',
      ];
    });

    // CSV转义函数
    const escapeCsvValue = (value) => {
      const str = String(value);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const csvContent = [
      csvHeaders.map(escapeCsvValue).join(','),
      ...csvRows.map((row) => row.map((cell) => escapeCsvValue(String(cell))).join(',')),
    ].join('\n');

    // 设置响应头
    const filename = `all-orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // 添加BOM以支持Excel
    res.write('\ufeff');
    res.end(csvContent);

    logger.info('[UnifiedOrders] Orders exported', {
      timestamp,
      orderCount: allOrders.length,
      filters: query,
      userId: req.user?.id,
    });
  } catch (error) {
    logger.error('[UnifiedOrders] Error exporting orders', {
      timestamp,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    next(new InternalServerError('导出订单失败，请稍后重试'));
  }
};


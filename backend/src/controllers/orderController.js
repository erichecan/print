/**
 * Order Controller
 * [2025-11-04 23:54:00]
 * [2025-01-27 13:20:00] Enhanced with order cancellation and query optimization
 */
const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit'); // [2025-11-12 01:05:02] 用于生成发票 PDF
const { Readable } = require('stream');
const logger = require('../utils/logger');
const { cancelOrder, canCancelOrder } = require('../services/orderService');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
const { sendOrderConfirmation } = require('../services/emailService');

/**
 * GET /api/orders - List user's orders with filtering, sorting, and search
 * [2025-11-04 23:54:00]
 * [2025-01-27 13:20:00] Enhanced with filtering, sorting, and search
 */
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Pagination
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
    const skip = (page - 1) * limit;

    // Filtering
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const paymentStatus = req.query.paymentStatus
      ? String(req.query.paymentStatus).toUpperCase()
      : undefined;

    // Search
    const search = req.query.search?.trim();

    // Sorting
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where = { userId };

    if (status) {
      const allowedStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
      if (allowedStatuses.includes(status)) {
        where.status = status;
      }
    }

    if (paymentStatus) {
      const allowedPaymentStatuses = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];
      if (allowedPaymentStatuses.includes(paymentStatus)) {
        where.paymentStatus = paymentStatus;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy = {};
    const allowedSortFields = ['createdAt', 'updatedAt', 'total', 'orderNumber'];
    if (allowedSortFields.includes(sortBy)) {
      orderBy[sortBy] = sortOrder;
    } else {
      orderBy.createdAt = 'desc';
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          items: {
            take: 1,
            include: {
              variant: {
                include: {
                  product: {
                    include: {
                      images: {
                        orderBy: { sortOrder: 'asc' },
                        take: 1,
                      },
                    },
                  },
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
            },
          },
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status.toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        total: Number(order.total),
        itemCount: order._count.items,
        thumbnail: order.items[0]?.variant?.product?.images[0]?.url || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      filters: {
        status: status || null,
        paymentStatus: paymentStatus || null,
        search: search || null,
      },
      sort: {
        sortBy,
        sortOrder,
      },
    });
  } catch (error) {
    logger.error('Error fetching orders:', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
};

/**
 * GET /api/orders/:id - Get order details
 * [2025-11-04 23:54:00]
 */
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if user has access to this order
    if (userId && order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If no userId but order has userId, require authentication
    if (!userId && order.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      currency: order.currency,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantDescription: `${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`.trim(),
        quantity: item.quantity,
        unitPrice: Number(item.priceSnapshot),
        subtotal: Number(item.priceSnapshot) * item.quantity,
        thumbnail: item.variant.imageUrl || item.variant.product.images[0]?.imageUrl || null,
      })),
      shipment: order.shipments[0] ? {
        trackingNumber: order.shipments[0].trackingNumber,
        carrier: order.shipments[0].carrier,
        status: order.shipments[0].status.toLowerCase(),
        labelUrl: order.shipments[0].labelUrl,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

/**
 * GET /api/orders/number/:orderNumber - Get order by order number (for guest access)
 * [2025-11-04 23:54:00]
 */
exports.getOrderByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    const order = await prisma.order.findUnique({
      where: { orderNumber },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  include: {
                    images: {
                      orderBy: { sortOrder: 'asc' },
                      take: 1,
                    },
                  },
                },
              },
            },
          },
        },
        shipments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify email matches
    if (order.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      currency: order.currency,
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantDescription: `${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`.trim(),
        quantity: item.quantity,
        unitPrice: Number(item.priceSnapshot),
        subtotal: Number(item.priceSnapshot) * item.quantity,
        thumbnail: item.variant.imageUrl || item.variant.product.images[0]?.imageUrl || null,
      })),
      shipment: order.shipments[0] ? {
        trackingNumber: order.shipments[0].trackingNumber,
        carrier: order.shipments[0].carrier,
        status: order.shipments[0].status.toLowerCase(),
        labelUrl: order.shipments[0].labelUrl,
      } : null,
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

const formatAddress = (address = {}) => {
  const lines = [
    address.fullName || '',
    address.addressLine1 || '',
    address.addressLine2 || '',
    `${address.city || ''}${address.province ? `, ${address.province}` : ''} ${address.postalCode || ''}`,
    (address.country || '').toUpperCase(),
  ];
  return lines.filter(Boolean).join('\n');
}; // [2025-11-12 01:05:02] 格式化地址文本

const generateInvoicePdf = (order) => {
  const doc = new PDFDocument({ margin: 50 });
  const stream = new Readable({ read() {} });

  doc.on('data', (chunk) => stream.push(chunk));
  doc.on('end', () => stream.push(null));

  doc.fontSize(20).text('Invoice', { align: 'right' });
  doc.moveDown();

  doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
  doc.text(`Date: ${order.createdAt.toISOString().slice(0, 10)}`);
  doc.text(`Payment Status: ${order.paymentStatus.toLowerCase()}`);
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Bill To:');
  doc.font('Helvetica').text(formatAddress(order.billingAddress));
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Ship To:');
  doc.font('Helvetica').text(formatAddress(order.shippingAddress));
  doc.moveDown();

  doc.font('Helvetica-Bold').text('Items');
  doc.moveDown(0.5);
  doc.font('Helvetica');

  order.items.forEach((item) => {
    doc.text(`${item.variant.product.name}`, { continued: true });
    doc.text(
      `  ${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`,
      { continued: true }
    );
    doc.text(`  x${item.quantity}  @ $${Number(item.priceSnapshot).toFixed(2)}`);
  });

  doc.moveDown();
  doc.text(`Subtotal: $${Number(order.subtotal).toFixed(2)}`);
  doc.text(`Shipping: $${Number(order.shippingCost).toFixed(2)}`);
  doc.text(`Tax: $${Number(order.tax).toFixed(2)}`);
  doc.text(`Discount: $${Number(order.discount).toFixed(2)}`);
  doc.moveDown(0.5);
  doc.font('Helvetica-Bold').text(`Total: $${Number(order.total).toFixed(2)}`);

  doc.end();
  return stream;
}; // [2025-11-12 01:05:02] 生成订单发票 PDF

const fetchOrderWithItems = async (where) =>
  prisma.order.findFirst({
    where,
    include: {
      items: {
        include: {
          variant: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

exports.downloadInvoice = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await fetchOrderWithItems({ id });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId && order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!order.userId && !userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const pdfStream = generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );
    pdfStream.pipe(res);
  } catch (error) {
    console.error('Error generating invoice:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

exports.downloadInvoiceByOrderNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ error: 'Email query parameter is required' });
    }

    const order = await fetchOrderWithItems({ orderNumber });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.email.toLowerCase() !== String(email).toLowerCase()) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const pdfStream = generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );
    pdfStream.pipe(res);
  } catch (error) {
    console.error('Error generating invoice by order number:', error);
    res.status(500).json({ error: 'Failed to generate invoice' });
  }
};

/**
 * POST /api/orders/:id/cancel - Cancel an order
 * [2025-01-27 13:20:00] Cancel order with inventory restoration and refund handling
 */
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Cancel order using service
    const cancelledOrder = await cancelOrder(id, {
      userId,
      reason,
      restoreInventory: true,
      processRefund: false, // Refund should be processed separately via admin API
    });

    logger.info('Order cancelled by user', {
      orderId: id,
      orderNumber: cancelledOrder.orderNumber,
      userId,
      reason,
    });

    res.json({
      id: cancelledOrder.id,
      orderNumber: cancelledOrder.orderNumber,
      status: cancelledOrder.status.toLowerCase(),
      message: 'Order cancelled successfully',
      note: reason || null,
    });
  } catch (error) {
    logger.error('Error cancelling order:', {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
      userId: req.user?.id,
    });

    if (error.isOperational) {
      return res.status(error.statusCode).json({
        success: false,
        statusCode: error.statusCode,
        code: error.code,
        message: error.message,
      });
    }

    res.status(500).json({
      error: 'Failed to cancel order',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/orders/:id/can-cancel - Check if order can be cancelled
 * [2025-01-27 13:20:00] Check cancellation eligibility
 */
exports.canCancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        userId: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const cancellable = canCancelOrder(order);
    const allowedTransitions = cancellable ? ['CANCELLED'] : [];

    res.json({
      canCancel: cancellable,
      currentStatus: order.status.toLowerCase(),
      allowedTransitions,
      reason: cancellable
        ? null
        : `Order in ${order.status} status cannot be cancelled`,
    });
  } catch (error) {
    logger.error('Error checking order cancellation eligibility:', {
      error: error.message,
      orderId: req.params.id,
    });
    res.status(500).json({ error: 'Failed to check cancellation eligibility' });
  }
};

/**
 * GET /api/orders/:id/tracking - Get order tracking information
 * [2025-01-27 14:35:00] Get order tracking details
 * [2025-12-06 15:00:00] Enhanced with unified error handling and tracking events
 */
exports.getOrderTracking = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        shipments: {
          orderBy: { createdAt: 'desc' },
        },
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        trackingNumber: true,
        carrier: true,
        estimatedDelivery: true,
        userId: true,
        email: true,
        shipments: {
          select: {
            id: true,
            trackingNumber: true,
            carrier: true,
            status: true,
            labelUrl: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    // Verify ownership if order has userId
    if (order.userId && userId && order.userId !== userId) {
      return next(new ForbiddenError('无权访问此订单的跟踪信息'));
    }

    // If order has userId but no authenticated user, require authentication
    if (order.userId && !userId) {
      return next(new UnauthorizedError('需要身份验证'));
    }

    // [2025-12-06 15:00:00] Build tracking response with events
    const primaryShipment = order.shipments[0];
    const trackingEvents = [];

    // Add order status events
    trackingEvents.push({
      date: order.createdAt,
      status: 'ORDER_PLACED',
      description: '订单已创建',
      location: null,
    });

    if (order.status === 'PROCESSING') {
      trackingEvents.push({
        date: order.updatedAt || order.createdAt,
        status: 'PROCESSING',
        description: '订单处理中',
        location: null,
      });
    }

    if (primaryShipment) {
      if (primaryShipment.status === 'LABEL_CREATED') {
        trackingEvents.push({
          date: primaryShipment.createdAt,
          status: 'LABEL_CREATED',
          description: '发货标签已创建',
          location: null,
        });
      }

      if (primaryShipment.status === 'IN_TRANSIT') {
        trackingEvents.push({
          date: primaryShipment.updatedAt || primaryShipment.createdAt,
          status: 'IN_TRANSIT',
          description: '包裹运输中',
          location: null,
        });
      }

      if (primaryShipment.status === 'DELIVERED') {
        trackingEvents.push({
          date: primaryShipment.updatedAt || primaryShipment.createdAt,
          status: 'DELIVERED',
          description: '包裹已送达',
          location: null,
        });
      }

      if (primaryShipment.status === 'EXCEPTION') {
        trackingEvents.push({
          date: primaryShipment.updatedAt || primaryShipment.createdAt,
          status: 'EXCEPTION',
          description: '运输异常',
          location: null,
        });
      }
    }

    if (order.status === 'DELIVERED') {
      trackingEvents.push({
        date: order.updatedAt || order.createdAt,
        status: 'DELIVERED',
        description: '订单已完成',
        location: null,
      });
    }

    // Sort events by date (newest first)
    trackingEvents.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      trackingNumber: order.trackingNumber || primaryShipment?.trackingNumber || null,
      carrier: order.carrier || primaryShipment?.carrier || null,
      estimatedDelivery: order.estimatedDelivery || null,
      shipments: order.shipments.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status.toLowerCase(),
        labelUrl: shipment.labelUrl,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt,
      })),
      events: trackingEvents,
      lastUpdated: primaryShipment?.updatedAt || order.updatedAt,
    };

    logger.debug('Order tracking information retrieved', {
      timestamp,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: userId || null,
      hasTracking: !!trackingInfo.trackingNumber,
      eventsCount: trackingEvents.length,
    });

    res.json(trackingInfo);
  } catch (error) {
    logger.error('Error fetching order tracking', {
      timestamp,
      orderId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('获取订单跟踪信息失败，请稍后重试'));
  }
};

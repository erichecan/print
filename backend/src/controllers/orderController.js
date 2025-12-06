/**
 * Order Controller
 * [2025-11-04 23:54:00]
 * [2025-01-27 13:20:00] Enhanced with order cancellation and query optimization
 * [2025-12-06 13:30:00] Enhanced with unified error handling
 */
const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit'); // [2025-11-12 01:05:02] 用于生成发票 PDF
const { Readable } = require('stream');
const logger = require('../utils/logger');
const { cancelOrder, canCancelOrder } = require('../services/orderService');
const { BadRequestError, ForbiddenError, NotFoundError, UnauthorizedError, InternalServerError } = require('../utils/errors');
const { sendOrderConfirmation } = require('../services/emailService');

/**
 * GET /api/orders - List user's orders with filtering, sorting, and search
 * [2025-11-04 23:54:00]
 * [2025-01-27 13:20:00] Enhanced with filtering, sorting, and search
 * [2025-12-06 13:30:00] Enhanced with unified error handling
 */
exports.getOrders = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const userId = req.user?.id;

    if (!userId) {
      return next(new UnauthorizedError('需要身份验证'));
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
    logger.error('Error fetching orders', {
      timestamp,
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    next(new InternalServerError('获取订单列表失败，请稍后重试'));
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

/**
 * Generate invoice PDF with enhanced template design
 * [2025-11-12 01:05:02] 生成订单发票 PDF
 * [2025-12-06 14:30:00] Enhanced with professional invoice template design
 */
const generateInvoicePdf = (order) => {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = new Readable({ read() {} });

  doc.on('data', (chunk) => stream.push(chunk));
  doc.on('end', () => stream.push(null));

  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const margin = 50;
  const contentWidth = pageWidth - 2 * margin;

  // [2025-12-06 14:30:00] Header with company info and invoice title
  doc.rect(margin, margin, contentWidth, 80).fill('#1e293b');
  doc.fillColor('#ffffff')
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('INVOICE', margin + 20, margin + 25, { width: contentWidth - 40, align: 'right' });

  // Company info (left side of header)
  doc.fillColor('#ffffff')
    .fontSize(10)
    .font('Helvetica')
    .text(process.env.APP_NAME || 'Suvernire Plus', margin + 20, margin + 15)
    .fontSize(8)
    .text(process.env.COMPANY_ADDRESS || '123 Business St, Toronto, ON, Canada', margin + 20, margin + 30, { width: 200 })
    .text(`Phone: ${process.env.COMPANY_PHONE || '1-800-123-4567'}`, margin + 20, margin + 45)
    .text(`Email: ${process.env.COMPANY_EMAIL || 'info@suvernireplus.com'}`, margin + 20, margin + 60);

  // Invoice details (right side of header)
  doc.fillColor('#ffffff')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Invoice Number:', pageWidth - margin - 200, margin + 15)
    .font('Helvetica')
    .text(order.orderNumber, pageWidth - margin - 200, margin + 30)
    .font('Helvetica-Bold')
    .text('Invoice Date:', pageWidth - margin - 200, margin + 45)
    .font('Helvetica')
    .text(new Date(order.createdAt).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth - margin - 200, margin + 60);

  let yPos = margin + 100;

  // [2025-12-06 14:30:00] Bill To and Ship To sections
  doc.fillColor('#000000');
  const sectionWidth = (contentWidth - 20) / 2;

  // Bill To section
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .text('Bill To:', margin, yPos);
  yPos += 20;
  doc.font('Helvetica')
    .fontSize(10)
    .text(formatAddress(order.billingAddress), margin, yPos, { width: sectionWidth });

  // Ship To section
  yPos = margin + 100;
  doc.font('Helvetica-Bold')
    .fontSize(12)
    .text('Ship To:', margin + sectionWidth + 20, yPos);
  yPos += 20;
  doc.font('Helvetica')
    .fontSize(10)
    .text(formatAddress(order.shippingAddress), margin + sectionWidth + 20, yPos, { width: sectionWidth });

  yPos = margin + 200;

  // [2025-12-06 14:30:00] Items table header
  doc.rect(margin, yPos, contentWidth, 30).fill('#f1f5f9');
  doc.fillColor('#1e293b')
    .font('Helvetica-Bold')
    .fontSize(11)
    .text('Description', margin + 10, yPos + 8)
    .text('Quantity', margin + contentWidth - 200, yPos + 8, { width: 60, align: 'center' })
    .text('Unit Price', margin + contentWidth - 130, yPos + 8, { width: 60, align: 'right' })
    .text('Total', margin + contentWidth - 60, yPos + 8, { width: 50, align: 'right' });

  yPos += 35;

  // [2025-12-06 14:30:00] Items table rows
  doc.font('Helvetica').fontSize(10);
  order.items.forEach((item) => {
    const itemHeight = 40;
    const productName = item.variant?.product?.name || 'Product';
    const variantInfo = [
      item.variant?.color,
      item.variant?.size,
    ].filter(Boolean).join(' • ');

    // Item row background (alternating)
    if (order.items.indexOf(item) % 2 === 0) {
      doc.rect(margin, yPos - 5, contentWidth, itemHeight).fill('#f8fafc');
    }

    doc.fillColor('#1e293b')
      .text(productName, margin + 10, yPos, { width: contentWidth - 250 })
      .fontSize(9)
      .fillColor('#64748b')
      .text(variantInfo || '', margin + 10, yPos + 15, { width: contentWidth - 250 })
      .fontSize(10)
      .fillColor('#1e293b')
      .text(item.quantity.toString(), margin + contentWidth - 200, yPos, { width: 60, align: 'center' })
      .text(`$${Number(item.priceSnapshot).toFixed(2)}`, margin + contentWidth - 130, yPos, { width: 60, align: 'right' })
      .text(`$${(Number(item.priceSnapshot) * item.quantity).toFixed(2)}`, margin + contentWidth - 60, yPos, { width: 50, align: 'right' });

    yPos += itemHeight;
  });

  // [2025-12-06 14:30:00] Summary section
  const summaryY = yPos + 20;
  const summaryWidth = 200;
  const summaryX = pageWidth - margin - summaryWidth;

  doc.rect(summaryX, summaryY - 5, summaryWidth, 150).stroke('#e2e8f0');

  let summaryYPos = summaryY + 10;

  doc.font('Helvetica')
    .fontSize(10)
    .fillColor('#64748b')
    .text('Subtotal:', summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' })
    .fillColor('#1e293b')
    .text(`$${Number(order.subtotal).toFixed(2)}`, summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' });
  summaryYPos += 20;

  if (Number(order.discount) > 0) {
    doc.fillColor('#64748b')
      .text('Discount:', summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' })
      .fillColor('#1e293b')
      .text(`-$${Number(order.discount).toFixed(2)}`, summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' });
    summaryYPos += 20;
  }

  doc.fillColor('#64748b')
    .text('Shipping:', summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' })
    .fillColor('#1e293b')
    .text(`$${Number(order.shippingCost).toFixed(2)}`, summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' });
  summaryYPos += 20;

  doc.fillColor('#64748b')
    .text('Tax:', summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' })
    .fillColor('#1e293b')
    .text(`$${Number(order.tax).toFixed(2)}`, summaryX + 10, summaryYPos, { width: summaryWidth - 20, align: 'right' });
  summaryYPos += 30;

  // Total line
  doc.rect(summaryX, summaryYPos - 5, summaryWidth, 30).fill('#1e293b');
  doc.fillColor('#ffffff')
    .font('Helvetica-Bold')
    .fontSize(12)
    .text('Total:', summaryX + 10, summaryYPos + 5, { width: summaryWidth - 20, align: 'right' })
    .text(`${order.currency || 'CAD'} $${Number(order.total).toFixed(2)}`, summaryX + 10, summaryYPos + 5, { width: summaryWidth - 20, align: 'right' });

  // [2025-12-06 14:30:00] Payment status and footer
  const footerY = pageHeight - margin - 60;
  doc.fillColor('#64748b')
    .font('Helvetica')
    .fontSize(9)
    .text(`Payment Status: ${order.paymentStatus.toUpperCase()}`, margin, footerY)
    .text(`Order Date: ${new Date(order.createdAt).toLocaleDateString('en-CA')}`, margin, footerY + 15);

  // Footer note
  doc.text(
    'Thank you for your business! If you have any questions about this invoice, please contact our support team.',
    margin,
    footerY + 35,
    { width: contentWidth, align: 'center' }
  );

  doc.end();
  return stream;
};

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

/**
 * GET /api/orders/:id/invoice - Download invoice PDF
 * [2025-11-12 01:05:02] Download invoice PDF
 * [2025-12-06 14:30:00] Enhanced with unified error handling
 */
exports.downloadInvoice = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const order = await fetchOrderWithItems({ id });

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    if (order.userId && order.userId !== userId) {
      return next(new ForbiddenError('无权访问此订单的发票'));
    }

    if (!order.userId && !userId) {
      return next(new UnauthorizedError('需要身份验证'));
    }

    // [2025-12-06 14:30:00] Generate invoice PDF
    const pdfStream = generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );

    logger.info('Invoice PDF generated', {
      timestamp,
      orderId: order.id,
      orderNumber: order.orderNumber,
      userId: userId || null,
    });

    pdfStream.pipe(res);
  } catch (error) {
    logger.error('Error generating invoice', {
      timestamp,
      orderId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('生成发票失败，请稍后重试'));
  }
};

/**
 * GET /api/orders/number/:orderNumber/invoice - Download invoice PDF by order number (guest access)
 * [2025-11-12 01:05:02] Download invoice PDF by order number
 * [2025-12-06 14:30:00] Enhanced with unified error handling
 */
exports.downloadInvoiceByOrderNumber = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { orderNumber } = req.params;
    const { email } = req.query;

    if (!email) {
      return next(new BadRequestError('需要提供邮箱地址', { field: 'email' }));
    }

    const order = await fetchOrderWithItems({ orderNumber });

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    if (order.email.toLowerCase() !== String(email).toLowerCase()) {
      return next(new ForbiddenError('无权访问此订单的发票'));
    }

    // [2025-12-06 14:30:00] Generate invoice PDF
    const pdfStream = generateInvoicePdf(order);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=invoice-${order.orderNumber}.pdf`
    );

    logger.info('Invoice PDF generated by order number', {
      timestamp,
      orderNumber: order.orderNumber,
      orderId: order.id,
      email: email.substring(0, 3) + '***',
    });

    pdfStream.pipe(res);
  } catch (error) {
    logger.error('Error generating invoice by order number', {
      timestamp,
      orderNumber: req.params.orderNumber,
      email: req.query.email ? req.query.email.substring(0, 3) + '***' : null,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('生成发票失败，请稍后重试'));
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
 */
exports.getOrderTracking = async (req, res) => {
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
      return res.status(404).json({ error: 'Order not found' });
    }

    // Verify ownership if order has userId
    if (order.userId && userId && order.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // If order has userId but no authenticated user, require authentication
    if (order.userId && !userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Build tracking response
    const trackingInfo = {
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      trackingNumber: order.trackingNumber || order.shipments[0]?.trackingNumber || null,
      carrier: order.carrier || order.shipments[0]?.carrier || null,
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
    };

    res.json(trackingInfo);
  } catch (error) {
    logger.error('Error fetching order tracking:', {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to fetch order tracking information' });
  }
};

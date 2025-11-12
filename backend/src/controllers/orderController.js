/**
 * Order Controller
 * [2025-11-04 23:54:00]
 */
const prisma = require('../lib/prisma');
const PDFDocument = require('pdfkit'); // [2025-11-12 01:05:02] 用于生成发票 PDF
const { Readable } = require('stream');

/**
 * GET /api/orders - List user's orders
 * [2025-11-04 23:54:00]
 */
exports.getOrders = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
      prisma.order.count({ where: { userId } }),
    ]);

    res.json({
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status.toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        createdAt: order.createdAt,
        total: Number(order.total),
        itemCount: order._count.items,
        thumbnail: order.items[0]?.variant?.product?.images[0]?.imageUrl || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
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

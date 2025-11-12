/**
 * Admin Order Controller
 * [2025-11-12 01:05:02] 后台订单管理接口
 */
const prisma = require('../lib/prisma');

const ALLOWED_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const ALLOWED_PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
};

const recordAuditLog = async (req, action, targetId, meta = {}) => {
  try {
    await prisma.adminAuditLog.create({
      data: {
        action,
        targetType: 'order',
        targetId,
        actorId: req.user?.id || null,
        actorEmail: req.user?.email || null,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent'] || null,
        meta,
      },
    });
  } catch (error) {
    console.warn('[Admin] Failed to record audit log:', error);
  }
};

exports.listOrders = async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const skip = (page - 1) * limit;
    const status = req.query.status ? String(req.query.status).toUpperCase() : undefined;
    const paymentStatus = req.query.paymentStatus
      ? String(req.query.paymentStatus).toUpperCase()
      : undefined;
    const search = req.query.search?.trim();
    const email = req.query.email?.trim();

    const where = {};

    if (status && ALLOWED_STATUSES.includes(status)) {
      where.status = status;
    }

    if (paymentStatus && ALLOWED_PAYMENT_STATUSES.includes(paymentStatus)) {
      where.paymentStatus = paymentStatus;
    }

    if (email) {
      where.email = { contains: email, mode: 'insensitive' };
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            take: 1,
            include: {
              variant: {
                include: {
                  product: true,
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
      data: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        email: order.email,
        status: order.status.toLowerCase(),
        paymentStatus: order.paymentStatus.toLowerCase(),
        total: Number(order.total),
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        itemCount: order._count.items,
        thumbnail: order.items[0]?.variant?.product?.images?.[0]?.url || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[Admin] Error listing orders:', error);
    res.status(500).json({ error: 'Failed to list orders' });
  }
};

exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

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
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      subtotal: Number(order.subtotal),
      shippingCost: Number(order.shippingCost),
      tax: Number(order.tax),
      discount: Number(order.discount),
      total: Number(order.total),
      currency: order.currency,
      shippingAddress: order.shippingAddress,
      billingAddress: order.billingAddress,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      items: order.items.map((item) => ({
        id: item.id,
        sku: item.variant.sku,
        productName: item.variant.product.name,
        variantDescription: `${item.variant.color || ''}${item.variant.color && item.variant.size ? ' • ' : ''}${item.variant.size || ''}`.trim(),
        quantity: item.quantity,
        unitPrice: Number(item.priceSnapshot),
        subtotal: Number(item.priceSnapshot) * item.quantity,
        thumbnail: item.variant.imageUrl || item.variant.product.images[0]?.url || null,
      })),
      shipments: order.shipments.map((shipment) => ({
        id: shipment.id,
        trackingNumber: shipment.trackingNumber,
        carrier: shipment.carrier,
        status: shipment.status.toLowerCase(),
        labelUrl: shipment.labelUrl,
        createdAt: shipment.createdAt,
      })),
    });
  } catch (error) {
    console.error('[Admin] Error fetching order:', error);
    res.status(500).json({ error: 'Failed to fetch order' });
  }
};

exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingNumber, carrier, estimatedDelivery } = req.body || {};

    const updateData = {};

    if (status) {
      const normalizedStatus = String(status).toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }
      updateData.status = normalizedStatus;
    }

    if (paymentStatus) {
      const normalizedPayment = String(paymentStatus).toUpperCase();
      if (!ALLOWED_PAYMENT_STATUSES.includes(normalizedPayment)) {
        return res.status(400).json({ error: 'Invalid payment status value' });
      }
      updateData.paymentStatus = normalizedPayment;
    }

    if (trackingNumber !== undefined) {
      updateData.trackingNumber = trackingNumber || null;
    }

    if (carrier !== undefined) {
      updateData.carrier = carrier || null;
    }

    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    const order = await prisma.order.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        trackingNumber: true,
        carrier: true,
        estimatedDelivery: true,
        updatedAt: true,
      },
    });

    const changes = {};
    if (updateData.status) {
      changes.status = order.status.toLowerCase();
    }
    if (updateData.paymentStatus) {
      changes.paymentStatus = order.paymentStatus.toLowerCase();
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'trackingNumber')) {
      changes.trackingNumber = order.trackingNumber || null;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'carrier')) {
      changes.carrier = order.carrier || null;
    }
    if (Object.prototype.hasOwnProperty.call(updateData, 'estimatedDelivery')) {
      changes.estimatedDelivery = order.estimatedDelivery
        ? order.estimatedDelivery.toISOString()
        : null;
    }

    await recordAuditLog(req, 'order.update_status', order.id, {
      orderNumber: order.orderNumber,
      changes,
    });

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      trackingNumber: order.trackingNumber,
      carrier: order.carrier,
      estimatedDelivery: order.estimatedDelivery,
      updatedAt: order.updatedAt,
    });
  } catch (error) {
    console.error('[Admin] Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
};

exports.recordRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};

    const order = await prisma.order.update({
      where: { id },
      data: {
        status: 'REFUNDED',
        paymentStatus: 'REFUNDED',
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        updatedAt: true,
      },
    });

    await recordAuditLog(req, 'order.refund', order.id, {
      orderNumber: order.orderNumber,
      reason: reason || null,
      total: Number(order.total),
    });

    res.json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      total: Number(order.total),
      updatedAt: order.updatedAt,
      refundNote: reason || null,
    });
  } catch (error) {
    console.error('[Admin] Error recording refund:', error);
    res.status(500).json({ error: 'Failed to record refund' });
  }
};


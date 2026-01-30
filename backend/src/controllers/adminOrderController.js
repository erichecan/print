/**
 * Admin Order Controller
* 后台订单管理接口
* Enhanced with Stripe refund integration and email notifications
* Enhanced with order state machine validation
 */
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const logger = require('../utils/logger');

// Global Stripe Initialization to fail fast
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  logger.warn('WARNING: STRIPE_SECRET_KEY is not set in adminOrderController. Refunds will fail.');
}

const { sendRefundConfirmation } = require('../services/emailService');
const { updateOrderStatus, validateStatusTransition } = require('../services/orderService');
const { BadRequestError, NotFoundError, InternalServerError } = require('../utils/errors');
const easyshipService = require('../services/easyshipService');

const ALLOWED_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const ALLOWED_PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
};

// Audit Logs 功能已移除

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

/**
 * Get order status history
* 获取订单状态历史记录
 */
exports.getOrderStatusHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const history = await prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fromStatus: true,
        toStatus: true,
        actorId: true,
        actorName: true,
        note: true,
        createdAt: true,
      },
    });

    res.json({
      success: true,
      data: history,
    });
  } catch (error) {
    logger.error('Failed to get order status history', {
      orderId: req.params.id,
      error: error.message,
    });
    res.status(500).json({ error: 'Failed to get order status history' });
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

/**
 * PATCH /api/admin/orders/:id/status - Update order status with state machine validation
* Original implementation
* Enhanced with state machine validation
 */
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, paymentStatus, trackingNumber, carrier, estimatedDelivery, note } = req.body || {};

    // Fetch current order for validation
    const currentOrder = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (!currentOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const updateData = {};
    const changes = {};

    // Validate and update order status with state machine
    // Use orderService.updateOrderStatus to ensure history recording and email notifications
    if (status) {
      const normalizedStatus = String(status).toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      // Validate state transition first
      try {
        validateStatusTransition(currentOrder, normalizedStatus);
        changes.status = {
          from: currentOrder.status,
          to: normalizedStatus,
        };
      } catch (validationError) {
        if (validationError.isOperational) {
          return res.status(validationError.statusCode).json({
            success: false,
            statusCode: validationError.statusCode,
            code: validationError.code,
            message: validationError.message,
          });
        }
        throw validationError;
      }

      // Use orderService.updateOrderStatus to handle status update
      // This will automatically record history and send email notifications
      try {
        const actorId = req.user?.id || null;
        const actorName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email : 'System';

        await updateOrderStatus(id, normalizedStatus, {
          actorId,
          actorName,
          note: note || null,
        });

        // Status update is handled by orderService, so we don't add it to updateData
        // But we still need to track it for the response
        logger.info('Order status updated via admin controller', {
          orderId: id,
          orderNumber: currentOrder.orderNumber,
          fromStatus: currentOrder.status,
          toStatus: normalizedStatus,
          actorId,
          actorName,
        });
      } catch (statusUpdateError) {
        logger.error('Failed to update order status via orderService', {
          orderId: id,
          error: statusUpdateError.message,
        });
        // If orderService.updateOrderStatus fails, fall back to direct update
        // (but without history/email)
        updateData.status = normalizedStatus;
      }
    }

    // Update payment status
    if (paymentStatus) {
      const normalizedPayment = String(paymentStatus).toUpperCase();
      if (!ALLOWED_PAYMENT_STATUSES.includes(normalizedPayment)) {
        return res.status(400).json({ error: 'Invalid payment status value' });
      }
      updateData.paymentStatus = normalizedPayment;
      changes.paymentStatus = {
        from: currentOrder.paymentStatus,
        to: normalizedPayment,
      };
    }

    // Update tracking information
    // Enhanced tracking update with shipment creation
    if (trackingNumber !== undefined || carrier !== undefined) {
      updateData.trackingNumber = trackingNumber !== undefined ? trackingNumber || null : undefined;
      updateData.carrier = carrier !== undefined ? carrier || null : undefined;

      if (trackingNumber !== undefined) {
        changes.trackingNumber = trackingNumber || null;
      }
      if (carrier !== undefined) {
        changes.carrier = carrier || null;
      }
    }

    if (estimatedDelivery !== undefined) {
      updateData.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : null;
      changes.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery).toISOString() : null;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No update fields provided' });
    }

    // Update order and create/update shipment if tracking info provided
    // Note: If status was updated, it's already handled by orderService.updateOrderStatus above
    // So we only update other fields here
    let shipmentUpdated = false;
    const order = await prisma.$transaction(async (tx) => {
      // If status was updated via orderService, fetch the updated order first
      let updatedOrder;
      if (status && !updateData.status) {
        // Status was already updated by orderService, just fetch it
        updatedOrder = await tx.order.findUnique({
          where: { id },
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

        // If we have other fields to update, update them
        if (Object.keys(updateData).length > 0) {
          updatedOrder = await tx.order.update({
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
        }
      } else {
        // Status wasn't updated or was added to updateData (fallback case)
        updatedOrder = await tx.order.update({
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
      }

      // Create or update shipment record if tracking info provided
      if (trackingNumber && carrier) {
        const existingShipment = await tx.shipment.findFirst({
          where: { orderId: id },
        });

        if (existingShipment) {
          // Check if tracking info changed
          const trackingChanged =
            existingShipment.trackingNumber !== trackingNumber || existingShipment.carrier !== carrier;
          shipmentUpdated = trackingChanged;

          await tx.shipment.update({
            where: { id: existingShipment.id },
            data: {
              trackingNumber,
              carrier,
              status: 'IN_TRANSIT',
            },
          });
        } else {
          shipmentUpdated = true;
          await tx.shipment.create({
            data: {
              orderId: id,
              trackingNumber,
              carrier,
              status: 'IN_TRANSIT',
            },
          });
        }
      }

      return updatedOrder;
    });

    // Send tracking update notification if tracking info was added or updated
    if (shipmentUpdated && trackingNumber && carrier) {
      try {
        // Fetch full order details for email
        const orderWithDetails = await prisma.order.findUnique({
          where: { id },
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

        if (orderWithDetails) {
          const { sendShippingNotification } = require('../services/emailService');
          await sendShippingNotification(orderWithDetails, trackingNumber, carrier);
          logger.info('Tracking update notification email sent', {
            orderNumber: order.orderNumber,
            orderId: order.id,
            email: orderWithDetails.email,
            trackingNumber,
            carrier,
          });
        }
      } catch (emailError) {
        logger.warn('Failed to send tracking update notification email', {
          orderNumber: order.orderNumber,
          orderId: order.id,
          error: emailError.message,
        });
        // Don't throw - email failure shouldn't fail status update
      }
    }

    // Audit Logs 功能已移除

    logger.info('Order status updated by admin', {
      orderId: order.id,
      orderNumber: order.orderNumber,
      changes,
      actorId: req.user?.id,
      actorEmail: req.user?.email,
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
    logger.error('[Admin] Error updating order status:', {
      error: error.message,
      stack: error.stack,
      orderId: req.params.id,
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
      error: 'Failed to update order status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/orders/:id/refund - Process refund for an order
* Enhanced with Stripe refund integration
* Enhanced with unified error handling
 */
exports.recordRefund = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { reason, amount, refundToStripe = true } = req.body || {};

    // Fetch order with payment intent ID
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        paymentIntentId: true,
        total: true,
        email: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    // Validate order can be refunded
    if (order.paymentStatus !== 'COMPLETED') {
      return next(
        new BadRequestError('只有已支付的订单才能退款', {
          currentStatus: order.paymentStatus,
          requiredStatus: 'COMPLETED',
        })
      );
    }

    if (order.status === 'REFUNDED') {
      return next(new BadRequestError('该订单已经退款', { orderNumber: order.orderNumber }));
    }

    const refundAmount = amount ? Number(amount) : Number(order.total);
    if (isNaN(refundAmount) || refundAmount <= 0) {
      return next(new BadRequestError('退款金额必须大于 0', { amount, orderTotal: Number(order.total) }));
    }

    if (refundAmount > Number(order.total)) {
      return next(
        new BadRequestError('退款金额不能超过订单总额', {
          refundAmount,
          maxAmount: Number(order.total),
        })
      );
    }

    let stripeRefund = null;
    let refundError = null;

    // Process Stripe refund if payment intent exists and refundToStripe is true
    if (refundToStripe && order.paymentIntentId) {
      if (!stripe) {
        throw new Error('Stripe is not initialized');
      }
      try {
        // Retrieve payment intent to get charge ID
        const paymentIntent = await stripe.paymentIntents.retrieve(order.paymentIntentId);


        if (paymentIntent.status === 'succeeded' && paymentIntent.latest_charge) {
          // Create refund in Stripe
          const refundParams = {
            charge: paymentIntent.latest_charge,
            amount: Math.round(refundAmount * 100), // Convert to cents
            reason: reason ? 'requested_by_customer' : undefined,
            metadata: {
              orderNumber: order.orderNumber,
              orderId: order.id,
              reason: reason || 'No reason provided',
            },
          };

          stripeRefund = await stripe.refunds.create(refundParams);

          logger.info('Stripe refund created', {
            orderNumber: order.orderNumber,
            refundId: stripeRefund.id,
            amount: refundAmount,
          });
        } else {
          refundError = `Payment intent status is ${paymentIntent.status}, cannot process refund`;
          logger.warn('Cannot process Stripe refund', {
            orderNumber: order.orderNumber,
            paymentIntentStatus: paymentIntent.status,
          });
        }
      } catch (stripeError) {
        refundError = stripeError.message;
        logger.error('Stripe refund failed', {
          orderNumber: order.orderNumber,
          error: stripeError.message,
        });

        // If Stripe refund fails, still allow manual refund record
        // but return error status
        if (refundToStripe) {
          logger.error('Stripe refund failed, rejecting request', {
            timestamp,
            orderNumber: order.orderNumber,
            orderId: order.id,
            error: stripeError.message,
          });
          return next(
            new InternalServerError('Stripe 退款处理失败', {
              details: stripeError.message,
              suggestion: '可以设置 refundToStripe=false 手动记录退款',
            })
          );
        }
      }
    }

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: refundAmount >= Number(order.total) ? 'REFUNDED' : order.status,
        paymentStatus: refundAmount >= Number(order.total) ? 'REFUNDED' : order.paymentStatus,
      },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        total: true,
        email: true,
        updatedAt: true,
      },
    });

    // Audit Logs 功能已移除

    // Send refund confirmation email (don't fail if email fails)
    try {
      await sendRefundConfirmation(updatedOrder, refundAmount, reason);
    } catch (emailError) {
      logger.warn('Failed to send refund confirmation email', {
        orderNumber: order.orderNumber,
        error: emailError.message,
      });
    }

    logger.info('Refund processed successfully', {
      timestamp,
      orderNumber: updatedOrder.orderNumber,
      orderId: updatedOrder.id,
      refundAmount,
      isFullRefund: refundAmount >= Number(order.total),
      stripeRefundId: stripeRefund?.id || null,
      refundToStripe,
    });

    res.json({
      id: updatedOrder.id,
      orderNumber: updatedOrder.orderNumber,
      status: updatedOrder.status.toLowerCase(),
      paymentStatus: updatedOrder.paymentStatus.toLowerCase(),
      refundAmount,
      total: Number(updatedOrder.total),
      updatedAt: updatedOrder.updatedAt,
      refundNote: reason || null,
      stripeRefundId: stripeRefund?.id || null,
      ...(refundError && { warning: `Stripe 退款失败: ${refundError}` }),
    });
  } catch (error) {
    logger.error('Error processing refund', {
      timestamp,
      orderId: req.params.id,
      error: error.message,
      stack: error.stack,
    });
    next(new InternalServerError('处理退款失败，请稍后重试'));
  }
};

/**
 * PATCH /api/admin/orders/batch/status - Batch update order statuses
* Batch order status update for Issue #87
 */
exports.batchUpdateStatus = async (req, res) => {
  try {
    const { orderIds, status, paymentStatus } = req.body || {};

    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return res.status(400).json({ error: 'orderIds array is required and must not be empty' });
    }

    if (!status && !paymentStatus) {
      return res.status(400).json({ error: 'At least one of status or paymentStatus must be provided' });
    }

    const normalizedStatus = status ? String(status).toUpperCase() : null;
    const normalizedPaymentStatus = paymentStatus ? String(paymentStatus).toUpperCase() : null;

    // Validate status values
    if (normalizedStatus && !ALLOWED_STATUSES.includes(normalizedStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (normalizedPaymentStatus && !ALLOWED_PAYMENT_STATUSES.includes(normalizedPaymentStatus)) {
      return res.status(400).json({ error: 'Invalid payment status value' });
    }

    // Fetch all orders for validation
    const orders = await prisma.order.findMany({
      where: { id: { in: orderIds } },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
      },
    });

    if (orders.length !== orderIds.length) {
      const foundIds = orders.map((o) => o.id);
      const missingIds = orderIds.filter((id) => !foundIds.includes(id));
      return res.status(404).json({
        error: 'Some orders not found',
        missingIds,
      });
    }

    // Validate status transitions for all orders
    const validationErrors = [];
    for (const order of orders) {
      if (normalizedStatus && order.status !== normalizedStatus) {
        try {
          validateStatusTransition(order, normalizedStatus);
        } catch (validationError) {
          validationErrors.push({
            orderId: order.id,
            orderNumber: order.orderNumber,
            error: validationError.message,
          });
        }
      }
    }

    if (validationErrors.length > 0) {
      return res.status(400).json({
        error: 'Some orders have invalid status transitions',
        errors: validationErrors,
      });
    }

    // Build update data
    const updateData = {};
    if (normalizedStatus) {
      updateData.status = normalizedStatus;
    }
    if (normalizedPaymentStatus) {
      updateData.paymentStatus = normalizedPaymentStatus;
    }

    // Batch update orders
    const result = await prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: updateData,
    });

    logger.info('Batch order status updated by admin', {
      orderIds,
      updateData,
      updatedCount: result.count,
      actorId: req.user?.id,
      actorEmail: req.user?.email,
    });

    res.json({
      success: true,
      updatedCount: result.count,
      orderIds,
    });
  } catch (error) {
    logger.error('[Admin] Error batch updating order status:', {
      error: error.message,
      stack: error.stack,
      orderIds: req.body?.orderIds,
    });

    res.status(500).json({
      error: 'Failed to batch update order status',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * GET /api/admin/orders/export - Export orders to CSV
* Batch export orders for Issue #87
 */
exports.exportOrders = async (req, res) => {
  try {
    const { orderIds, status, paymentStatus, search, startDate, endDate } = req.query || {};

    // Build where clause
    const where = {};

    if (orderIds) {
      const ids = Array.isArray(orderIds) ? orderIds : orderIds.split(',');
      where.id = { in: ids };
    }

    if (status) {
      const normalizedStatus = String(status).toUpperCase();
      if (ALLOWED_STATUSES.includes(normalizedStatus)) {
        where.status = normalizedStatus;
      }
    }

    if (paymentStatus) {
      const normalizedPayment = String(paymentStatus).toUpperCase();
      if (ALLOWED_PAYMENT_STATUSES.includes(normalizedPayment)) {
        where.paymentStatus = normalizedPayment;
      }
    }

    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { customerEmail: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Fetch orders with related data
    const orders = await prisma.order.findMany({
      where,
      select: {
        id: true,
        orderNumber: true,
        customerEmail: true,
        status: true,
        paymentStatus: true,
        total: true,
        currency: true,
        createdAt: true,
        updatedAt: true,
        trackingNumber: true,
        carrier: true,
        items: {
          select: {
            quantity: true,
            unitPrice: true,
            product: {
              select: {
                name: true,
                sku: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to 10k orders for performance
    });

    // Generate CSV
    const csvHeaders = [
      'Order Number',
      'Customer Email',
      'Status',
      'Payment Status',
      'Total',
      'Currency',
      'Item Count',
      'Tracking Number',
      'Carrier',
      'Created At',
      'Updated At',
    ];

    const csvRows = orders.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return [
        order.orderNumber,
        order.customerEmail || '',
        order.status,
        order.paymentStatus,
        order.total.toString(),
        order.currency || 'USD',
        itemCount.toString(),
        order.trackingNumber || '',
        order.carrier || '',
        new Date(order.createdAt).toISOString(),
        new Date(order.updatedAt).toISOString(),
      ];
    });

    // Escape CSV values
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

    // Set response headers
    const filename = `orders-export-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Add BOM for Excel compatibility
    res.write('\ufeff');
    res.end(csvContent);

    logger.info('Orders exported by admin', {
      orderCount: orders.length,
      filters: { orderIds, status, paymentStatus, search, startDate, endDate },
      actorId: req.user?.id,
      actorEmail: req.user?.email,
    });
  } catch (error) {
    logger.error('[Admin] Error exporting orders:', {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({
      error: 'Failed to export orders',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * POST /api/admin/orders/:id/shipment/label - Generate shipping label via EasyShip
* Generate shipping label using EasyShip API
 */
exports.generateShippingLabel = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;
    const { rateId } = req.body || {}; // Optional: pre-selected rate ID

    // Fetch order with full details
    const order = await prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    // Check if order can be shipped
    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      return next(new BadRequestError('无法为已取消或已退款的订单生成发货标签', { status: order.status }));
    }

    // Check if shipment already exists
    const existingShipment = await prisma.shipment.findFirst({
      where: { orderId: id },
    });

    if (existingShipment && existingShipment.labelUrl) {
      return next(
        new BadRequestError('该订单已存在发货标签', {
          shipmentId: existingShipment.id,
          labelUrl: existingShipment.labelUrl,
        })
      );
    }

    // Prepare shipment data for EasyShip
    const shipmentData = {
      orderId: order.id,
      orderNumber: order.orderNumber,
      email: order.email,
      currency: order.currency || 'CAD',
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => ({
        productName: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        priceSnapshot: Number(item.priceSnapshot),
        weight: item.variant.weight || 0.5, // Default weight in kg
      })),
      rateId: rateId || null,
    };

    // Create shipment via EasyShip API or Fallback to Manual
    let easyshipResult;
    try {
      // Check if EasyShip is configured
      if (!process.env.EASYSHIP_API_TOKEN) {
        logger.warn('EasyShip API token not configured, using manual fallback', {
          orderId: order.id,
          orderNumber: order.orderNumber,
        });

        // Manual fallback: Create a dummy result
        easyshipResult = {
          trackingNumber: `MANUAL-${Date.now()}`,
          carrier: 'Manual Fulfillment',
          labelUrl: null, // No real label
          labelPdfUrl: null,
          status: 'LABEL_CREATED',
        };
      } else {
        easyshipResult = await easyshipService.createShipment(shipmentData);
      }
    } catch (easyshipError) {
      logger.error('EasyShip API error', {
        timestamp,
        orderId: order.id,
        orderNumber: order.orderNumber,
        error: easyshipError.message,
      });
      return next(
        new InternalServerError('生成发货标签失败', {
          details: easyshipError.message,
          suggestion: '请检查 EasyShip API 配置或稍后重试',
        })
      );
    }

    // Update or create shipment record
    const shipment = await prisma.$transaction(async (tx) => {
      if (existingShipment) {
        return await tx.shipment.update({
          where: { id: existingShipment.id },
          data: {
            trackingNumber: easyshipResult.trackingNumber,
            carrier: easyshipResult.carrier,
            labelUrl: easyshipResult.labelUrl || easyshipResult.labelPdfUrl, // Might be null for manual
            status: 'LABEL_CREATED',
          },
        });
      } else {
        return await tx.shipment.create({
          data: {
            orderId: order.id,
            trackingNumber: easyshipResult.trackingNumber,
            carrier: easyshipResult.carrier,
            labelUrl: easyshipResult.labelUrl || easyshipResult.labelPdfUrl, // Might be null for manual
            status: 'LABEL_CREATED',
          },
        });
      }
    });

    // Update order status to SHIPPED if not already
    if (order.status !== 'SHIPPED' && order.status !== 'DELIVERED') {
      try {
        await updateOrderStatus(order.id, 'SHIPPED', {
          actorId: req.user?.id,
          actorName: req.user?.email,
          note: '发货标签已生成',
        });
      } catch (statusError) {
        logger.warn('Failed to update order status to SHIPPED', {
          timestamp,
          orderId: order.id,
          error: statusError.message,
        });
        // Don't fail label generation if status update fails
      }
    }

    logger.info('Shipping label generated successfully', {
      timestamp,
      orderId: order.id,
      orderNumber: order.orderNumber,
      shipmentId: shipment.id,
      trackingNumber: easyshipResult.trackingNumber,
      carrier: easyshipResult.carrier,
      labelUrl: shipment.labelUrl,
    });

    res.json({
      id: shipment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      trackingNumber: shipment.trackingNumber,
      carrier: shipment.carrier,
      labelUrl: shipment.labelUrl,
      status: shipment.status.toLowerCase(),
      createdAt: shipment.createdAt,
      updatedAt: shipment.updatedAt,
    });
  } catch (error) {
    logger.error('Error generating shipping label', {
      timestamp,
      orderId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });

    // Check for known configuration errors
    if (error.message && (error.message.includes('token is not configured') || error.message.includes('EasyShip API error'))) {
      return next(new BadRequestError(error.message));
    }

    next(new InternalServerError('生成发货标签失败，请稍后重试'));
  }
};

/**
 * GET /api/admin/orders/:id/shipment/rates - Get shipping rates from EasyShip
* Get available shipping rates for an order
 */
exports.getShippingRates = async (req, res, next) => {
  const timestamp = new Date().toISOString();
  try {
    const { id } = req.params;

    // Fetch order with full details
    const order = await prisma.order.findUnique({
      where: { id },
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

    if (!order) {
      return next(new NotFoundError('订单不存在'));
    }

    // Get shipping rates from EasyShip
    const rateData = {
      currency: order.currency || 'CAD',
      shippingAddress: order.shippingAddress,
      items: order.items.map((item) => ({
        productName: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        priceSnapshot: Number(item.priceSnapshot),
        weight: item.variant.weight || 0.5, // Default weight in kg
      })),
    };

    let rates = [];
    try {
      rates = await easyshipService.getShippingRates(rateData);
    } catch (rateError) {
      logger.warn('Failed to get EasyShip rates, returning empty array', {
        timestamp,
        orderId: order.id,
        error: rateError.message,
      });
      // Return empty array - frontend can handle fallback
    }

    res.json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      rates: rates,
      currency: order.currency || 'CAD',
    });
  } catch (error) {
    logger.error('Error getting shipping rates', {
      timestamp,
      orderId: req.params.id,
      userId: req.user?.id,
      error: error.message,
      stack: error.stack,
    });

    // Check for known configuration errors
    if (error.message && (error.message.includes('token is not configured') || error.message.includes('EasyShip API error'))) {
      return next(new BadRequestError(error.message));
    }

    next(new InternalServerError('获取运费报价失败，请稍后重试'));
  }
};


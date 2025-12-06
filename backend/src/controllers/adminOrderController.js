/**
 * Admin Order Controller
 * [2025-11-12 01:05:02] 后台订单管理接口
 * [2025-01-27 10:15:00] Enhanced with Stripe refund integration and email notifications
 * [2025-01-27 13:10:00] Enhanced with order state machine validation
 */
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
const logger = require('../utils/logger');
const { sendRefundConfirmation } = require('../services/emailService');
const { updateOrderStatus, validateStatusTransition } = require('../services/orderService');
const { BadRequestError } = require('../utils/errors');

const ALLOWED_STATUSES = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];
const ALLOWED_PAYMENT_STATUSES = ['PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'];

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || null;
};

// [2025-01-28 08:30:00] Audit Logs 功能已移除

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

/**
 * PATCH /api/admin/orders/:id/status - Update order status with state machine validation
 * [2025-11-12 01:05:02] Original implementation
 * [2025-01-27 13:10:00] Enhanced with state machine validation
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
    if (status) {
      const normalizedStatus = String(status).toUpperCase();
      if (!ALLOWED_STATUSES.includes(normalizedStatus)) {
        return res.status(400).json({ error: 'Invalid status value' });
      }

      // Validate state transition
      try {
        validateStatusTransition(currentOrder, normalizedStatus);
        updateData.status = normalizedStatus;
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
    // [2025-01-27 14:05:00] Enhanced tracking update with shipment creation
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
    let shipmentUpdated = false;
    const order = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
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

      // Create or update shipment record if tracking info provided
      if (trackingNumber && carrier) {
        const existingShipment = await tx.shipment.findFirst({
          where: { orderId: id },
        });

        if (existingShipment) {
          // [2025-12-06 15:00:00] Check if tracking info changed
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

    // [2025-12-06 15:00:00] Send tracking update notification if tracking info was added or updated
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
            shippingAddress: true,
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

    // [2025-01-28 08:30:00] Audit Logs 功能已移除

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
 * [2025-01-27 10:15:00] Enhanced with Stripe refund integration
 */
exports.recordRefund = async (req, res) => {
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
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate order can be refunded
    if (order.paymentStatus !== 'COMPLETED') {
      return res.status(400).json({
        error: 'Order payment status must be COMPLETED to process refund',
        currentStatus: order.paymentStatus,
      });
    }

    if (order.status === 'REFUNDED') {
      return res.status(400).json({
        error: 'Order has already been refunded',
      });
    }

    const refundAmount = amount ? Number(amount) : Number(order.total);
    if (refundAmount <= 0 || refundAmount > Number(order.total)) {
      return res.status(400).json({
        error: 'Invalid refund amount',
        maxAmount: Number(order.total),
      });
    }

    let stripeRefund = null;
    let refundError = null;

    // Process Stripe refund if payment intent exists and refundToStripe is true
    if (refundToStripe && order.paymentIntentId && process.env.STRIPE_SECRET_KEY) {
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
          return res.status(500).json({
            error: 'Failed to process Stripe refund',
            details: stripeError.message,
            suggestion: 'You can record refund manually by setting refundToStripe=false',
          });
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

    // [2025-01-28 08:30:00] Audit Logs 功能已移除

    // Send refund confirmation email (don't fail if email fails)
    try {
      await sendRefundConfirmation(updatedOrder, refundAmount, reason);
    } catch (emailError) {
      logger.warn('Failed to send refund confirmation email', {
        orderNumber: order.orderNumber,
        error: emailError.message,
      });
    }

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
      ...(refundError && { warning: `Stripe refund failed: ${refundError}` }),
    });
  } catch (error) {
    logger.error('[Admin] Error processing refund:', error);
    res.status(500).json({
      error: 'Failed to process refund',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};


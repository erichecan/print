/**
 * Order Service
 * [2025-01-27 13:00:00] Order state machine and business logic
 */
const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const { BadRequestError, ForbiddenError } = require('../utils/errors');
const { sendOrderStatusUpdateNotification, sendOrderCancellationConfirmation } = require('./emailService');

/**
 * Order Status State Machine
 * [2025-01-27 13:00:00] Defines valid state transitions
 */
const ORDER_STATUS_TRANSITIONS = {
  PENDING: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [], // Terminal state
  CANCELLED: [], // Terminal state
  REFUNDED: [], // Terminal state
};

/**
 * Check if order status transition is valid
 * [2025-01-27 13:00:00]
 */
function isValidStatusTransition(fromStatus, toStatus) {
  if (!fromStatus || !toStatus) {
    return false;
  }

  const normalizedFrom = String(fromStatus).toUpperCase();
  const normalizedTo = String(toStatus).toUpperCase();

  // Same status is always valid (no-op)
  if (normalizedFrom === normalizedTo) {
    return true;
  }

  // Check if transition is allowed
  const allowedTransitions = ORDER_STATUS_TRANSITIONS[normalizedFrom] || [];
  return allowedTransitions.includes(normalizedTo);
}

/**
 * Get allowed status transitions for current order status
 * [2025-01-27 13:00:00]
 */
function getAllowedTransitions(currentStatus) {
  if (!currentStatus) {
    return [];
  }

  const normalized = String(currentStatus).toUpperCase();
  return ORDER_STATUS_TRANSITIONS[normalized] || [];
}

/**
 * Validate order status transition
 * [2025-01-27 13:00:00]
 */
function validateStatusTransition(order, newStatus) {
  const currentStatus = order.status;
  const normalizedNewStatus = String(newStatus).toUpperCase();

  // Check if transition is valid
  if (!isValidStatusTransition(currentStatus, normalizedNewStatus)) {
    const allowed = getAllowedTransitions(currentStatus);
    throw new BadRequestError(
      `Cannot transition order from ${currentStatus} to ${normalizedNewStatus}. ` +
      `Allowed transitions: ${allowed.length > 0 ? allowed.join(', ') : 'none (terminal state)'}`
    );
  }

  // Additional business rules
  // Cannot cancel orders that are already delivered or refunded
  if (normalizedNewStatus === 'CANCELLED') {
    if (currentStatus === 'DELIVERED' || currentStatus === 'REFUNDED') {
      throw new BadRequestError(
        `Cannot cancel order in ${currentStatus} status`
      );
    }
  }

  // Cannot ship orders that haven't been paid
  if (normalizedNewStatus === 'SHIPPED') {
    if (order.paymentStatus !== 'COMPLETED') {
      throw new BadRequestError(
        'Cannot ship order with unpaid payment status'
      );
    }
  }

  return true;
}

/**
 * Update order status with validation and logging
 * [2025-01-27 13:00:00]
 */
async function updateOrderStatus(orderId, newStatus, options = {}) {
  const { actorId, actorName, note, skipValidation = false } = options;

  // Fetch current order
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      userId: true,
    },
  });

  if (!order) {
    throw new BadRequestError('Order not found');
  }

  const normalizedNewStatus = String(newStatus).toUpperCase();

  // Skip validation if status hasn't changed
  if (order.status === normalizedNewStatus && !skipValidation) {
    logger.debug('Order status unchanged', {
      orderId,
      orderNumber: order.orderNumber,
      status: normalizedNewStatus,
    });
    return order;
  }

  // Validate transition
  if (!skipValidation) {
    validateStatusTransition(order, normalizedNewStatus);
  }

  // Update order status
  const updatedOrder = await prisma.order.update({
    where: { id: orderId },
    data: {
      status: normalizedNewStatus,
      updatedAt: new Date(),
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      updatedAt: true,
    },
  });

  logger.info('Order status updated', {
    orderId,
    orderNumber: order.orderNumber,
    fromStatus: order.status,
    toStatus: normalizedNewStatus,
    actorId,
    actorName,
  });

  // [2025-12-06 11:00:00] If status changed to CANCELLED, send cancellation email
  // Otherwise, send status update notification email (handled by Issue #3 implementation)
  if (normalizedNewStatus === 'CANCELLED' && order.status !== 'CANCELLED') {
    try {
      // Fetch full order details for email
      const orderWithDetails = await prisma.order.findUnique({
        where: { id: orderId },
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
        const cancelledBy = actorId ? 'admin' : 'system';
        await sendOrderCancellationConfirmation(orderWithDetails, note, cancelledBy);
        logger.info('Order cancellation confirmation email sent via updateOrderStatus', {
          orderNumber: order.orderNumber,
          email: orderWithDetails.email,
          cancelledBy,
          reason: note || null,
        });
      }
    } catch (emailError) {
      logger.warn('Failed to send order cancellation confirmation email via updateOrderStatus', {
        orderNumber: order.orderNumber,
        error: emailError.message,
      });
      // Don't throw - email failure shouldn't fail status update
    }
  }

  return updatedOrder;
}

/**
 * Cancel order
 * [2025-01-27 13:00:00]
 */
async function cancelOrder(orderId, options = {}) {
  const { userId, reason, restoreInventory = true, processRefund = true } = options;

  // Fetch order with items
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
    },
  });

  if (!order) {
    throw new BadRequestError('Order not found');
  }

  // Check if user has permission to cancel
  if (userId && order.userId !== userId) {
    throw new ForbiddenError('You do not have permission to cancel this order');
  }

  // Validate order can be cancelled
  if (order.status === 'DELIVERED' || order.status === 'REFUNDED') {
    throw new BadRequestError(`Cannot cancel order in ${order.status} status`);
  }

  if (order.status === 'CANCELLED') {
    throw new BadRequestError('Order is already cancelled');
  }

  // Update order status to CANCELLED
  const updatedOrder = await prisma.$transaction(async (tx) => {
    // Update order status
    const cancelledOrder = await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    // [2025-12-06 11:30:00] Restore inventory if needed
    // Use correct Prisma model name: Variant (not productVariant)
    if (restoreInventory) {
      for (const item of order.items) {
        await tx.variant.update({
          where: { id: item.variantId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
      }

      logger.info('Inventory restored for cancelled order', {
        orderId,
        orderNumber: order.orderNumber,
        itemsRestored: order.items.length,
      });
    }

    // Process refund if payment was completed
    if (processRefund && order.paymentStatus === 'COMPLETED') {
      // Note: Actual refund processing should be done via adminOrderController.recordRefund
      // This just marks the order as needing refund
      logger.info('Order cancelled with payment, refund should be processed', {
        orderId,
        orderNumber: order.orderNumber,
        total: Number(order.total),
      });
    }

    return cancelledOrder;
  });

  logger.info('Order cancelled', {
    orderId,
    orderNumber: order.orderNumber,
    userId,
    reason,
    restoreInventory,
    processRefund,
  });

  // [2025-12-06 11:00:00] Send cancellation confirmation email (don't fail if email fails)
  try {
    // Fetch full order details for email
    const orderWithDetails = await prisma.order.findUnique({
      where: { id: orderId },
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
      const cancelledBy = userId ? 'customer' : 'admin';
      await sendOrderCancellationConfirmation(orderWithDetails, reason, cancelledBy);
      logger.info('Order cancellation confirmation email sent', {
        orderNumber: order.orderNumber,
        email: orderWithDetails.email,
        cancelledBy,
        reason: reason || null,
      });
    }
  } catch (emailError) {
    logger.warn('Failed to send order cancellation confirmation email', {
      orderNumber: order.orderNumber,
      error: emailError.message,
    });
    // Don't throw - email failure shouldn't fail cancellation
  }

  return updatedOrder;
}

/**
 * Check if order can be cancelled
 * [2025-01-27 13:00:00]
 */
function canCancelOrder(order) {
  if (!order) {
    return false;
  }

  const status = String(order.status).toUpperCase();
  return status === 'PENDING' || status === 'PROCESSING';
}

module.exports = {
  isValidStatusTransition,
  getAllowedTransitions,
  validateStatusTransition,
  updateOrderStatus,
  cancelOrder,
  canCancelOrder,
  ORDER_STATUS_TRANSITIONS,
};



/**
 * Webhook Controller
* Enhanced with email notifications and better error handling
* Enhanced with idempotency, payment summary recording
 */
const logger = require('../utils/logger'); // [2026-03-02 05:54:50] 补充 webhookController 日志依赖
const prisma = require('../lib/prisma');
const Stripe = require('stripe');

// Global Stripe Initialization to fail fast
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? Stripe(stripeSecretKey) : null;

if (!stripeSecretKey && process.env.NODE_ENV === 'production') {
  logger.error('CRITICAL: STRIPE_SECRET_KEY is not set in webhookController. Webhooks will fail.');
}

const { sendOrderConfirmation } = require('../services/emailService');
const { increaseInventory } = require('../services/inventoryService');

/**
 * POST /api/webhooks/stripe - Handle Stripe webhooks
* Enhanced with better error handling and logging
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    // Verify Stripe is initialized
    if (!stripe) {
      logger.error('Stripe not initialized in webhook handler');
      return res.status(500).json({ error: 'Stripe configuration error' });
    }
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    logger.info('Stripe webhook received', {
      type: event.type,
      id: event.id,
    });
  } catch (err) {
    logger.error('Webhook signature verification failed', {
      error: err.message,
      signature: sig ? 'present' : 'missing',
    });
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    // Check idempotency - prevent duplicate processing
    const existingEvent = await prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existingEvent) {
      logger.info('Webhook event already processed (idempotency)', {
        eventId: event.id,
        eventType: event.type,
        processedAt: existingEvent.processedAt,
      });
      return res.json({ received: true, message: 'Event already processed' });
    }

    // Create webhook event record for idempotency
    let webhookEventRecord;
    try {
      webhookEventRecord = await prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          eventType: event.type,
          metadata: {
            eventData: event.data?.object?.id || null,
          },
        },
      });
    } catch (createError) {
      // If creation fails due to unique constraint, another process already handled it
      if (createError.code === 'P2002') {
        logger.info('Webhook event already processed (race condition)', {
          eventId: event.id,
          eventType: event.type,
        });
        return res.json({ received: true, message: 'Event already processed' });
      }
      throw createError;
    }

    // Handle the event
    let handlerSuccess = false;
    let handlerError = null;
    let orderId = null;
    let paymentIntentId = null;

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          const result1 = await handlePaymentIntentSucceeded(event.data.object);
          orderId = result1?.orderId || null;
          paymentIntentId = event.data.object.id;
          handlerSuccess = true;
          break;

        case 'payment_intent.payment_failed':
          const result2 = await handlePaymentIntentFailed(event.data.object);
          orderId = result2?.orderId || null;
          paymentIntentId = event.data.object.id;
          handlerSuccess = true;
          break;

        case 'charge.refunded':
          const result3 = await handleChargeRefunded(event.data.object);
          orderId = result3?.orderId || null;
          paymentIntentId = event.data.object.payment_intent || null;
          handlerSuccess = true;
          break;

        case 'payment_intent.canceled':
          // Handle canceled payment intent
          const result4 = await handlePaymentIntentCanceled(event.data.object);
          orderId = result4?.orderId || null;
          paymentIntentId = event.data.object.id;
          handlerSuccess = true;
          break;

        default:
          logger.debug('Unhandled webhook event type', {
            type: event.type,
            id: event.id,
          });
          handlerSuccess = true; // Not an error, just unhandled
      }

      // Update webhook event record with result
      await prisma.webhookEvent.update({
        where: { id: webhookEventRecord.id },
        data: {
          success: handlerSuccess,
          orderId,
          paymentIntentId,
          errorMessage: handlerError?.message || null,
        },
      });

      res.json({ received: true });
    } catch (handlerError) {
      // Update webhook event record with error
      await prisma.webhookEvent.update({
        where: { id: webhookEventRecord.id },
        data: {
          success: false,
          orderId,
          paymentIntentId,
          errorMessage: handlerError.message,
        },
      });

      throw handlerError;
    }
  } catch (error) {
    logger.error('Error handling webhook', {
      eventType: event.type,
      eventId: event.id,
      error: error.message,
      stack: error.stack,
    });
    // Return 200 to prevent Stripe from retrying
    // Log error for manual investigation
    res.status(200).json({
      received: true,
      error: 'Webhook handler failed, but acknowledged',
    });
  }
};

/**
 * Handle payment_intent.succeeded event
* Enhanced with email notification
* Enhanced with payment summary recording (balance_transaction, fee)
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Find order by paymentIntentId
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
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
      logger.warn('Order not found for payment intent', {
        paymentIntentId: paymentIntent.id,
      });
      return { orderId: null };
    }

    // Fetch charge details to get balance_transaction and fee
    let balanceTransactionId = null;
    let paymentFee = null;

    if (paymentIntent.latest_charge) {
      try {
        const charge = await stripe.charges.retrieve(paymentIntent.latest_charge);
        balanceTransactionId = charge.balance_transaction;

        // Get fee from balance transaction
        if (balanceTransactionId) {
          const balanceTransaction = await stripe.balanceTransactions.retrieve(balanceTransactionId);
          // Fee is in the smallest currency unit (cents), convert to CAD
          paymentFee = balanceTransaction.fee / 100;
        }
      } catch (stripeError) {
        logger.warn('Failed to fetch charge/balance transaction details', {
          paymentIntentId: paymentIntent.id,
          error: stripeError.message,
        });
        // Don't fail webhook if we can't get fee details
      }
    }

    // Update order status to PROCESSING if still PENDING
    if (order.status === 'PENDING' && order.paymentStatus === 'PENDING') {
      const updateData = {
        paymentStatus: 'COMPLETED',
        status: 'PROCESSING',
      };

      // Add payment summary if available
      if (balanceTransactionId) {
        updateData.balanceTransactionId = balanceTransactionId;
      }
      if (paymentFee !== null) {
        updateData.paymentFee = paymentFee;
      }

      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: updateData,
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

      logger.info('Order payment confirmed and status updated', {
        orderNumber: order.orderNumber,
        orderId: order.id,
        paymentIntentId: paymentIntent.id,
        balanceTransactionId,
        paymentFee,
      });

      // Send order confirmation email (don't fail webhook if email fails)
      try {
        await sendOrderConfirmation(updatedOrder);
      } catch (emailError) {
        logger.warn('Failed to send order confirmation email', {
          orderNumber: order.orderNumber,
          error: emailError.message,
        });
        // Don't throw - email failure shouldn't fail webhook
      }

      return { orderId: order.id };
    } else {
      logger.debug('Order status not updated (already processed)', {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        currentPaymentStatus: order.paymentStatus,
      });
      return { orderId: order.id };
    }
  } catch (error) {
    logger.error('Error handling payment_intent.succeeded', {
      paymentIntentId: paymentIntent.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
* Enhanced with better logging
 */
/**
 * Handle payment_intent.payment_failed event
* Enhanced with better logging
* Enhanced with inventory restoration
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Find order by paymentIntentId with items
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for failed payment intent', {
        paymentIntentId: paymentIntent.id,
      });
      return { orderId: null };
    }

    // Restore inventory if order was created and payment failed
    // Only restore if order status is PENDING (order was created but payment failed)
    if (order.status === 'PENDING' && order.items && order.items.length > 0) {
      try {
        await increaseInventory(
          order.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))
        );

        logger.info('Inventory restored for failed payment', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          itemsRestored: order.items.length,
        });
      } catch (inventoryError) {
        logger.error('Failed to restore inventory for failed payment', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          error: inventoryError.message,
        });
        // Don't throw - inventory restoration failure shouldn't fail webhook processing
      }
    }

    // Update order payment status to FAILED
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'FAILED',
      },
    });

    logger.warn('Order payment failed', {
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
      failureCode: paymentIntent.last_payment_error?.code,
      failureMessage: paymentIntent.last_payment_error?.message,
      inventoryRestored: order.status === 'PENDING' && order.items && order.items.length > 0,
    });

    // TODO: Send payment failure notification email (optional)
    return { orderId: order.id };
  } catch (error) {
    logger.error('Error handling payment_intent.payment_failed', {
      paymentIntentId: paymentIntent.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Handle charge.refunded event
* Enhanced with better logging and partial refund handling
 */
async function handleChargeRefunded(charge) {
  try {
    // Find order by paymentIntentId from charge
    const paymentIntentId = charge.payment_intent;

    if (!paymentIntentId) {
      logger.warn('No payment intent ID in charge refund event', {
        chargeId: charge.id,
      });
      return;
    }

    const order = await prisma.order.findUnique({
      where: { paymentIntentId },
    });

    if (!order) {
      logger.warn('Order not found for refunded charge', {
        paymentIntentId,
        chargeId: charge.id,
      });
      return;
    }

    // Check if full or partial refund
    const refundAmount = charge.amount_refunded / 100; // Convert from cents
    const orderTotal = Number(order.total);
    const isFullRefund = refundAmount >= orderTotal;

    // Update order status
    const updateData = {};
    if (isFullRefund) {
      updateData.status = 'REFUNDED';
      updateData.paymentStatus = 'REFUNDED';
    } else {
      // Partial refund - keep order status but mark payment as refunded
      updateData.paymentStatus = 'REFUNDED';
    }

    await prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    logger.info('Order refund processed via webhook', {
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentIntentId,
      chargeId: charge.id,
      refundAmount,
      orderTotal,
      isFullRefund,
    });

    // Note: Refund confirmation email is sent from adminOrderController
    // when refund is initiated, not from webhook
    return { orderId: order.id };
  } catch (error) {
    logger.error('Error handling charge.refunded', {
      paymentIntentId: charge.payment_intent,
      chargeId: charge.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

/**
 * Handle payment_intent.canceled event
* Handle canceled payment intents
 */
async function handlePaymentIntentCanceled(paymentIntent) {
  try {
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
      include: {
        items: {
          include: {
            variant: true,
          },
        },
      },
    });

    if (!order) {
      logger.warn('Order not found for canceled payment intent', {
        paymentIntentId: paymentIntent.id,
      });
      return { orderId: null };
    }

    // Restore inventory if order was created
    if (order.status === 'PENDING' && order.items && order.items.length > 0) {
      try {
        await increaseInventory(
          order.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          }))
        );

        logger.info('Inventory restored for canceled payment', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          itemsRestored: order.items.length,
        });
      } catch (inventoryError) {
        logger.error('Failed to restore inventory for canceled payment', {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentIntentId: paymentIntent.id,
          error: inventoryError.message,
        });
      }
    }

    // Update order payment status to FAILED
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentStatus: 'FAILED',
        status: 'CANCELLED',
      },
    });

    logger.info('Order payment canceled via webhook', {
      orderNumber: order.orderNumber,
      orderId: order.id,
      paymentIntentId: paymentIntent.id,
    });

    return { orderId: order.id };
  } catch (error) {
    logger.error('Error handling payment_intent.canceled', {
      paymentIntentId: paymentIntent.id,
      error: error.message,
      stack: error.stack,
    });
    throw error;
  }
}

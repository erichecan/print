/**
 * Webhook Controller
 * [2025-11-04 23:55:00]
 * [2025-01-27 10:30:00] Enhanced with email notifications and better error handling
 */
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');
const logger = require('../utils/logger');
const { sendOrderConfirmation } = require('../services/emailService');

/**
 * POST /api/webhooks/stripe - Handle Stripe webhooks
 * [2025-11-04 23:55:00]
 * [2025-01-27 10:30:00] Enhanced with better error handling and logging
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
    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;

      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;

      default:
        logger.debug('Unhandled webhook event type', {
          type: event.type,
          id: event.id,
        });
    }

    res.json({ received: true });
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
 * [2025-11-04 23:55:00]
 * [2025-01-27 10:30:00] Enhanced with email notification
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
      return;
    }

    // Update order status to PROCESSING if still PENDING
    if (order.status === 'PENDING' && order.paymentStatus === 'PENDING') {
      const updatedOrder = await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'PROCESSING',
        },
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
    } else {
      logger.debug('Order status not updated (already processed)', {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        currentPaymentStatus: order.paymentStatus,
      });
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
 * [2025-11-04 23:55:00]
 * [2025-01-27 10:30:00] Enhanced with better logging
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Find order by paymentIntentId
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (!order) {
      logger.warn('Order not found for failed payment intent', {
        paymentIntentId: paymentIntent.id,
      });
      return;
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
    });

    // TODO: Send payment failure notification email (optional)
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
 * [2025-11-04 23:55:00]
 * [2025-01-27 10:30:00] Enhanced with better logging and partial refund handling
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

/**
 * Webhook Controller
 * [2025-11-04 23:55:00]
 */
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * POST /api/webhooks/stripe - Handle Stripe webhooks
 * [2025-11-04 23:55:00]
 */
exports.handleStripeWebhook = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  let event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
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
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).json({ error: 'Webhook handler failed' });
  }
};

/**
 * Handle payment_intent.succeeded event
 * [2025-11-04 23:55:00]
 */
async function handlePaymentIntentSucceeded(paymentIntent) {
  try {
    // Find order by paymentIntentId
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (order) {
      // Update order status to PROCESSING if still PENDING
      if (order.status === 'PENDING' && order.paymentStatus === 'PENDING') {
        await prisma.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'PROCESSING',
          },
        });

        console.log(`Order ${order.orderNumber} payment confirmed and status updated to PROCESSING`);
      }
    } else {
      console.warn(`Order not found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error('Error handling payment_intent.succeeded:', error);
    throw error;
  }
}

/**
 * Handle payment_intent.payment_failed event
 * [2025-11-04 23:55:00]
 */
async function handlePaymentIntentFailed(paymentIntent) {
  try {
    // Find order by paymentIntentId
    const order = await prisma.order.findUnique({
      where: { paymentIntentId: paymentIntent.id },
    });

    if (order) {
      // Update order payment status to FAILED
      await prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: 'FAILED',
        },
      });

      console.log(`Order ${order.orderNumber} payment failed`);
    } else {
      console.warn(`Order not found for payment intent: ${paymentIntent.id}`);
    }
  } catch (error) {
    console.error('Error handling payment_intent.payment_failed:', error);
    throw error;
  }
}

/**
 * Handle charge.refunded event
 * [2025-11-04 23:55:00]
 */
async function handleChargeRefunded(charge) {
  try {
    // Find order by paymentIntentId from charge
    const paymentIntentId = charge.payment_intent;

    if (!paymentIntentId) {
      console.warn('No payment intent ID in charge refund event');
      return;
    }

    const order = await prisma.order.findUnique({
      where: { paymentIntentId },
    });

    if (order) {
      // Update order status to REFUNDED
      await prisma.order.update({
        where: { id: order.id },
        data: {
          status: 'REFUNDED',
          paymentStatus: 'REFUNDED',
        },
      });

      console.log(`Order ${order.orderNumber} refunded`);
    } else {
      console.warn(`Order not found for payment intent: ${paymentIntentId}`);
    }
  } catch (error) {
    console.error('Error handling charge.refunded:', error);
    throw error;
  }
}

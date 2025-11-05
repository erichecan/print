/**
 * Checkout Controller
 * [2025-11-04 23:53:00]
 */
const prisma = require('../lib/prisma');
const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY || '');

/**
 * Get or create cart helper (reuse from cartController logic)
 * [2025-11-04 23:53:00]
 */
async function getOrCreateCart(userId, sessionId) {
  if (userId) {
    let cart = await prisma.cart.findUnique({
      where: { userId },
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
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
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
    }
    return cart;
  } else if (sessionId) {
    let cart = await prisma.cart.findUnique({
      where: { sessionId },
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
    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId },
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
    }
    return cart;
  }
  throw new Error('Either userId or sessionId must be provided');
}

/**
 * Calculate tax based on province/state
 * [2025-11-04 23:53:00]
 */
function calculateTax(subtotal, province) {
  // Simple tax rates (Phase 1)
  const taxRates = {
    // Canada
    ON: 0.13, // HST
    BC: 0.12, // PST + GST
    QC: 0.14975, // GST + QST
    AB: 0.05, // GST only
    SK: 0.11, // PST + GST
    MB: 0.12, // PST + GST
    NB: 0.15, // HST
    NS: 0.15, // HST
    PE: 0.15, // HST
    NL: 0.15, // HST
    NT: 0.05, // GST only
    YT: 0.05, // GST only
    NU: 0.05, // GST only
    // USA - approximate average
    CA: 0.08,
    NY: 0.08,
    TX: 0.0825,
    FL: 0.06,
    default: 0.08, // Default 8%
  };

  const rate = taxRates[province?.toUpperCase()] || taxRates.default;
  return Math.round(subtotal * rate * 100) / 100;
}

/**
 * Calculate static shipping rates
 * [2025-11-04 23:53:00]
 */
function calculateShipping(country, province, shippingMethod = 'standard') {
  // Phase 1: Static rates
  if (country?.toUpperCase() === 'CA' || country?.toUpperCase() === 'CAN') {
    return shippingMethod === 'express' ? 19.99 : 9.99;
  } else if (country?.toUpperCase() === 'US' || country?.toUpperCase() === 'USA') {
    return 12.99;
  }
  return 15.99; // Default
}

/**
 * POST /api/checkout/prepare - Prepare checkout
 * [2025-11-04 23:53:00]
 */
exports.prepareCheckout = async (req, res) => {
  try {
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate subtotal
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    res.json({
      subtotal: Math.round(subtotal * 100) / 100,
      itemCount: cart.items.length,
      items: cart.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        quantity: item.quantity,
        price: Number(item.priceSnapshot),
      })),
    });
  } catch (error) {
    console.error('Error preparing checkout:', error);
    res.status(500).json({ error: 'Failed to prepare checkout' });
  }
};

/**
 * POST /api/checkout/shipping-rates - Get shipping rates
 * [2025-11-04 23:53:00]
 */
exports.getShippingRates = async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || !address.country) {
      return res.status(400).json({ error: 'Address with country is required' });
    }

    // Phase 1: Static rates
    const rates = [
      {
        id: 'standard',
        name: 'Standard Shipping',
        cost: calculateShipping(address.country, address.province, 'standard'),
        estimatedDays: address.country?.toUpperCase() === 'CA' || address.country?.toUpperCase() === 'CAN' ? 7 : 10,
      },
      {
        id: 'express',
        name: 'Express Shipping',
        cost: calculateShipping(address.country, address.province, 'express'),
        estimatedDays: address.country?.toUpperCase() === 'CA' || address.country?.toUpperCase() === 'CAN' ? 3 : 5,
      },
    ];

    res.json({ rates });
  } catch (error) {
    console.error('Error getting shipping rates:', error);
    res.status(500).json({ error: 'Failed to get shipping rates' });
  }
};

/**
 * POST /api/checkout/create-payment-intent - Create Stripe PaymentIntent
 * [2025-11-04 23:53:00]
 */
exports.createPaymentIntent = async (req, res) => {
  try {
    const { shippingAddress, shippingMethod = 'standard' } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    const shippingCost = calculateShipping(shippingAddress.country, shippingAddress.province, shippingMethod);
    const tax = calculateTax(subtotal, shippingAddress.province);
    const total = subtotal + shippingCost + tax;

    // Create PaymentIntent with Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100), // Convert to cents
      currency: 'cad',
      metadata: {
        userId: userId || '',
        sessionId: sessionId || '',
        itemCount: cart.items.length.toString(),
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: total,
      currency: 'CAD',
    });
  } catch (error) {
    console.error('Error creating payment intent:', error);
    res.status(500).json({ error: 'Failed to create payment intent', details: error.message });
  }
};

/**
 * POST /api/checkout/confirm - Confirm order after payment
 * [2025-11-04 23:53:00]
 */
exports.confirmOrder = async (req, res) => {
  try {
    const { paymentIntentId, shippingAddress, billingAddress, shippingMethod = 'standard' } = req.body;
    const userId = req.user?.id || null;
    const sessionId = req.sessionId || null;
    const email = req.body.email || req.user?.email;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'paymentIntentId is required' });
    }

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    if (!shippingAddress) {
      return res.status(400).json({ error: 'Shipping address is required' });
    }

    // Verify PaymentIntent with Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      return res.status(500).json({ error: 'Stripe is not configured' });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        error: 'Payment not completed',
        status: paymentIntent.status,
      });
    }

    // Get cart
    const cart = await getOrCreateCart(userId, sessionId);

    if (cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.priceSnapshot) * item.quantity;
    }, 0);

    const shippingCost = calculateShipping(shippingAddress.country, shippingAddress.province, shippingMethod);
    const tax = calculateTax(subtotal, shippingAddress.province);
    const total = subtotal + shippingCost + tax;

    // Generate order number
    const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    // Create order
    const order = await prisma.order.create({
      data: {
        orderNumber,
        userId: userId || null,
        email,
        status: 'PENDING',
        currency: 'CAD',
        subtotal: subtotal,
        shippingCost: shippingCost,
        tax: tax,
        discount: 0,
        total: total,
        paymentStatus: 'COMPLETED',
        paymentIntentId: paymentIntentId,
        shippingAddress: shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        items: {
          create: cart.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            priceSnapshot: item.priceSnapshot,
          })),
        },
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

    // Clear cart
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status.toLowerCase(),
      total: Number(order.total),
      email: order.email,
    });
  } catch (error) {
    console.error('Error confirming order:', error);
    res.status(500).json({ error: 'Failed to confirm order', details: error.message });
  }
};

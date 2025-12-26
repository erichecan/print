const mockStripeCreate = jest.fn();
const mockStripeRetrieve = jest.fn();

jest.mock('stripe', () =>
  jest.fn(() => ({
    paymentIntents: {
      create: mockStripeCreate,
      retrieve: mockStripeRetrieve,
    },
  }))
);

jest.mock('../../src/lib/prisma', () => ({
  cart: {
    findUnique: jest.fn(),
    create: jest.fn(),
  },
  variant: {
    findUnique: jest.fn(),
  },
  promotion: {
    findMany: jest.fn(),
  },
  coupon: {
    findFirst: jest.fn(),
  },
  orderCoupon: {
    count: jest.fn(),
  },
  $transaction: jest.fn(),
}));

process.env.STRIPE_SECRET_KEY = 'sk_test_unit';

const prisma = require('../../src/lib/prisma');
const checkoutController = require('../../src/controllers/checkoutController');

function createMockResponse() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

const mockCart = {
  id: 'cart_123',
  items: [
    { id: 'item1', variantId: 'variant1', quantity: 2, priceSnapshot: '49.99' },
    { id: 'item2', variantId: 'variant2', quantity: 1, priceSnapshot: '19.5' },
  ],
};

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit'; // Ensure key exists
  prisma.cart.findUnique.mockResolvedValue(mockCart);
  prisma.cart.create.mockResolvedValue(mockCart);
});

describe('[2025-11-12 02:10:00] checkoutController.prepareCheckout', () => {
  it('returns totals when cart has items and address provided', async () => {
    const req = {
      user: null,
      sessionId: 'session-unit',
      body: {
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
        shippingMethod: 'standard',
      },
    };
    const res = createMockResponse();

    await checkoutController.prepareCheckout(req, res);

    expect(prisma.cart.findUnique).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        subtotal: expect.any(Number),
        shipping: expect.any(Number),
        tax: expect.any(Number),
        total: expect.any(Number),
        itemCount: 2,
      })
    );
  });

  it('returns 400 when cart is empty', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce({ ...mockCart, items: [] });

    const req = {
      user: null,
      sessionId: 'session-empty',
      body: {},
    };
    const res = createMockResponse();

    await checkoutController.prepareCheckout(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'Cart is empty' });
  });
});

describe('[2025-11-12 02:10:00] checkoutController.createPaymentIntent', () => {
  it('returns 400 when shipping address missing', async () => {
    const req = {
      user: null,
      sessionId: 'session-missing',
      body: {},
    };
    const res = createMockResponse();

    await checkoutController.createPaymentIntent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Shipping address is required' }));
  });

  it('returns 400 when cart is empty', async () => {
    prisma.cart.findUnique.mockResolvedValueOnce({ ...mockCart, items: [] });

    const req = {
      user: null,
      sessionId: 'session-empty',
      body: {
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
      },
    };
    const res = createMockResponse();

    await checkoutController.createPaymentIntent(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Cart is empty' }));
  });

  it('creates payment intent and returns breakdown', async () => {
    mockStripeCreate.mockResolvedValueOnce({
      client_secret: 'cs_test_123',
      id: 'pi_test_123',
    });

    const req = {
      user: null,
      sessionId: 'session-success',
      body: {
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
        shippingMethod: 'express',
      },
    };
    const res = createMockResponse();

    await checkoutController.createPaymentIntent(req, res);

    expect(mockStripeCreate).toHaveBeenCalledWith(
      expect.objectContaining({ amount: expect.any(Number), currency: 'cad' }),
      expect.anything() // Expect options object (idempotencyKey)
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: 'cs_test_123',
        paymentIntentId: 'pi_test_123',
        breakdown: expect.objectContaining({ total: expect.any(Number) }),
      })
    );
  });

  it('returns 500 when Stripe is not configured', async () => {
    const originalStripeKey = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    const req = {
      user: null,
      sessionId: 'session-no-stripe',
      body: {
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
      },
    };
    const res = createMockResponse();

    await checkoutController.createPaymentIntent(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Stripe is not configured' }));

    process.env.STRIPE_SECRET_KEY = originalStripeKey;
  });
});

describe('[2025-01-27 12:35:00] checkoutController.getShippingRates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return shipping rates for valid address', async () => {
    const req = {
      body: {
        address: {
          country: 'CA',
          province: 'ON',
        },
      },
    };
    const res = createMockResponse();

    await checkoutController.getShippingRates(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        rates: expect.arrayContaining([
          expect.objectContaining({
            id: 'standard',
            name: 'Standard Shipping',
            cost: expect.any(Number),
          }),
          expect.objectContaining({
            id: 'express',
            name: 'Express Shipping',
            cost: expect.any(Number),
          }),
        ]),
      })
    );
  });

  it('should return 400 when address is missing', async () => {
    const req = {
      body: {},
    };
    const res = createMockResponse();

    await checkoutController.getShippingRates(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Address with country is required',
    });
  });
});

describe('[2025-01-27 12:35:00] checkoutController.confirmOrder', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Stripe mocks
    mockStripeRetrieve.mockReset();
    // Setup default cart mocks
    prisma.cart.findUnique.mockResolvedValue(mockCart);
    prisma.cart.create.mockResolvedValue(mockCart);
  });

  it('should return 400 when paymentIntentId is missing', async () => {
    const req = {
      body: {
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
      },
      user: null,
      sessionId: 'session_123',
    };
    const res = createMockResponse();

    await checkoutController.confirmOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'paymentIntentId is required',
    });
  });

  it('should return 400 when email is missing', async () => {
    mockStripeRetrieve.mockResolvedValueOnce({
      status: 'succeeded',
    });

    const req = {
      body: {
        paymentIntentId: 'pi_test_123',
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
      },
      user: null,
      sessionId: 'session_123',
    };
    const res = createMockResponse();

    await checkoutController.confirmOrder(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Email is required',
    });
  });

  it('should return 400 when payment not completed', async () => {
    // Mock Stripe retrieve to return payment intent with non-succeeded status
    mockStripeRetrieve.mockResolvedValueOnce({
      id: 'pi_test_123',
      status: 'requires_payment_method',
    });

    const req = {
      body: {
        paymentIntentId: 'pi_test_123',
        email: 'test@example.com',
        shippingAddress: {
          country: 'CA',
          province: 'ON',
        },
      },
      user: null,
      sessionId: 'session_123',
    };
    const res = createMockResponse();

    await checkoutController.confirmOrder(req, res);

    expect(mockStripeRetrieve).toHaveBeenCalledWith('pi_test_123');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Payment not completed',
        status: 'requires_payment_method',
      })
    );
    // Ensure cart operations were not called when payment fails
    expect(prisma.cart.findUnique).not.toHaveBeenCalled();
  });
});

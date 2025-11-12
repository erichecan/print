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
    expect(res.json).toHaveBeenCalledWith({ error: 'Shipping address is required' });
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
      expect.objectContaining({ amount: expect.any(Number), currency: 'cad' })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        clientSecret: 'cs_test_123',
        paymentIntentId: 'pi_test_123',
        breakdown: expect.objectContaining({ total: expect.any(Number) }),
      })
    );
  });
});
